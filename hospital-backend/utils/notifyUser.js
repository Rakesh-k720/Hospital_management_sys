const db = require('../config/db');

exports.createNotification = async (userId, title, message, link = null) => {
    try {
        await db.execute(
            'INSERT INTO in_app_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
            [userId, title, message, link]
        );
    } catch (err) {
        console.warn('Notification insert skipped:', err.message);
    }
};
