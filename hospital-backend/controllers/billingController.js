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
      WHERE lr.patient_id = ? AND lr.status = "completed" AND lr.created_at >= CURDATE()
    `, [patient_id]);

        let labTotal = labs.reduce((sum, item) => sum + parseFloat(item.price), 0);

        const totalAmount = consultationFee + labTotal;

        // 3. Create Bill
        const [billResult] = await connection.execute(
            'INSERT INTO bills (patient_id, total_amount, payment_status) VALUES (?, ?, "unpaid")',
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
            'UPDATE bills SET payment_status = "paid", payment_method = ? WHERE id = ?',
            [payment_method, bill_id]
        );
        sendResponse(res, 200, 'Payment updated successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get All Bills (Admin)
exports.getAllBills = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT b.*, u.name as patient_name 
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            ORDER BY b.bill_date DESC
        `);
        sendResponse(res, 200, 'All bills fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
