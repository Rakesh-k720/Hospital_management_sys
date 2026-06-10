const db = require('../config/db');

exports.log = async (userId, action, entityType = null, entityId = null, details = null, ipAddress = null, userAgent = null) => {
    try {
        await db.execute(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress, userAgent]
        );
    } catch (err) {
        console.warn('Audit log skipped:', err.message);
    }
};
