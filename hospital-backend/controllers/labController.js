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
        if (!req.file) return sendResponse(res, 400, 'No file uploaded');

        const storageService = require('../services/storageService');
        const uploaded = await storageService.uploadFile(req.file, req.file.originalname);
        const reportFile = uploaded.url || uploaded.filename;

        await db.execute(
            'UPDATE lab_reports SET report_file = ?, result_notes = ?, status = "completed", report_date = NOW() WHERE id = ?',
            [reportFile, result_notes, report_id]
        );

        const [info] = await db.execute(
            `SELECT u.id as user_id, u.phone, u.name as patient_name, lt.test_name
       FROM lab_reports lr
       JOIN patients p ON lr.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       JOIN lab_tests lt ON lr.test_id = lt.id
       WHERE lr.id = ?`,
            [report_id]
        );
        if (info[0]?.phone) {
            const { sendLabReportReadyAlert } = require('../services/notificationService');
            sendLabReportReadyAlert({
                userId: info[0].user_id,
                phone: info[0].phone,
                patientName: info[0].patient_name,
                testName: info[0].test_name
            }).catch((err) => console.error('Lab notification error:', err.message));
        }

        sendResponse(res, 200, 'Report uploaded successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

const reportListQuery = `
      SELECT lr.*, u.name as patient_name, u.phone as patient_phone,
             doc_u.name as doctor_name, lt.test_name, lt.price, lt.description as test_description
      FROM lab_reports lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN doctors d ON lr.doctor_id = d.id
      JOIN users doc_u ON d.user_id = doc_u.id
      JOIN lab_tests lt ON lr.test_id = lt.id
`;

// Get Pending Lab Requests (for Lab Staff/Admin)
exports.getPendingRequests = async (req, res) => {
    try {
        const [rows] = await db.execute(`${reportListQuery} WHERE lr.status = "pending" ORDER BY lr.created_at ASC`);
        sendResponse(res, 200, 'Pending requests fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getAdminReports = async (req, res) => {
    try {
        const { status, from, to, doctor_id, patient_id } = req.query;
        let sql = `${reportListQuery} WHERE 1=1`;
        const params = [];

        if (status && status !== 'all') {
            sql += ' AND lr.status = ?';
            params.push(status);
        }
        if (from) {
            sql += ' AND DATE(lr.created_at) >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND DATE(lr.created_at) <= ?';
            params.push(to);
        }
        if (doctor_id) {
            sql += ' AND lr.doctor_id = ?';
            params.push(doctor_id);
        }
        if (patient_id) {
            sql += ' AND lr.patient_id = ?';
            params.push(patient_id);
        }
        sql += ' ORDER BY lr.created_at DESC LIMIT 300';

        const [rows] = await db.execute(sql, params);

        let statsSql = `
            SELECT
              COUNT(*) as total,
              SUM(status = 'pending') as pending,
              SUM(status = 'completed') as completed,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN lt.price ELSE 0 END), 0) as pending_value
            FROM lab_reports lr
            JOIN lab_tests lt ON lr.test_id = lt.id
            WHERE 1=1`;
        const statsParams = [];
        if (from) {
            statsSql += ' AND DATE(lr.created_at) >= ?';
            statsParams.push(from);
        }
        if (to) {
            statsSql += ' AND DATE(lr.created_at) <= ?';
            statsParams.push(to);
        }
        const [statsRows] = await db.execute(statsSql, statsParams);

        sendResponse(res, 200, 'Lab reports fetched', {
            reports: rows,
            stats: statsRows[0] || {}
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createLabRequestAdmin = async (req, res) => {
    try {
        const { patient_id, doctor_id, test_id } = req.body;
        if (!patient_id || !doctor_id || !test_id) {
            return sendResponse(res, 400, 'patient_id, doctor_id and test_id are required');
        }

        const [dup] = await db.execute(
            `SELECT id FROM lab_reports
       WHERE patient_id = ? AND test_id = ? AND status = 'pending'`,
            [patient_id, test_id]
        );
        if (dup[0]) {
            return sendResponse(res, 409, 'A pending request for this test already exists for this patient');
        }

        const [result] = await db.execute(
            'INSERT INTO lab_reports (patient_id, doctor_id, test_id, status) VALUES (?, ?, ?, "pending")',
            [patient_id, doctor_id, test_id]
        );

        sendResponse(res, 201, 'Lab test requested', { reportId: result.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createLabTest = async (req, res) => {
    try {
        const { test_name, description, price } = req.body;
        if (!test_name || price === undefined) {
            return sendResponse(res, 400, 'test_name and price are required');
        }
        const [result] = await db.execute(
            'INSERT INTO lab_tests (test_name, description, price) VALUES (?, ?, ?)',
            [test_name, description || null, Number(price)]
        );
        sendResponse(res, 201, 'Lab test added to catalog', { id: result.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateLabTest = async (req, res) => {
    try {
        const { id } = req.params;
        const { test_name, description, price } = req.body;
        const [existing] = await db.execute('SELECT id FROM lab_tests WHERE id = ?', [id]);
        if (!existing[0]) return sendResponse(res, 404, 'Test not found');

        await db.execute(
            'UPDATE lab_tests SET test_name = ?, description = ?, price = ? WHERE id = ?',
            [test_name, description || null, Number(price), id]
        );
        sendResponse(res, 200, 'Lab test updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.cancelLabReport = async (req, res) => {
    try {
        const { id } = req.params;
        const [row] = await db.execute('SELECT status FROM lab_reports WHERE id = ?', [id]);
        if (!row[0]) return sendResponse(res, 404, 'Report not found');
        if (row[0].status !== 'pending') {
            return sendResponse(res, 400, 'Only pending requests can be cancelled');
        }
        await db.execute('DELETE FROM lab_reports WHERE id = ?', [id]);
        sendResponse(res, 200, 'Lab request cancelled');
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
