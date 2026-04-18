const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Get All Lab Tests Catalog
exports.getTestsCatalog = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM lab_tests');
        sendResponse(res, 200, 'Lab tests catalog fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Upload Lab Report
exports.uploadReport = async (req, res) => {
    try {
        const { report_id, result_notes } = req.body;
        const reportFile = req.file ? req.file.filename : null;

        if (!reportFile) return sendResponse(res, 400, 'No file uploaded');

        await db.execute(
            'UPDATE lab_reports SET report_file = ?, result_notes = ?, status = "completed", report_date = NOW() WHERE id = ?',
            [reportFile, result_notes, report_id]
        );

        sendResponse(res, 200, 'Report uploaded successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get Pending Lab Requests (for Lab Staff/Admin)
exports.getPendingRequests = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT lr.*, u.name as patient_name, lt.test_name 
      FROM lab_reports lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN lab_tests lt ON lr.test_id = lt.id
      WHERE lr.status = "pending"
    `);
        sendResponse(res, 200, 'Pending requests fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get reports for a specific patient
exports.getPatientReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);
        if (!patient[0]) return sendResponse(res, 404, 'Patient not found');

        const [rows] = await db.execute(`
            SELECT lr.*, lt.test_name, lt.price, u.name as doctor_name
            FROM lab_reports lr
            JOIN lab_tests lt ON lr.test_id = lt.id
            JOIN doctors d ON lr.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE lr.patient_id = ?
            ORDER BY lr.created_at DESC
        `, [patient[0].id]);
        sendResponse(res, 200, 'Patient reports fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
