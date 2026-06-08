const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Generate Bill for Patient
exports.generateBill = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { patient_id, appointment_id } = req.body;

        // 1. Get Doctor's Consultation Fee
        const [appt] = await connection.execute(
            'SELECT doctor_id FROM appointments WHERE id = ?',
            [appointment_id]
        );
        const [doc] = await connection.execute(
            'SELECT consultation_fee FROM doctors WHERE id = ?',
            [appt[0].doctor_id]
        );
        const consultationFee = parseFloat(doc[0].consultation_fee);

        // 2. Get Lab Test Charges
        const [labs] = await connection.execute(`
      SELECT lt.price 
      FROM lab_reports lr
      JOIN lab_tests lt ON lr.test_id = lt.id
      WHERE lr.patient_id = ? AND lr.status = 'completed' AND lr.created_at >= CURDATE()
    `, [patient_id]);

        let labTotal = labs.reduce((sum, item) => sum + parseFloat(item.price), 0);

        const totalAmount = consultationFee + labTotal;

        // 3. Create Bill
        const [billResult] = await connection.execute(
            "INSERT INTO bills (patient_id, total_amount, payment_status) VALUES (?, ?, 'unpaid')",
            [patient_id, totalAmount]
        );
        const billId = billResult.insertId;

        // 4. Add Bill Items
        await connection.execute(
            'INSERT INTO bill_items (bill_id, item_name, cost) VALUES (?, "Consultation Fee", ?)',
            [billId, consultationFee]
        );

        if (labTotal > 0) {
            await connection.execute(
                'INSERT INTO bill_items (bill_id, item_name, cost) VALUES (?, "Laboratory Services", ?)',
                [billId, labTotal]
            );
        }

        await connection.commit();
        sendResponse(res, 201, 'Bill generated successfully', { billId, totalAmount });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

// Update Payment Status
exports.updatePayment = async (req, res) => {
    try {
        const { bill_id, payment_method } = req.body;
        await db.execute(
            "UPDATE bills SET payment_status = 'paid', payment_method = ? WHERE id = ?",
            [payment_method, bill_id]
        );
        sendResponse(res, 200, 'Payment updated successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.generateManualBill = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { patient_id, items, description } = req.body;
        if (!patient_id || !items?.length) {
            return sendResponse(res, 400, 'Patient and items are required');
        }

        const totalAmount = items.reduce((sum, i) => sum + Number(i.cost) * (i.quantity || 1), 0);

        const [billResult] = await connection.execute(
            "INSERT INTO bills (patient_id, total_amount, payment_status) VALUES (?, ?, 'unpaid')",
            [patient_id, totalAmount]
        );
        const billId = billResult.insertId;

        for (const item of items) {
            await connection.execute(
                'INSERT INTO bill_items (bill_id, item_name, cost, quantity) VALUES (?, ?, ?, ?)',
                [billId, item.item_name || description || 'Service', item.cost, item.quantity || 1]
            );
        }

        await connection.commit();
        sendResponse(res, 201, 'Bill generated', { billId, totalAmount });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.getBillItems = async (req, res) => {
    try {
        const { id } = req.params;
        const [items] = await db.execute('SELECT * FROM bill_items WHERE bill_id = ?', [id]);
        const [bill] = await db.execute(
            `SELECT b.*, u.name as patient_name, u.phone as patient_phone, u.email as patient_email
       FROM bills b
       JOIN patients p ON b.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE b.id = ?`,
            [id]
        );
        if (!bill[0]) return sendResponse(res, 404, 'Bill not found');
        sendResponse(res, 200, 'Bill details fetched', { bill: bill[0], items });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get All Bills (Admin)
exports.getAllBills = async (req, res) => {
    try {
        const { status, from, to, patient_id } = req.query;
        let sql = `
            SELECT b.*, u.name as patient_name, u.phone as patient_phone, u.email as patient_email
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (status && status !== 'all') {
            sql += ' AND b.payment_status = ?';
            params.push(status);
        }
        if (from) {
            sql += ' AND DATE(b.bill_date) >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND DATE(b.bill_date) <= ?';
            params.push(to);
        }
        if (patient_id) {
            sql += ' AND b.patient_id = ?';
            params.push(patient_id);
        }
        sql += ' ORDER BY b.bill_date DESC LIMIT 300';

        const [rows] = await db.execute(sql, params);

        let statsSql = `
            SELECT
              COUNT(*) as total,
              SUM(payment_status = 'paid') as paid_count,
              SUM(payment_status = 'unpaid') as unpaid_count,
              SUM(payment_status = 'partially_paid') as partial_count,
              COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue_paid,
              COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END), 0) as amount_pending
            FROM bills b WHERE 1=1`;
        const statsParams = [];
        if (from) {
            statsSql += ' AND DATE(b.bill_date) >= ?';
            statsParams.push(from);
        }
        if (to) {
            statsSql += ' AND DATE(b.bill_date) <= ?';
            statsParams.push(to);
        }
        const [statsRows] = await db.execute(statsSql, statsParams);

        sendResponse(res, 200, 'All bills fetched', {
            bills: rows,
            stats: statsRows[0] || {}
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
