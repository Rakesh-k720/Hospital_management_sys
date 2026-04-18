const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Register a new admission (IPD)
exports.admitPatient = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { patient_id, doctor_id, bed_id, diagnosis } = req.body;

        // 1. Check if bed is available
        const [bed] = await connection.execute('SELECT status FROM beds WHERE id = ?', [bed_id]);
        if (!bed[0] || bed[0].status !== 'available') {
            return sendResponse(res, 400, 'Bed is not available');
        }

        // 2. Create admission record
        await connection.execute(
            'INSERT INTO admissions (patient_id, doctor_id, bed_id, admission_date, status, diagnosis) VALUES (?, ?, ?, NOW(), "admitted", ?)',
            [patient_id, doctor_id, bed_id, diagnosis]
        );

        // 3. Update bed status
        await connection.execute('UPDATE beds SET status = "occupied" WHERE id = ?', [bed_id]);

        await connection.commit();
        sendResponse(res, 201, 'Patient admitted successfully');
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

// Discharge a patient
exports.dischargePatient = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { admission_id, discharge_summary } = req.body;

        // 1. Get admission details
        const [admission] = await connection.execute('SELECT bed_id, patient_id FROM admissions WHERE id = ?', [admission_id]);
        if (!admission[0]) return sendResponse(res, 404, 'Admission record not found');

        // 2. Update admission record
        await connection.execute(
            'UPDATE admissions SET discharge_date = NOW(), status = "discharged" WHERE id = ?',
            [admission_id]
        );

        // 3. Set bed to cleaning
        await connection.execute('UPDATE beds SET status = "cleaning" WHERE id = ?', [admission[0].bed_id]);

        // 4. Optionally create a bill (logic can be expanded)
        
        await connection.commit();
        sendResponse(res, 200, 'Patient discharged successfully');
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

// Get all current admissions
exports.getCurrentAdmissions = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT a.*, u.name as patient_name, doc_u.name as doctor_name, b.bed_number, b.ward_name
            FROM admissions a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users doc_u ON d.user_id = doc_u.id
            JOIN beds b ON a.bed_id = b.id
            WHERE a.status = 'admitted'
        `);
        sendResponse(res, 200, 'Current admissions fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get all beds
exports.getAllBeds = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM beds');
        sendResponse(res, 200, 'Beds fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
