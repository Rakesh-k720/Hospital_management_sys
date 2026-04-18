const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Get Patient Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);
        if (!patient[0]) return sendResponse(res, 404, 'Patient profile not found');
        const patientId = patient[0].id;

        const [upcoming] = await db.execute(
            'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ? AND appointment_date >= CURDATE() AND status != "cancelled"',
            [patientId]
        );
        const [totalVisits] = await db.execute(
            'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ? AND status = "completed"',
            [patientId]
        );
        const [pendingBills] = await db.execute(
            'SELECT COUNT(*) as count FROM bills WHERE patient_id = ? AND payment_status != "paid"',
            [patientId]
        );

        sendResponse(res, 200, 'Patient stats fetched', {
            upcomingAppointments: upcoming[0].count,
            totalVisits: totalVisits[0].count,
            pendingBills: pendingBills[0].count
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Book Appointment (ONLINE PARCHI Logic)
exports.bookAppointment = async (req, res) => {
    try {
        const { doctor_id, department_id, appointment_date, appointment_time, priority } = req.body;
        const userId = req.user.id;
        const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);
        const patientId = patient[0].id;

        // 1. Generate Token Number (e.g., T-101, T-102...)
        const [todayTokens] = await db.execute(
            'SELECT COUNT(*) as count FROM opd_tokens WHERE visit_date = ? AND department_id = ?',
            [appointment_date, department_id]
        );
        const tokenSeq = todayTokens[0].count + 1;
        const tokenNumber = `T-${100 + tokenSeq}`;

        // 2. Calculate Queue Position
        const [waiting] = await db.execute(
            'SELECT COUNT(*) as count FROM opd_tokens WHERE visit_date = ? AND department_id = ? AND status = "waiting"',
            [appointment_date, department_id]
        );
        const queuePosition = waiting[0].count + 1;

        // 3. Create Appointment & Token
        await db.execute(
            'INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?, "pending")',
            [patientId, doctor_id, department_id, appointment_date, appointment_time]
        );

        await db.execute(
            'INSERT INTO opd_tokens (token_number, patient_id, doctor_id, department_id, visit_date, priority, status) VALUES (?, ?, ?, ?, ?, ?, "waiting")',
            [tokenNumber, patientId, doctor_id, department_id, appointment_date, priority || 'normal']
        );

        sendResponse(res, 201, 'Appointment booked successfully', {
            tokenNumber,
            queuePosition,
            appointmentDate: appointment_date
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get My Appointments
exports.getMyAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);

        const [rows] = await db.execute(`
      SELECT a.*, d.specialization, u.name as doctor_name 
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, [patient[0].id]);

        sendResponse(res, 200, 'Appointments fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get My Bills
exports.getMyBills = async (req, res) => {
    try {
        const userId = req.user.id;
        const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);

        const [rows] = await db.execute('SELECT * FROM bills WHERE patient_id = ? ORDER BY bill_date DESC', [patient[0].id]);
        sendResponse(res, 200, 'Bills fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get My Prescriptions
exports.getMyPrescriptions = async (req, res) => {
    try {
        const userId = req.user.id;
        const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);

        const [rows] = await db.execute(`
            SELECT p.*, u.name as doctor_name, d.specialization
            FROM prescriptions p
            JOIN doctors d ON p.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        `, [patient[0].id]);

        // For each prescription, fetch medicines
        for (let presc of rows) {
            const [medicines] = await db.execute('SELECT * FROM prescription_medicines WHERE prescription_id = ?', [presc.id]);
            presc.medicines = medicines;
        }

        sendResponse(res, 200, 'Prescriptions fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
