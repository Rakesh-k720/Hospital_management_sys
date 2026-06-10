const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');

// Get full EHR for a patient
exports.getPatientEHR = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Patient basic info + allergies + medical notes
        const [patientRows] = await db.execute(
            `SELECT p.*, u.name, u.email, u.phone, u.status as user_status
             FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
            [patientId]
        );
        if (!patientRows[0]) return sendResponse(res, 404, 'Patient not found');

        // Medical conditions
        const [conditions] = await db.execute(
            `SELECT mc.*, d_u.name as diagnosed_by_name, dep.name as department_name
             FROM medical_conditions mc
             LEFT JOIN doctors d ON mc.diagnosed_by = d.id
             LEFT JOIN users d_u ON d.user_id = d_u.id
             LEFT JOIN departments dep ON d.department_id = dep.id
             WHERE mc.patient_id = ?
             ORDER BY mc.created_at DESC`,
            [patientId]
        );

        // Vitals history
        const [vitals] = await db.execute(
            `SELECT v.*, u.name as recorded_by_name
             FROM vitals v
             JOIN users u ON v.recorded_by = u.id
             WHERE v.patient_id = ?
             ORDER BY v.recorded_at DESC LIMIT 50`,
            [patientId]
        );

        // Past prescriptions
        const [prescriptions] = await db.execute(
            `SELECT pr.*, d_u.name as doctor_name, dep.name as department_name
             FROM prescriptions pr
             JOIN doctors d ON pr.doctor_id = d.id
             JOIN users d_u ON d.user_id = d_u.id
             LEFT JOIN departments dep ON d.department_id = dep.id
             WHERE pr.patient_id = ?
             ORDER BY pr.created_at DESC LIMIT 20`,
            [patientId]
        );

        // Prescription medicines for each prescription
        for (const pr of prescriptions) {
            const [meds] = await db.execute(
                'SELECT * FROM prescription_medicines WHERE prescription_id = ?',
                [pr.id]
            );
            pr.medicines = meds;
        }

        // Lab reports
        const [labReports] = await db.execute(
            `SELECT lr.*, lt.test_name, d_u.name as doctor_name
             FROM lab_reports lr
             JOIN lab_tests lt ON lr.test_id = lt.id
             JOIN doctors d ON lr.doctor_id = d.id
             JOIN users d_u ON d.user_id = d_u.id
             WHERE lr.patient_id = ?
             ORDER BY lr.created_at DESC LIMIT 20`,
            [patientId]
        );

        // Admissions history
        const [admissions] = await db.execute(
            `SELECT a.*, d_u.name as doctor_name, b.ward_name, b.bed_number
             FROM admissions a
             JOIN doctors d ON a.doctor_id = d.id
             JOIN users d_u ON d.user_id = d_u.id
             JOIN beds b ON a.bed_id = b.id
             WHERE a.patient_id = ?
             ORDER BY a.admission_date DESC LIMIT 10`,
            [patientId]
        );

        // Pharmacy orders
        const [pharmacyOrders] = await db.execute(
            `SELECT po.*, u.name as dispensed_by_name
             FROM pharmacy_orders po
             JOIN users u ON po.dispensed_by = u.id
             WHERE po.patient_id = ?
             ORDER BY po.created_at DESC LIMIT 10`,
            [patientId]
        );

        sendResponse(res, 200, 'EHR fetched', {
            patient: patientRows[0],
            conditions,
            vitals,
            prescriptions,
            labReports,
            admissions,
            pharmacyOrders
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Add medical condition
exports.addCondition = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { condition_name, icd10_code, diagnosis_date, notes, doctor_id } = req.body;
        if (!condition_name?.trim()) return sendResponse(res, 400, 'Condition name is required');

        const docId = doctor_id || req.user.doctor_id;
        if (!docId) return sendResponse(res, 400, 'Doctor ID is required');

        const [r] = await db.execute(
            `INSERT INTO medical_conditions (patient_id, condition_name, icd10_code, diagnosis_date, notes, diagnosed_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [patientId, condition_name.trim(), icd10_code || null, diagnosis_date || null, notes || null, docId]
        );
        await auditLogger.log(req.user.id, 'condition_add', 'medical_condition', r.insertId, { condition_name, patientId }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Condition added', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Update condition
exports.updateCondition = async (req, res) => {
    try {
        const { id } = req.params;
        const { condition_name, icd10_code, status, notes } = req.body;

        await db.execute(
            `UPDATE medical_conditions SET condition_name = COALESCE(?, condition_name), 
             icd10_code = COALESCE(?, icd10_code), status = COALESCE(?, status), 
             notes = COALESCE(?, notes) WHERE id = ?`,
            [condition_name, icd10_code, status, notes, id]
        );
        await auditLogger.log(req.user.id, 'condition_update', 'medical_condition', id, { status }, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Condition updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Delete condition
exports.deleteCondition = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT condition_name FROM medical_conditions WHERE id = ?', [id]);
        await db.execute('DELETE FROM medical_conditions WHERE id = ?', [id]);
        await auditLogger.log(req.user.id, 'condition_delete', 'medical_condition', id, rows[0] || {}, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Condition deleted');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Record vitals
exports.recordVitals = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { height_cm, weight_kg, bp_systolic, bp_diastolic, pulse, temperature, spo2, notes } = req.body;

        const [r] = await db.execute(
            `INSERT INTO vitals (patient_id, recorded_by, height_cm, weight_kg, bp_systolic, bp_diastolic, pulse, temperature, spo2, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [patientId, req.user.id, height_cm || null, weight_kg || null, bp_systolic || null,
             bp_diastolic || null, pulse || null, temperature || null, spo2 || null, notes || null]
        );
        await auditLogger.log(req.user.id, 'vitals_record', 'vital', r.insertId, { patientId }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Vitals recorded', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get vitals history
exports.getVitalsHistory = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { limit = 50 } = req.query;

        const [rows] = await db.execute(
            `SELECT v.*, u.name as recorded_by_name
             FROM vitals v
             JOIN users u ON v.recorded_by = u.id
             WHERE v.patient_id = ?
             ORDER BY v.recorded_at DESC LIMIT ?`,
            [patientId, Number(limit)]
        );
        sendResponse(res, 200, 'Vitals history fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
