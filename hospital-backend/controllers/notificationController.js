const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

exports.getMyNotifications = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM in_app_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        const [unread] = await db.execute(
            'SELECT COUNT(*) as count FROM in_app_notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        sendResponse(res, 200, 'Notifications fetched', { notifications: rows, unreadCount: unread[0].count });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute(
            'UPDATE in_app_notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        sendResponse(res, 200, 'Marked as read');
    } catch (err) {
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await db.execute('UPDATE in_app_notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        sendResponse(res, 200, 'All marked as read');
    } catch (err) {
        sendResponse(res, 500, 'Internal Server Error');
    }
};
