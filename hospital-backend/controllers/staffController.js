const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');

// ==================== ADMIN: Manage Staff ====================

exports.createStaff = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { name, email, phone, password, role, department_id } = req.body;
        const validRoles = ['receptionist', 'nurse', 'pharmacist', 'accountant'];
        if (!validRoles.includes(role)) {
            return sendResponse(res, 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
        if (!name || !email || !password) {
            return sendResponse(res, 400, 'Name, email and password are required');
        }

        const [exists] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (exists[0]) return sendResponse(res, 400, 'Email already registered');

        await connection.beginTransaction();
        const hashed = await bcrypt.hash(password, 10);
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone || null, hashed, role]
        );

        await connection.commit();
        await auditLogger.log(req.user.id, 'staff_create', 'user', userResult.insertId, { name, email, role }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Staff member created', { userId: userResult.insertId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.listStaff = async (req, res) => {
    try {
        const { role } = req.query;
        let sql = "SELECT id, name, email, phone, role, status, two_factor_enabled, created_at FROM users WHERE role IN ('receptionist','nurse','pharmacist','accountant')";
        const params = [];
        if (role && role !== 'all') {
            sql += ' AND role = ?';
            params.push(role);
        }
        sql += ' ORDER BY name';
        const [rows] = await db.execute(sql, params);
        sendResponse(res, 200, 'Staff list fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, status } = req.body;
        if (name) await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, id]);
        if (phone !== undefined) await db.execute('UPDATE users SET phone = ? WHERE id = ?', [phone, id]);
        if (status) await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        await auditLogger.log(req.user.id, 'staff_update', 'user', id, { name, status }, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Staff member updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// ==================== RECEPTIONIST ====================

exports.getTodayQueue = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.*, u.name as patient_name, u.phone as patient_phone,
                   doc_u.name as doctor_name, dep.name as department_name
            FROM opd_tokens t
            JOIN patients p ON t.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN doctors d ON t.doctor_id = d.id
            JOIN users doc_u ON d.user_id = doc_u.id
            JOIN departments dep ON t.department_id = dep.id
            WHERE t.visit_date = CURDATE()
            ORDER BY t.created_at ASC
        `);
        sendResponse(res, 200, 'Today queue fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.registerWalkInPatient = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { name, email, phone, password, age, gender, blood_group, address, emergency_contact } = req.body;
        if (!name || !phone) {
            return sendResponse(res, 400, 'Name and phone are required');
        }

        const regEmail = email || `${phone}@walkin.hms`;
        const [exists] = await connection.execute('SELECT id FROM users WHERE email = ?', [regEmail]);
        
        await connection.beginTransaction();
        
        let userId;
        if (exists[0]) {
            userId = exists[0].id;
        } else {
            const hashed = await bcrypt.hash(password || 'walkin123', 10);
            const [userResult] = await connection.execute(
                'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, "patient")',
                [name, regEmail, phone, hashed]
            );
            userId = userResult.insertId;
            await connection.execute(
                'INSERT INTO patients (user_id, age, gender, blood_group, address, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, age || 18, gender || 'other', blood_group || null, address || null, emergency_contact || null]
            );
        }

        const [patientRows] = await connection.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);
        const patientId = patientRows[0]?.id;

        await connection.commit();
        await auditLogger.log(req.user.id, 'walkin_register', 'patient', patientId, { name, phone }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Walk-in patient registered', { userId, patientId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

// ==================== NURSE ====================

exports.getIpdPatients = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT a.*, u.name as patient_name, u.phone as patient_phone,
                   doc_u.name as doctor_name, b.ward_name, b.bed_number, b.bed_type
            FROM admissions a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users doc_u ON d.user_id = doc_u.id
            JOIN beds b ON a.bed_id = b.id
            WHERE a.status = 'admitted'
            ORDER BY b.ward_name, b.bed_number
        `);
        sendResponse(res, 200, 'IPD patients fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.addNursingNote = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { note_type, content } = req.body;
        if (!content?.trim()) return sendResponse(res, 400, 'Note content is required');

        const [r] = await db.execute(
            'INSERT INTO nursing_notes (patient_id, nurse_id, note_type, content) VALUES (?, ?, ?, ?)',
            [patientId, req.user.id, note_type || 'observation', content.trim()]
        );
        await auditLogger.log(req.user.id, 'nursing_note_add', 'nursing_note', r.insertId, { patientId }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Nursing note added', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getNursingNotes = async (req, res) => {
    try {
        const { patientId } = req.params;
        const [rows] = await db.execute(
            `SELECT nn.*, u.name as nurse_name
             FROM nursing_notes nn
             JOIN users u ON nn.nurse_id = u.id
             WHERE nn.patient_id = ?
             ORDER BY nn.created_at DESC LIMIT 50`,
            [patientId]
        );
        sendResponse(res, 200, 'Nursing notes fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// ==================== ACCOUNTANT ====================

exports.getFinancialSummary = async (req, res) => {
    try {
        const [summary] = await db.execute(`
            SELECT 
                (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE payment_status = 'paid' AND bill_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) as month_revenue,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE payment_status = 'unpaid') as total_unpaid,
                (SELECT COUNT(*) FROM bills WHERE payment_status = 'unpaid') as unpaid_count,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE payment_status = 'paid') as total_collected,
                (SELECT COALESCE(SUM(total_amount), 0) FROM pharmacy_orders WHERE status = 'dispensed' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) as pharmacy_month_revenue,
                (SELECT COUNT(*) FROM bills WHERE payment_status = 'paid' AND bill_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) as paid_bills_this_month
        `);

        const [methodBreakdown] = await db.execute(`
            SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
            FROM bills WHERE payment_status = 'paid' AND bill_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            GROUP BY payment_method
        `);

        const [recentBills] = await db.execute(`
            SELECT b.*, u.name as patient_name
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            ORDER BY b.bill_date DESC LIMIT 20
        `);

        sendResponse(res, 200, 'Financial summary fetched', {
            summary: summary[0],
            methodBreakdown,
            recentBills
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getUnpaidBills = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT b.*, u.name as patient_name, u.phone as patient_phone, u.email as patient_email
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE b.payment_status IN ('unpaid', 'partially_paid')
            ORDER BY b.bill_date DESC LIMIT 100
        `);
        sendResponse(res, 200, 'Unpaid bills fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
