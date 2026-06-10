const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');

// ==================== MEDICINES ====================

exports.getMedicines = async (req, res) => {
    try {
        const { search, category, low_stock } = req.query;
        let sql = 'SELECT * FROM medicines WHERE 1=1';
        const params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR generic_name LIKE ? OR manufacturer LIKE ?)';
            const q = `%${search}%`;
            params.push(q, q, q);
        }
        if (category && category !== 'all') {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (low_stock === '1') {
            sql += ' AND stock_quantity <= reorder_level';
        }
        sql += ' ORDER BY name';

        const [rows] = await db.execute(sql, params);

        const stats = {
            total: rows.length,
            low_stock: rows.filter(r => Number(r.stock_quantity) <= Number(r.reorder_level)).length,
            out_of_stock: rows.filter(r => Number(r.stock_quantity) === 0).length,
            expired: rows.filter(r => r.expiry_date && new Date(r.expiry_date) < new Date()).length,
            total_value: rows.reduce((s, r) => s + Number(r.stock_quantity) * Number(r.unit_price), 0)
        };

        sendResponse(res, 200, 'Medicines fetched', { medicines: rows, stats });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getMedicineById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM medicines WHERE id = ?', [req.params.id]);
        if (!rows[0]) return sendResponse(res, 404, 'Medicine not found');
        sendResponse(res, 200, 'Medicine fetched', rows[0]);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createMedicine = async (req, res) => {
    try {
        const { name, generic_name, manufacturer, category, unit_price, stock_quantity, reorder_level, expiry_date, batch_number } = req.body;
        if (!name?.trim()) return sendResponse(res, 400, 'Medicine name is required');

        const [r] = await db.execute(
            `INSERT INTO medicines (name, generic_name, manufacturer, category, unit_price, stock_quantity, reorder_level, expiry_date, batch_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), generic_name || null, manufacturer || null, category || 'general',
             Number(unit_price) || 0, Number(stock_quantity) || 0, Number(reorder_level) ?? 10,
             expiry_date || null, batch_number || null]
        );
        await auditLogger.log(req.user.id, 'medicine_create', 'medicine', r.insertId, { name }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Medicine created', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateMedicine = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, generic_name, manufacturer, category, unit_price, stock_quantity, reorder_level, expiry_date, batch_number } = req.body;
        if (!name?.trim()) return sendResponse(res, 400, 'Medicine name is required');

        await db.execute(
            `UPDATE medicines SET name=?, generic_name=?, manufacturer=?, category=?, unit_price=?, 
             stock_quantity=?, reorder_level=?, expiry_date=?, batch_number=? WHERE id=?`,
            [name.trim(), generic_name || null, manufacturer || null, category || 'general',
             Number(unit_price) || 0, Number(stock_quantity) || 0, Number(reorder_level) ?? 10,
             expiry_date || null, batch_number || null, id]
        );
        await auditLogger.log(req.user.id, 'medicine_update', 'medicine', id, { name }, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Medicine updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.deleteMedicine = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT name FROM medicines WHERE id = ?', [id]);
        await db.execute('DELETE FROM medicines WHERE id = ?', [id]);
        await auditLogger.log(req.user.id, 'medicine_delete', 'medicine', id, rows[0] || {}, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Medicine deleted');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// ==================== PHARMACY ORDERS ====================

exports.dispensePrescription = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { prescription_id, items, notes } = req.body;
        if (!prescription_id || !items?.length) {
            return sendResponse(res, 400, 'Prescription ID and items are required');
        }

        // Get prescription medicines
        const [medicines] = await connection.execute(
            'SELECT pm.*, p.patient_id FROM prescription_medicines pm JOIN prescriptions p ON p.id = pm.prescription_id WHERE pm.prescription_id = ?',
            [prescription_id]
        );
        if (!medicines.length) return sendResponse(res, 404, 'Prescription not found or has no medicines');

        const patientId = medicines[0].patient_id;

        await connection.beginTransaction();

        // Create order
        const [orderResult] = await connection.execute(
            `INSERT INTO pharmacy_orders (prescription_id, patient_id, dispensed_by, order_type, notes) 
             VALUES (?, ?, ?, 'prescription', ?)`,
            [prescription_id, patientId, req.user.id, notes || null]
        );
        const orderId = orderResult.insertId;

        let totalAmount = 0;
        for (const item of items) {
            const [medRows] = await connection.execute('SELECT * FROM medicines WHERE id = ?', [item.medicine_id]);
            if (!medRows[0]) continue;
            const med = medRows[0];
            const subtotal = Number(item.quantity) * Number(med.unit_price);
            totalAmount += subtotal;

            await connection.execute(
                'INSERT INTO pharmacy_order_items (order_id, medicine_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.medicine_id, item.quantity, med.unit_price, subtotal]
            );

            // Deduct stock
            const newStock = Math.max(0, Number(med.stock_quantity) - Number(item.quantity));
            await connection.execute('UPDATE medicines SET stock_quantity = ? WHERE id = ?', [newStock, item.medicine_id]);
        }

        await connection.execute('UPDATE pharmacy_orders SET total_amount = ? WHERE id = ?', [totalAmount, orderId]);
        await connection.execute("UPDATE pharmacy_orders SET status = 'dispensed' WHERE id = ?", [orderId]);

        await connection.commit();
        await auditLogger.log(req.user.id, 'prescription_dispensed', 'pharmacy_order', orderId, { prescription_id }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Prescription dispensed', { orderId, totalAmount });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.createWalkInOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { patient_id, items, notes } = req.body;
        if (!patient_id || !items?.length) {
            return sendResponse(res, 400, 'Patient ID and items are required');
        }

        await connection.beginTransaction();

        const [orderResult] = await connection.execute(
            `INSERT INTO pharmacy_orders (patient_id, dispensed_by, order_type, notes) VALUES (?, ?, 'walk_in', ?)`,
            [patient_id, req.user.id, notes || null]
        );
        const orderId = orderResult.insertId;

        let totalAmount = 0;
        for (const item of items) {
            const [medRows] = await connection.execute('SELECT * FROM medicines WHERE id = ?', [item.medicine_id]);
            if (!medRows[0]) continue;
            const med = medRows[0];
            const subtotal = Number(item.quantity) * Number(med.unit_price);
            totalAmount += subtotal;

            await connection.execute(
                'INSERT INTO pharmacy_order_items (order_id, medicine_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.medicine_id, item.quantity, med.unit_price, subtotal]
            );

            const newStock = Math.max(0, Number(med.stock_quantity) - Number(item.quantity));
            await connection.execute('UPDATE medicines SET stock_quantity = ? WHERE id = ?', [newStock, item.medicine_id]);
        }

        await connection.execute('UPDATE pharmacy_orders SET total_amount = ?, status = ? WHERE id = ?', [totalAmount, 'dispensed', orderId]);

        await connection.commit();
        await auditLogger.log(req.user.id, 'walkin_sale', 'pharmacy_order', orderId, { patient_id }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Walk-in order created', { orderId, totalAmount });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { status, order_type, from, to } = req.query;
        let sql = `
            SELECT po.*, u.name as patient_name, u.email as patient_email,
                   disp_u.name as dispensed_by_name
            FROM pharmacy_orders po
            JOIN patients p ON po.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN users disp_u ON po.dispensed_by = disp_u.id
            WHERE 1=1`;
        const params = [];

        if (status && status !== 'all') {
            sql += ' AND po.status = ?';
            params.push(status);
        }
        if (order_type) {
            sql += ' AND po.order_type = ?';
            params.push(order_type);
        }
        if (from) {
            sql += ' AND DATE(po.created_at) >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND DATE(po.created_at) <= ?';
            params.push(to);
        }
        sql += ' ORDER BY po.created_at DESC LIMIT 100';

        const [rows] = await db.execute(sql, params);
        sendResponse(res, 200, 'Orders fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [orders] = await db.execute(
            `SELECT po.*, u.name as patient_name, disp_u.name as dispensed_by_name
             FROM pharmacy_orders po
             JOIN patients p ON po.patient_id = p.id
             JOIN users u ON p.user_id = u.id
             JOIN users disp_u ON po.dispensed_by = disp_u.id
             WHERE po.id = ?`, [id]
        );
        if (!orders[0]) return sendResponse(res, 404, 'Order not found');

        const [items] = await db.execute(
            `SELECT poi.*, m.name as medicine_name, m.generic_name
             FROM pharmacy_order_items poi
             JOIN medicines m ON poi.medicine_id = m.id
             WHERE poi.order_id = ?`, [id]
        );

        sendResponse(res, 200, 'Order detail fetched', { order: orders[0], items });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'dispensed', 'cancelled'].includes(status)) {
            return sendResponse(res, 400, 'Invalid status');
        }
        await db.execute('UPDATE pharmacy_orders SET status = ? WHERE id = ?', [status, id]);
        await auditLogger.log(req.user.id, 'pharmacy_order_status', 'pharmacy_order', id, { status }, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Order status updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getPharmacyStats = async (req, res) => {
    try {
        const [summary] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM medicines) as total_medicines,
                (SELECT COUNT(*) FROM medicines WHERE stock_quantity <= reorder_level) as low_stock,
                (SELECT COUNT(*) FROM medicines WHERE stock_quantity = 0) as out_of_stock,
                (SELECT COUNT(*) FROM medicines WHERE expiry_date IS NOT NULL AND expiry_date < CURDATE()) as expired,
                (SELECT COUNT(*) FROM pharmacy_orders WHERE DATE(created_at) = CURDATE()) as today_orders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM pharmacy_orders WHERE DATE(created_at) = CURDATE() AND status = 'dispensed') as today_revenue,
                (SELECT COALESCE(SUM(total_amount), 0) FROM pharmacy_orders WHERE status = 'dispensed') as total_revenue
        `);

        const [categoryBreakdown] = await db.execute(
            'SELECT category, COUNT(*) as count, SUM(stock_quantity) as total_stock FROM medicines GROUP BY category'
        );

        const [recentOrders] = await db.execute(`
            SELECT po.id, po.status, po.total_amount, po.order_type, po.created_at, u.name as patient_name
            FROM pharmacy_orders po
            JOIN patients p ON po.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            ORDER BY po.created_at DESC LIMIT 10
        `);

        sendResponse(res, 200, 'Pharmacy stats fetched', {
            summary: summary[0],
            categoryBreakdown,
            recentOrders
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
