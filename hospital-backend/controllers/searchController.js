const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

exports.globalSearch = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) {
            return sendResponse(res, 200, 'Query too short', { patients: [], doctors: [], tokens: [] });
        }
        const like = `%${q}%`;

        const [patients] = await db.execute(
            `SELECT p.id, u.name, u.email, u.phone, 'patient' as type
       FROM patients p JOIN users u ON p.user_id = u.id
       WHERE u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? LIMIT 10`,
            [like, like, like]
        );

        const [doctors] = await db.execute(
            `SELECT d.id, u.name, d.specialization, 'doctor' as type
       FROM doctors d JOIN users u ON d.user_id = u.id
       WHERE u.name LIKE ? OR d.specialization LIKE ? LIMIT 10`,
            [like, like]
        );

        const [tokens] = await db.execute(
            `SELECT t.token_number, u.name as patient_name, t.status, t.visit_date
       FROM opd_tokens t
       JOIN patients p ON t.patient_id = p.id JOIN users u ON p.user_id = u.id
       WHERE t.token_number LIKE ? AND t.visit_date >= CURDATE() - INTERVAL 1 DAY LIMIT 10`,
            [like]
        );

        sendResponse(res, 200, 'Search results', { patients, doctors, tokens });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
