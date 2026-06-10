const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');

// ==================== PROVIDERS ====================

exports.getProviders = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM insurance_providers ORDER BY name');
        sendResponse(res, 200, 'Insurance providers fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createProvider = async (req, res) => {
    try {
        const { name, tpa_name, contact_email, contact_phone, address } = req.body;
        if (!name?.trim()) return sendResponse(res, 400, 'Provider name is required');

        const [r] = await db.execute(
            'INSERT INTO insurance_providers (name, tpa_name, contact_email, contact_phone, address) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), tpa_name || null, contact_email || null, contact_phone || null, address || null]
        );
        await auditLogger.log(req.user.id, 'insurance_provider_create', 'insurance_provider', r.insertId, { name }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Provider created', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, tpa_name, contact_email, contact_phone, address, status } = req.body;
        await db.execute(
            `UPDATE insurance_providers SET name=COALESCE(?,name), tpa_name=COALESCE(?,tpa_name), 
             contact_email=COALESCE(?,contact_email), contact_phone=COALESCE(?,contact_phone),
             address=COALESCE(?,address), status=COALESCE(?,status) WHERE id=?`,
            [name, tpa_name, contact_email, contact_phone, address, status, id]
        );
        sendResponse(res, 200, 'Provider updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// ==================== PATIENT INSURANCE ====================

exports.getPatientInsurance = async (req, res) => {
    try {
        const { patientId } = req.params;
        const [rows] = await db.execute(
            `SELECT pi.*, ip.name as provider_name, ip.tpa_name
             FROM patient_insurance pi
             JOIN insurance_providers ip ON pi.provider_id = ip.id
             WHERE pi.patient_id = ?
             ORDER BY pi.created_at DESC`,
            [patientId]
        );
        sendResponse(res, 200, 'Patient insurance fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.addPatientInsurance = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { provider_id, policy_number, member_id, coverage_type, valid_from, valid_to } = req.body;
        if (!provider_id || !policy_number || !valid_from || !valid_to) {
            return sendResponse(res, 400, 'Provider, policy number, and validity dates are required');
        }

        const [r] = await db.execute(
            `INSERT INTO patient_insurance (patient_id, provider_id, policy_number, member_id, coverage_type, valid_from, valid_to) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [patientId, provider_id, policy_number, member_id || null, coverage_type || null, valid_from, valid_to]
        );
        await auditLogger.log(req.user.id, 'patient_insurance_add', 'patient_insurance', r.insertId, { patientId, policy_number }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Insurance added', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updatePatientInsurance = async (req, res) => {
    try {
        const { id } = req.params;
        const { policy_number, member_id, coverage_type, valid_from, valid_to, status } = req.body;
        await db.execute(
            `UPDATE patient_insurance SET policy_number=COALESCE(?,policy_number), member_id=COALESCE(?,member_id),
             coverage_type=COALESCE(?,coverage_type), valid_from=COALESCE(?,valid_from), 
             valid_to=COALESCE(?,valid_to), status=COALESCE(?,status) WHERE id=?`,
            [policy_number, member_id, coverage_type, valid_from, valid_to, status, id]
        );
        sendResponse(res, 200, 'Insurance updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// ==================== CLAIMS ====================

exports.createClaim = async (req, res) => {
    try {
        const { bill_id, patient_id, provider_id, claimed_amount, notes } = req.body;
        if (!bill_id || !patient_id || !provider_id || !claimed_amount) {
            return sendResponse(res, 400, 'Bill, patient, provider and amount are required');
        }

        const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;
        const [r] = await db.execute(
            `INSERT INTO insurance_claims (bill_id, patient_id, provider_id, claim_number, claimed_amount, notes, submitted_date) 
             VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
            [bill_id, patient_id, provider_id, claimNumber, claimed_amount, notes || null]
        );
        await auditLogger.log(req.user.id, 'claim_create', 'insurance_claim', r.insertId, { claimNumber, claimed_amount }, req.ip, req.headers['user-agent']);
        sendResponse(res, 201, 'Claim created', { id: r.insertId, claimNumber });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approved_amount, notes } = req.body;
        const validStatuses = ['pending', 'submitted', 'approved', 'rejected', 'partially_approved'];
        if (!validStatuses.includes(status)) return sendResponse(res, 400, 'Invalid status');

        let resolvedDate = null;
        if (['approved', 'rejected', 'partially_approved'].includes(status)) {
            resolvedDate = new Date().toISOString().split('T')[0];
        }

        await db.execute(
            `UPDATE insurance_claims SET status=?, approved_amount=COALESCE(?,approved_amount), 
             notes=COALESCE(?,notes), resolved_date=COALESCE(?,resolved_date) WHERE id=?`,
            [status, approved_amount, notes, resolvedDate, id]
        );
        await auditLogger.log(req.user.id, 'claim_status_update', 'insurance_claim', id, { status, approved_amount }, req.ip, req.headers['user-agent']);
        sendResponse(res, 200, 'Claim status updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getClaims = async (req, res) => {
    try {
        const { status, provider_id, from, to } = req.query;
        let sql = `
            SELECT ic.*, u.name as patient_name, ip.name as provider_name, ip.tpa_name,
                   b.total_amount as bill_amount
            FROM insurance_claims ic
            JOIN patients p ON ic.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN insurance_providers ip ON ic.provider_id = ip.id
            JOIN bills b ON ic.bill_id = b.id
            WHERE 1=1`;
        const params = [];

        if (status && status !== 'all') { sql += ' AND ic.status = ?'; params.push(status); }
        if (provider_id) { sql += ' AND ic.provider_id = ?'; params.push(provider_id); }
        if (from) { sql += ' AND DATE(ic.created_at) >= ?'; params.push(from); }
        if (to) { sql += ' AND DATE(ic.created_at) <= ?'; params.push(to); }
        sql += ' ORDER BY ic.created_at DESC LIMIT 100';

        const [rows] = await db.execute(sql, params);
        sendResponse(res, 200, 'Claims fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getInsuranceStats = async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM insurance_claims) as total_claims,
                (SELECT COUNT(*) FROM insurance_claims WHERE status = 'pending') as pending_claims,
                (SELECT COUNT(*) FROM insurance_claims WHERE status = 'approved') as approved_claims,
                (SELECT COUNT(*) FROM insurance_claims WHERE status = 'rejected') as rejected_claims,
                (SELECT COALESCE(SUM(claimed_amount), 0) FROM insurance_claims) as total_claimed,
                (SELECT COALESCE(SUM(approved_amount), 0) FROM insurance_claims WHERE status IN ('approved','partially_approved')) as total_approved,
                (SELECT COUNT(*) FROM insurance_providers WHERE status = 'active') as active_providers,
                (SELECT COUNT(*) FROM patient_insurance WHERE status = 'active') as insured_patients
        `);

        const [providerBreakdown] = await db.execute(`
            SELECT ip.name as provider_name, COUNT(ic.id) as claim_count, 
                   COALESCE(SUM(ic.claimed_amount), 0) as claimed,
                   COALESCE(SUM(ic.approved_amount), 0) as approved
            FROM insurance_claims ic
            JOIN insurance_providers ip ON ic.provider_id = ip.id
            GROUP BY ip.id ORDER BY claim_count DESC
        `);

        sendResponse(res, 200, 'Insurance stats fetched', { stats: stats[0], providerBreakdown });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
