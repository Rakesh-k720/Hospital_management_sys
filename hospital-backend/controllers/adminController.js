const bcrypt = require('bcryptjs');
const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');
const emailService = require('../services/emailService');

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await Admin.getStats();
        sendResponse(res, 200, 'Dashboard statistics fetched', stats);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get All Doctors
exports.getAllDoctors = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT d.*, u.name, u.email, u.phone 
      FROM doctors d 
      JOIN users u ON d.user_id = u.id
    `);
        sendResponse(res, 200, 'Doctors fetched successfully', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get All Patients
exports.getAllPatients = async (req, res) => {
    try {
        const { status, stats: includeStats } = req.query;
        let sql = `
      SELECT p.*, u.name, u.email, u.phone, u.status as user_status, u.created_at as user_created_at,
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) as appointment_count,
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'completed') as completed_visits,
        (SELECT COUNT(*) FROM bills b WHERE b.patient_id = p.id AND b.payment_status != 'paid') as unpaid_bills,
        (SELECT COUNT(*) FROM admissions ad WHERE ad.patient_id = p.id AND ad.status = 'admitted') as ipd_active
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (status && status !== 'all') {
            sql += ' AND u.status = ?';
            params.push(status);
        }
        sql += ' ORDER BY u.name';

        const [rows] = await db.execute(sql, params);

        if (includeStats === '1') {
            const [statsRows] = await db.execute(`
        SELECT
          COUNT(*) as total,
          SUM(u.status = 'active') as active,
          SUM(u.status = 'inactive') as inactive,
          (SELECT COUNT(*) FROM admissions WHERE status = 'admitted') as ipd_patients
      FROM patients p JOIN users u ON p.user_id = u.id
      `);
            return sendResponse(res, 200, 'Patients fetched successfully', {
                patients: rows,
                stats: statsRows[0] || {}
            });
        }

        sendResponse(res, 200, 'Patients fetched successfully', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(
            `SELECT p.*, u.name, u.email, u.phone, u.status as user_status, u.created_at as user_created_at
       FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
            [id]
        );
        if (!rows[0]) return sendResponse(res, 404, 'Patient not found');

        const [upcoming] = await db.execute(
            `SELECT COUNT(*) as count FROM appointments
       WHERE patient_id = ? AND appointment_date >= CURDATE() AND status != 'cancelled'`,
            [id]
        );
        const [visits] = await db.execute(
            `SELECT COUNT(*) as count FROM appointments WHERE patient_id = ? AND status = 'completed'`,
            [id]
        );
        const [pendingBills] = await db.execute(
            `SELECT COUNT(*) as count FROM bills WHERE patient_id = ? AND payment_status != 'paid'`,
            [id]
        );

        const [appointments] = await db.execute(
            `SELECT a.*, doc_u.name as doctor_name, dep.name as department_name
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users doc_u ON d.user_id = doc_u.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 15`,
            [id]
        );

        const [prescriptions] = await db.execute(
            `SELECT pr.*, doc_u.name as doctor_name
       FROM prescriptions pr
       JOIN doctors d ON pr.doctor_id = d.id
       JOIN users doc_u ON d.user_id = doc_u.id
       WHERE pr.patient_id = ?
       ORDER BY pr.created_at DESC LIMIT 10`,
            [id]
        );

        const [bills] = await db.execute(
            `SELECT * FROM bills WHERE patient_id = ? ORDER BY bill_date DESC LIMIT 10`,
            [id]
        );

        const [reports] = await db.execute(
            `SELECT lr.*, lt.test_name, doc_u.name as doctor_name
       FROM lab_reports lr
       JOIN lab_tests lt ON lr.test_id = lt.id
       JOIN doctors d ON lr.doctor_id = d.id
       JOIN users doc_u ON d.user_id = doc_u.id
       WHERE lr.patient_id = ?
       ORDER BY lr.created_at DESC LIMIT 10`,
            [id]
        );

        const [admissions] = await db.execute(
            `SELECT a.*, doc_u.name as doctor_name, b.ward_name, b.bed_number
       FROM admissions a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users doc_u ON d.user_id = doc_u.id
       JOIN beds b ON a.bed_id = b.id
       WHERE a.patient_id = ?
       ORDER BY a.admission_date DESC LIMIT 5`,
            [id]
        );

        sendResponse(res, 200, 'Patient detail fetched', {
            patient: rows[0],
            stats: {
                upcomingAppointments: upcoming[0].count,
                totalVisits: visits[0].count,
                pendingBills: pendingBills[0].count
            },
            appointments,
            prescriptions,
            bills,
            reports,
            admissions
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createPatient = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const {
            name,
            email,
            phone,
            password,
            age,
            gender,
            blood_group,
            address,
            emergency_contact,
            allergies,
            medical_notes
        } = req.body;

        if (!name || !email || !password) {
            return sendResponse(res, 400, 'Name, email and password are required');
        }

        const [exists] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (exists[0]) return sendResponse(res, 400, 'Email already registered');

        await connection.beginTransaction();

        const hashed = await bcrypt.hash(password, 10);

        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, "patient")',
            [name, email, phone || null, hashed]
        );

        const [patientResult] = await connection.execute(
            `INSERT INTO patients (user_id, age, gender, blood_group, address, emergency_contact, allergies, medical_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userResult.insertId,
                age || 18,
                gender || 'other',
                blood_group || null,
                address || null,
                emergency_contact || null,
                allergies || null,
                medical_notes || null
            ]
        );

        await connection.commit();
        await auditLogger.log(req.user.id, 'patient_create', 'patient', patientResult.insertId, { name, email });
        sendResponse(res, 201, 'Patient created', { patientId: patientResult.insertId, userId: userResult.insertId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            phone,
            age,
            gender,
            blood_group,
            address,
            emergency_contact,
            allergies,
            medical_notes,
            user_status
        } = req.body;

        const [rows] = await db.execute('SELECT user_id FROM patients WHERE id = ?', [id]);
        if (!rows[0]) return sendResponse(res, 404, 'Patient not found');
        const userId = rows[0].user_id;

        if (name) await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
        if (phone !== undefined) await db.execute('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
        if (user_status) await db.execute('UPDATE users SET status = ? WHERE id = ?', [user_status, userId]);

        await db.execute(
            `UPDATE patients SET
        age = COALESCE(?, age),
        gender = COALESCE(?, gender),
        blood_group = COALESCE(?, blood_group),
        address = COALESCE(?, address),
        emergency_contact = COALESCE(?, emergency_contact),
        allergies = COALESCE(?, allergies),
        medical_notes = COALESCE(?, medical_notes)
       WHERE id = ?`,
            [age, gender, blood_group, address, emergency_contact, allergies, medical_notes, id]
        );

        await auditLogger.log(req.user.id, 'patient_update', 'patient', id, { name, user_status });
        sendResponse(res, 200, 'Patient updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Delete User (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const [userRow] = await db.execute('SELECT name, email, role FROM users WHERE id = ?', [id]);
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        await auditLogger.log(req.user.id, 'user_delete', 'user', id, userRow[0] || {});
        sendResponse(res, 200, 'User deleted successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Add New Doctor (Admin only)
exports.addDoctor = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { name, email, phone, password, department_id, specialization, experience_years, room_number, consultation_fee } = req.body;
        
        // Check if user exists
        const [userExists] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (userExists[0]) {
            return sendResponse(res, 400, 'User with this email already exists');
        }

        await connection.beginTransaction();

        // Hash password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, "doctor")',
            [name, email, phone, hashedPassword]
        );
        const userId = userResult.insertId;

        // Create doctor details
        await connection.execute(
            'INSERT INTO doctors (user_id, department_id, specialization, experience_years, room_number, consultation_fee) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, department_id || 1, specialization || 'General Physician', experience_years || 0, room_number || null, consultation_fee || 500]
        );

        await connection.commit();
        sendResponse(res, 201, 'Doctor added successfully', { doctorId: userId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const { date, status, doctor_id, department_id, range, from, to } = req.query;
        let sql = `
      SELECT a.*, u.name as patient_name, u.phone as patient_phone,
             doc_u.name as doctor_name, dep.name as department_name,
             t.id as token_id, t.token_number, t.status as token_status, t.priority as token_priority
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doc_u ON d.user_id = doc_u.id
      JOIN departments dep ON a.department_id = dep.id
      LEFT JOIN opd_tokens t ON t.patient_id = a.patient_id AND t.doctor_id = a.doctor_id AND t.visit_date = a.appointment_date
      WHERE 1=1
    `;
        const params = [];
        if (range === 'all') {
            // no date filter
        } else if (range === 'upcoming') {
            sql += ' AND a.appointment_date >= CURDATE()';
        } else if (from && to) {
            sql += ' AND a.appointment_date BETWEEN ? AND ?';
            params.push(from, to);
        } else if (date) {
            sql += ' AND a.appointment_date = ?';
            params.push(date);
        } else {
            sql += ' AND a.appointment_date >= CURDATE() - INTERVAL 7 DAY';
        }
        if (status) {
            sql += ' AND a.status = ?';
            params.push(status);
        }
        if (doctor_id) {
            sql += ' AND a.doctor_id = ?';
            params.push(doctor_id);
        }
        if (department_id) {
            sql += ' AND a.department_id = ?';
            params.push(department_id);
        }
        sql += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 200';

        const [rows] = await db.execute(sql, params);

        let statsSql = `
      SELECT
        COUNT(*) as total,
        SUM(status = 'pending') as pending,
        SUM(status = 'confirmed') as confirmed,
        SUM(status = 'completed') as completed,
        SUM(status = 'cancelled') as cancelled
      FROM appointments a WHERE 1=1`;
        const statsParams = [];
        if (range === 'upcoming') {
            statsSql += ' AND a.appointment_date >= CURDATE()';
        } else if (date) {
            statsSql += ' AND a.appointment_date = ?';
            statsParams.push(date);
        } else if (range !== 'all') {
            statsSql += ' AND a.appointment_date >= CURDATE() - INTERVAL 7 DAY';
        }
        if (doctor_id) {
            statsSql += ' AND a.doctor_id = ?';
            statsParams.push(doctor_id);
        }
        if (department_id) {
            statsSql += ' AND a.department_id = ?';
            statsParams.push(department_id);
        }
        const [statsRows] = await db.execute(statsSql, statsParams);

        sendResponse(res, 200, 'Appointments fetched', {
            appointments: rows,
            stats: statsRows[0] || {}
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createAppointment = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const {
            patient_id,
            doctor_id,
            department_id,
            appointment_date,
            appointment_time,
            priority,
            remarks
        } = req.body;

        if (!patient_id || !doctor_id || !department_id || !appointment_date || !appointment_time) {
            return sendResponse(res, 400, 'Missing required fields');
        }

        const [patient] = await connection.execute('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient[0]) return sendResponse(res, 404, 'Patient not found');

        await connection.beginTransaction();

        const [dup] = await connection.execute(
            `SELECT id FROM appointments
       WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ?
       AND status NOT IN ('cancelled', 'completed')`,
            [patient_id, doctor_id, appointment_date]
        );
        if (dup[0]) {
            await connection.rollback();
            return sendResponse(res, 409, 'Patient already has an active appointment with this doctor on this date');
        }

        const [todayTokens] = await connection.execute(
            'SELECT COUNT(*) as count FROM opd_tokens WHERE visit_date = ? AND department_id = ?',
            [appointment_date, department_id]
        );
        const tokenNumber = `T-${100 + todayTokens[0].count + 1}`;

        const [apptResult] = await connection.execute(
            `INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, remarks)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
            [patient_id, doctor_id, department_id, appointment_date, appointment_time, remarks || null]
        );

        await connection.execute(
            'INSERT INTO opd_tokens (token_number, patient_id, doctor_id, department_id, visit_date, priority, status) VALUES (?, ?, ?, ?, ?, ?, "waiting")',
            [tokenNumber, patient_id, doctor_id, department_id, appointment_date, priority || 'normal']
        );

        await connection.commit();

        const [userRow] = await db.execute(
            `SELECT u.id, u.name, u.phone, doc_u.name as doctor_name
       FROM patients p
       JOIN users u ON p.user_id = u.id
       JOIN doctors d ON d.id = ?
       JOIN users doc_u ON d.user_id = doc_u.id
       WHERE p.id = ?`,
            [doctor_id, patient_id]
        );

        if (userRow[0]?.id) {
            const { createNotification } = require('../utils/notifyUser');
            createNotification(
                userRow[0].id,
                'Appointment Booked',
                `Token ${tokenNumber} on ${appointment_date}`,
                '/patient/token'
            ).catch(() => {});

            // Send appointment confirmation email (async)
            const [userEmail] = await connection.execute('SELECT email FROM users WHERE id = ?', [userRow[0].id]);
            if (userEmail[0]?.email) {
                emailService.sendTemplatedEmail({
                    to: userEmail[0].email,
                    subject: 'Appointment Confirmed',
                    template: 'appointment',
                    data: {
                        patientName: userRow[0].name,
                        doctorName: userRow[0].doctor_name,
                        date: appointment_date,
                        time: appointment_time
                    }
                }).catch(err => console.error('Appointment email error:', err.message));
            }

            // Send appointment confirmation SMS (async)
            const notificationService = require('../services/notificationService');
            notificationService.sendAppointmentConfirmAlert({
                userId: userRow[0].id,
                phone: userRow[0].phone,
                patientName: userRow[0].name,
                doctorName: userRow[0].doctor_name,
                date: appointment_date,
                time: appointment_time
            }).catch(err => console.error('Appointment SMS error:', err.message));
        }

        const socketService = require('../services/socketService');
        socketService.emitQueueUpdate({ type: 'appointment_booked' });

        sendResponse(res, 201, 'Appointment created', {
            appointmentId: apptResult.insertId,
            tokenNumber
        });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.updateAppointmentStatus = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!allowed.includes(status)) {
            return sendResponse(res, 400, 'Invalid status');
        }

        const [appt] = await connection.execute('SELECT * FROM appointments WHERE id = ?', [id]);
        if (!appt[0]) return sendResponse(res, 404, 'Appointment not found');

        const row = appt[0];
        if (row.status === 'cancelled' && status !== 'cancelled') {
            return sendResponse(res, 400, 'Cannot change a cancelled appointment');
        }

        await connection.beginTransaction();

        if (remarks !== undefined) {
            await connection.execute('UPDATE appointments SET status = ?, remarks = ? WHERE id = ?', [status, remarks, id]);
        } else {
            await connection.execute('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
        }

        if (status === 'cancelled') {
            await connection.execute(
                `UPDATE opd_tokens SET status = 'completed'
         WHERE patient_id = ? AND doctor_id = ? AND visit_date = ? AND status IN ('waiting', 'in_consultation')`,
                [row.patient_id, row.doctor_id, row.appointment_date]
            );
        } else if (status === 'confirmed') {
            await connection.execute(
                `UPDATE opd_tokens SET status = 'waiting'
         WHERE patient_id = ? AND doctor_id = ? AND visit_date = ?`,
                [row.patient_id, row.doctor_id, row.appointment_date]
            );
        } else if (status === 'completed') {
            await connection.execute(
                `UPDATE opd_tokens SET status = 'completed'
         WHERE patient_id = ? AND doctor_id = ? AND visit_date = ?`,
                [row.patient_id, row.doctor_id, row.appointment_date]
            );
        }

        await connection.commit();

        const socketService = require('../services/socketService');
        socketService.emitQueueUpdate({ appointment_id: id, status });

        sendResponse(res, 200, 'Appointment status updated');
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const [appointments] = await db.execute(`
      SELECT 'appointment' as type, u.name as patient, doc_u.name as doctor, a.status, a.created_at as time
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id JOIN users u ON p.user_id = u.id
      JOIN doctors d ON a.doctor_id = d.id JOIN users doc_u ON d.user_id = doc_u.id
      ORDER BY a.created_at DESC LIMIT 5
    `);
        const [admissions] = await db.execute(`
      SELECT 'admission' as type, u.name as patient, doc_u.name as doctor, a.status, a.created_at as time
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id JOIN users u ON p.user_id = u.id
      JOIN doctors d ON a.doctor_id = d.id JOIN users doc_u ON d.user_id = doc_u.id
      ORDER BY a.created_at DESC LIMIT 5
    `);
        const [bills] = await db.execute(`
      SELECT 'billing' as type, u.name as patient, b.payment_status as status, b.total_amount, b.bill_date as time
      FROM bills b
      JOIN patients p ON b.patient_id = p.id JOIN users u ON p.user_id = u.id
      ORDER BY b.bill_date DESC LIMIT 5
    `);

        const combined = [
            ...appointments.map((r) => ({ ...r, detail: r.doctor })),
            ...admissions.map((r) => ({ ...r, detail: r.doctor })),
            ...bills.map((r) => ({ ...r, detail: `₹${r.total_amount}` }))
        ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        sendResponse(res, 200, 'Recent activity fetched', combined);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM departments ORDER BY name');
        sendResponse(res, 200, 'Departments fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            return sendResponse(res, 400, 'Invalid status');
        }
        await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        await auditLogger.log(req.user.id, 'user_status_update', 'user', id, { status });
        sendResponse(res, 200, 'User status updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { specialization, experience_years, room_number, consultation_fee, department_id, status } = req.body;
        await db.execute(
            `UPDATE doctors SET specialization = COALESCE(?, specialization), experience_years = COALESCE(?, experience_years),
       room_number = COALESCE(?, room_number), consultation_fee = COALESCE(?, consultation_fee),
       department_id = COALESCE(?, department_id), status = COALESCE(?, status) WHERE id = ?`,
            [specialization, experience_years, room_number, consultation_fee, department_id, status, id]
        );
        await auditLogger.log(req.user.id, 'doctor_update', 'doctor', id, req.body);
        sendResponse(res, 200, 'Doctor updated');
    } catch (err) {
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const {
            action,
            entity_type,
            user_id,
            from,
            to,
            search,
            limit: limitParam,
            offset: offsetParam
        } = req.query;

        const limit = Math.min(parseInt(limitParam, 10) || 100, 500);
        const offset = parseInt(offsetParam, 10) || 0;

        let sql = `
      SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (action && action !== 'all') {
            sql += ' AND a.action = ?';
            params.push(action);
        }
        if (entity_type && entity_type !== 'all') {
            sql += ' AND a.entity_type = ?';
            params.push(entity_type);
        }
        if (user_id) {
            sql += ' AND a.user_id = ?';
            params.push(user_id);
        }
        if (from) {
            sql += ' AND DATE(a.created_at) >= ?';
            params.push(from);
        }
        if (to) {
            sql += ' AND DATE(a.created_at) <= ?';
            params.push(to);
        }
        if (search) {
            sql += ' AND (a.action LIKE ? OR a.entity_type LIKE ? OR u.name LIKE ? OR a.details LIKE ?)';
            const q = `%${search}%`;
            params.push(q, q, q, q);
        }

        const countSql = sql.replace(
            'SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role',
            'SELECT COUNT(*) as total'
        );
        const [countRows] = await db.execute(countSql, params);
        const total = countRows[0]?.total || 0;

        sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.execute(sql, params);

        const [statsRows] = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(DATE(created_at) = CURDATE()) as today,
        SUM(action LIKE '%delete%') as deletes,
        SUM(action LIKE '%create%' OR action LIKE '%add%') as creates
      FROM audit_logs
    `);

        const [topActions] = await db.execute(
            `SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 8`
        );

        const [actionsList] = await db.execute(
            'SELECT DISTINCT action FROM audit_logs ORDER BY action'
        );
        const [entityTypes] = await db.execute(
            `SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type`
        );
        const [usersList] = await db.execute(
            `SELECT DISTINCT u.id, u.name FROM audit_logs a
       JOIN users u ON a.user_id = u.id ORDER BY u.name`
        );

        sendResponse(res, 200, 'Audit logs fetched', {
            logs: rows,
            total,
            limit,
            offset,
            stats: statsRows[0] || {},
            topActions,
            filters: {
                actions: actionsList.map((r) => r.action),
                entityTypes: entityTypes.map((r) => r.entity_type),
                users: usersList
            }
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
