const Doctor = require('../models/doctorModel');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const notificationService = require('../services/notificationService');

// Get Doctor Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const doctorId = req.user.id; // Map user ID to doctor ID if needed, for simplicity using user_id as doctor_id for now if 1:1

        // Get actual doctor_id from doctors table first
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [doctorId]);
        if (!doc[0]) return sendResponse(res, 404, 'Doctor profile not found');

        const stats = await Doctor.getStats(doc[0].id);
        sendResponse(res, 200, 'Doctor stats fetched', stats);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get Doctor's Appointments (?date=YYYY-MM-DD or ?range=all)
exports.getAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { date, range } = req.query;
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [doctorId]);

        if (!doc[0]) {
            return sendResponse(res, 404, 'Doctor profile not found');
        }

        let dateClause = 'AND a.appointment_date = CURDATE()';
        const params = [doc[0].id];

        if (range === 'all') {
            dateClause = '';
        } else if (date) {
            dateClause = 'AND a.appointment_date = ?';
            params.push(date);
        }

        const [rows] = await db.execute(
            `
      SELECT 
        a.*, 
        p.blood_group, 
        p.age,
        p.gender,
        u.name as patient_name, 
        u.phone as patient_phone,
        dep.name as department_name,
        t.id as token_id,
        t.token_number,
        t.priority,
        t.status as token_status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN departments dep ON a.department_id = dep.id
      LEFT JOIN opd_tokens t ON a.patient_id = t.patient_id 
        AND a.doctor_id = t.doctor_id 
        AND a.appointment_date = t.visit_date
      WHERE a.doctor_id = ? ${dateClause}
      ORDER BY a.appointment_date DESC, a.appointment_time ASC
    `,
            params
        );

        sendResponse(res, 200, 'Appointments fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Create Prescription
exports.createPrescription = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { patient_id, notes, medicines } = req.body;
        const userId = req.user.id;
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [userId]);

        // 1. Insert into prescriptions
        const [prescResult] = await connection.execute(
            'INSERT INTO prescriptions (patient_id, doctor_id, notes) VALUES (?, ?, ?)',
            [patient_id, doc[0].id, notes]
        );
        const prescId = prescResult.insertId;

        // 2. Insert medicines
        if (medicines && medicines.length > 0) {
            for (let med of medicines) {
                await connection.execute(
                    'INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage, duration, instructions) VALUES (?, ?, ?, ?, ?)',
                    [prescId, med.name, med.dosage, med.duration, med.instructions]
                );
            }
        }

        await connection.execute(
            `UPDATE opd_tokens SET status = 'completed'
       WHERE patient_id = ? AND doctor_id = ? AND visit_date = CURDATE() AND status != 'completed'`,
            [patient_id, doc[0].id]
        );
        await connection.execute(
            `UPDATE appointments SET status = 'completed'
       WHERE patient_id = ? AND doctor_id = ? AND appointment_date = CURDATE() AND status != 'cancelled'`,
            [patient_id, doc[0].id]
        );

        // Get patient info for notification
        const [patientInfo] = await connection.execute(
            `SELECT u.id, u.name, u.phone, doc_u.name as doctor_name
             FROM patients p
             JOIN users u ON p.user_id = u.id
             JOIN doctors d ON d.id = ?
             JOIN users doc_u ON d.user_id = doc_u.id
             WHERE p.id = ?`,
            [doc[0].id, patient_id]
        );

        await connection.commit();

        // Send prescription ready notification (async)
        if (patientInfo[0]) {
            notificationService.sendPrescriptionReadyAlert({
                userId: patientInfo[0].id,
                phone: patientInfo[0].phone,
                patientName: patientInfo[0].name,
                doctorName: patientInfo[0].doctor_name
            }).catch(err => console.error('Prescription SMS error:', err.message));
        }

        sendResponse(res, 201, 'Prescription created successfully', { prescriptionId: prescId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

// Request Lab Test
exports.requestLabTest = async (req, res) => {
    try {
        const { patient_id, test_id } = req.body;
        const userId = req.user.id;
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [userId]);

        await db.execute(
            'INSERT INTO lab_reports (patient_id, doctor_id, test_id, status) VALUES (?, ?, ?, "pending")',
            [patient_id, doc[0].id, test_id]
        );

        sendResponse(res, 201, 'Lab test requested successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getMyPatients = async (req, res) => {
    try {
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doc[0]) return sendResponse(res, 404, 'Doctor profile not found');

        const [rows] = await db.execute(
            `SELECT
        p.id as patient_id,
        u.name,
        u.phone,
        u.email,
        p.age,
        p.gender,
        p.blood_group,
        p.address,
        p.emergency_contact,
        p.allergies,
        p.medical_notes,
        MAX(a.appointment_date) as last_visit,
        COUNT(DISTINCT a.id) as visit_count,
        (SELECT COUNT(*) FROM prescriptions pr WHERE pr.patient_id = p.id AND pr.doctor_id = ?) as prescription_count,
        (SELECT COUNT(*) FROM lab_reports lr WHERE lr.patient_id = p.id AND lr.doctor_id = ? AND lr.status = 'pending') as pending_labs
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE a.doctor_id = ?
       GROUP BY p.id, u.name, u.phone, u.email, p.age, p.gender, p.blood_group,
                p.address, p.emergency_contact, p.allergies, p.medical_notes
       ORDER BY last_visit DESC`,
            [doc[0].id, doc[0].id, doc[0].id]
        );
        sendResponse(res, 200, 'Patients fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getDoctorAdmissions = async (req, res) => {
    try {
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doc[0]) return sendResponse(res, 404, 'Doctor profile not found');

        const [rows] = await db.execute(
            `SELECT a.*, u.name as patient_name, b.bed_number, b.ward_name
       FROM admissions a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       JOIN beds b ON a.bed_id = b.id
       WHERE a.doctor_id = ? AND a.status = 'admitted'`,
            [doc[0].id]
        );
        sendResponse(res, 200, 'IPD patients fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getDoctorLabRequests = async (req, res) => {
    try {
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doc[0]) return sendResponse(res, 404, 'Doctor profile not found');

        const [rows] = await db.execute(
            `SELECT lr.*, u.name as patient_name, lt.test_name, lt.price
       FROM lab_reports lr
       JOIN patients p ON lr.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       JOIN lab_tests lt ON lr.test_id = lt.id
       WHERE lr.doctor_id = ?
       ORDER BY lr.created_at DESC`,
            [doc[0].id]
        );
        sendResponse(res, 200, 'Lab requests fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
