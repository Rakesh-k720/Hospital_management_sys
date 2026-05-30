const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const computeStats = (rows) => ({
    total_items: rows.length,
    low_stock: rows.filter((r) => Number(r.quantity) <= Number(r.reorder_level)).length,
    out_of_stock: rows.filter((r) => Number(r.quantity) === 0).length,
    total_value: rows.reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0)
});

exports.list = async (req, res) => {
    try {
        const { category, low_stock } = req.query;
        let sql = 'SELECT * FROM inventory_items WHERE 1=1';
        const params = [];

        if (category && category !== 'all') {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (low_stock === '1') {
            sql += ' AND quantity <= reorder_level';
        }
        sql += ' ORDER BY item_name';

        const [rows] = await db.execute(sql, params);

        sendResponse(res, 200, 'Inventory fetched', {
            items: rows,
            stats: computeStats(rows)
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
        if (!rows[0]) return sendResponse(res, 404, 'Item not found');
        sendResponse(res, 200, 'Item fetched', rows[0]);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.create = async (req, res) => {
    try {
        const { item_name, category, quantity, reorder_level, unit_price } = req.body;
        if (!item_name?.trim()) return sendResponse(res, 400, 'Item name is required');

        const [r] = await db.execute(
            'INSERT INTO inventory_items (item_name, category, quantity, reorder_level, unit_price) VALUES (?, ?, ?, ?, ?)',
            [
                item_name.trim(),
                category || 'pharmacy',
                Number(quantity) || 0,
                Number(reorder_level) ?? 10,
                Number(unit_price) || 0
            ]
        );
        sendResponse(res, 201, 'Item created', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, category, quantity, reorder_level, unit_price } = req.body;
        if (!item_name?.trim()) return sendResponse(res, 400, 'Item name is required');

        await db.execute(
            'UPDATE inventory_items SET item_name=?, category=?, quantity=?, reorder_level=?, unit_price=? WHERE id=?',
            [
                item_name.trim(),
                category || 'pharmacy',
                Number(quantity) || 0,
                Number(reorder_level) ?? 10,
                Number(unit_price) || 0,
                id
            ]
        );
        sendResponse(res, 200, 'Item updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { delta } = req.body;
        const change = Number(delta);
        if (!change || Number.isNaN(change)) {
            return sendResponse(res, 400, 'Valid delta is required');
        }

        const [rows] = await db.execute('SELECT quantity FROM inventory_items WHERE id = ?', [id]);
        if (!rows[0]) return sendResponse(res, 404, 'Item not found');

        const newQty = Math.max(0, Number(rows[0].quantity) + change);
        await db.execute('UPDATE inventory_items SET quantity = ? WHERE id = ?', [newQty, id]);

        sendResponse(res, 200, 'Stock adjusted', { quantity: newQty });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.remove = async (req, res) => {
    try {
        await db.execute('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
        sendResponse(res, 200, 'Item deleted');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
