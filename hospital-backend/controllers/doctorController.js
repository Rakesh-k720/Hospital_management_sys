const Doctor = require('../models/doctorModel');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

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

// Get Doctor's Appointments
exports.getAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [doctorId]);

        const [rows] = await db.execute(`
      SELECT a.*, p.blood_group, u.name as patient_name, u.phone as patient_phone 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.doctor_id = ? AND a.appointment_date = CURDATE()
      ORDER BY a.appointment_time ASC
    `, [doc[0].id]);

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

        await connection.commit();
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
