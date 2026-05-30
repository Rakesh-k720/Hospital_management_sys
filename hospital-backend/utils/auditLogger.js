const db = require('../config/db');

exports.log = async (userId, action, entityType = null, entityId = null, details = null) => {
    try {
        await db.execute(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [userId, action, entityType, entityId, details ? JSON.stringify(details) : null]
        );
    } catch (err) {
        console.warn('Audit log skipped:', err.message);
    }
};
