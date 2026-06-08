const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const socketService = require('../services/socketService');

const getOpdQueueQuery = `
  SELECT t.id as token_id, t.token_number, t.status as token_status, t.priority, t.visit_date,
         t.patient_id, t.doctor_id, t.department_id,
         u.name as patient_name, u.phone as patient_phone, p.age, p.gender, p.blood_group,
         doc_u.name as doctor_name, dep.name as department_name,
         a.id as appointment_id, a.status as appointment_status, a.appointment_time
  FROM opd_tokens t
  JOIN patients p ON t.patient_id = p.id
  JOIN users u ON p.user_id = u.id
  JOIN doctors doc ON t.doctor_id = doc.id
  JOIN users doc_u ON doc.user_id = doc_u.id
  JOIN departments dep ON t.department_id = dep.id
  LEFT JOIN appointments a ON a.patient_id = t.patient_id AND a.doctor_id = t.doctor_id AND a.appointment_date = t.visit_date
`;

exports.getOpdQueue = async (req, res) => {
    try {
        const { date, doctor_id, department_id } = req.query;
        const visitDate = date || new Date().toISOString().slice(0, 10);
        let sql = getOpdQueueQuery + ' WHERE t.visit_date = ?';
        const params = [visitDate];

        if (doctor_id) {
            sql += ' AND t.doctor_id = ?';
            params.push(doctor_id);
        }
        if (department_id) {
            sql += ' AND t.department_id = ?';
            params.push(department_id);
        }
        sql += ' ORDER BY FIELD(t.priority, "emergency", "normal"), t.created_at ASC';

        const [rows] = await db.execute(sql, params);

        let statsSql = `SELECT
        SUM(status = 'waiting') as waiting,
        SUM(status = 'in_consultation') as in_consultation,
        SUM(status = 'completed') as completed,
        COUNT(*) as total
       FROM opd_tokens WHERE visit_date = ?`;
        const statsParams = [visitDate];
        if (doctor_id) {
            statsSql += ' AND doctor_id = ?';
            statsParams.push(doctor_id);
        }
        if (department_id) {
            statsSql += ' AND department_id = ?';
            statsParams.push(department_id);
        }
        const [stats] = await db.execute(statsSql, statsParams);

        sendResponse(res, 200, 'OPD queue fetched', { queue: rows, stats: stats[0] });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getLobbyDisplay = async (req, res) => {
    try {
        const { department_id } = req.query;
        const visitDate = new Date().toISOString().slice(0, 10);

        let queueSql = `
      SELECT t.id as token_id, t.token_number, t.status, t.priority, t.created_at,
             doc_u.name as doctor_name, dep.id as department_id, dep.name as department_name
      FROM opd_tokens t
      JOIN doctors doc ON t.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dep ON t.department_id = dep.id
      WHERE t.visit_date = CURDATE() AND t.status IN ('waiting', 'in_consultation')
    `;
        const params = [];
        if (department_id) {
            queueSql += ' AND t.department_id = ?';
            params.push(department_id);
        }
        queueSql += ` ORDER BY FIELD(t.priority, 'emergency', 'normal'),
      FIELD(t.status, 'in_consultation', 'waiting'), t.created_at ASC LIMIT 40`;

        const [queueRows] = await db.execute(queueSql, params);

        let servingSql = `
      SELECT t.token_number, t.priority, doc_u.name as doctor_name,
             dep.id as department_id, dep.name as department_name, t.created_at
      FROM opd_tokens t
      JOIN doctors doc ON t.doctor_id = doc.id
      JOIN users doc_u ON doc.user_id = doc_u.id
      JOIN departments dep ON t.department_id = dep.id
      WHERE t.visit_date = CURDATE() AND t.status = 'in_consultation'
    `;
        const servingParams = [];
        if (department_id) {
            servingSql += ' AND t.department_id = ?';
            servingParams.push(department_id);
        }
        servingSql += ' ORDER BY t.id DESC LIMIT 6';

        const [nowServingAll] = await db.execute(servingSql, servingParams);

        const [recentCompleted] = await db.execute(
            `SELECT t.token_number, doc_u.name as doctor_name, dep.name as department_name
       FROM opd_tokens t
       JOIN doctors doc ON t.doctor_id = doc.id
       JOIN users doc_u ON doc.user_id = doc_u.id
       JOIN departments dep ON t.department_id = dep.id
       WHERE t.visit_date = CURDATE() AND t.status = 'completed'
       ORDER BY t.id DESC LIMIT 10`
        );

        let statsSql = `SELECT
        SUM(status = 'waiting') as waiting,
        SUM(status = 'in_consultation') as in_consultation,
        SUM(status = 'completed') as completed,
        COUNT(*) as total
       FROM opd_tokens WHERE visit_date = CURDATE()`;
        const statsParams = [];
        if (department_id) {
            statsSql += ' AND department_id = ?';
            statsParams.push(department_id);
        }
        const [statsRows] = await db.execute(statsSql, statsParams);

        const [departments] = await db.execute(
            `SELECT dep.id, dep.name,
        SUM(t.status = 'waiting') as waiting,
        SUM(t.status = 'in_consultation') as in_consultation,
        SUM(t.status = 'completed') as completed
       FROM departments dep
       LEFT JOIN opd_tokens t ON t.department_id = dep.id AND t.visit_date = CURDATE()
       GROUP BY dep.id, dep.name
       HAVING waiting > 0 OR in_consultation > 0 OR completed > 0
       ORDER BY dep.name`
        );

        const [settingsRows] = await db.execute(
            `SELECT setting_key, setting_value FROM hospital_settings
       WHERE setting_key IN ('hospital_name', 'hospital_address', 'hospital_phone', 'lobby_announcement')`
        );
        const hospital = {};
        settingsRows.forEach((r) => { hospital[r.setting_key] = r.setting_value; });
        if (!hospital.hospital_name) {
            hospital.hospital_name = process.env.HOSPITAL_NAME || 'LifeLine Hospital';
        }

        const waitingQueue = queueRows.filter((q) => q.status === 'waiting');
        const queueWithPosition = waitingQueue.map((q, idx) => ({ ...q, queue_position: idx + 1 }));

        sendResponse(res, 200, 'Lobby display data', {
            visitDate,
            hospital,
            stats: statsRows[0] || { waiting: 0, in_consultation: 0, completed: 0, total: 0 },
            departments,
            nowServing: nowServingAll[0] || null,
            nowServingAll,
            queue: queueWithPosition,
            recentlyCompleted
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateTokenStatus = async (req, res) => {
    try {
        const { token_id, status } = req.body;
        const allowed = ['waiting', 'in_consultation', 'completed'];
        if (!allowed.includes(status)) {
            return sendResponse(res, 400, 'Invalid status');
        }

        const [tokens] = await db.execute('SELECT * FROM opd_tokens WHERE id = ?', [token_id]);
        if (!tokens[0]) return sendResponse(res, 404, 'Token not found');

        const token = tokens[0];

        if (req.user.role === 'doctor') {
            const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (!doc[0] || doc[0].id !== token.doctor_id) {
                return sendResponse(res, 403, 'Not authorized for this token');
            }
        }

        await db.execute('UPDATE opd_tokens SET status = ? WHERE id = ?', [status, token_id]);

        if (status === 'completed') {
            await db.execute(
                `UPDATE appointments SET status = 'completed'
         WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ? AND status != 'cancelled'`,
                [token.patient_id, token.doctor_id, token.visit_date]
            );
        } else if (status === 'in_consultation') {
            await db.execute(
                `UPDATE appointments SET status = 'confirmed'
         WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ? AND status = 'pending'`,
                [token.patient_id, token.doctor_id, token.visit_date]
            );
        }

        socketService.emitQueueUpdate({ token_id, status, token });

        sendResponse(res, 200, 'Token status updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

async function issueOpdToken(connection, {
    patient_id,
    doctor_id,
    department_id,
    visit_date,
    priority,
    appointment_time
}) {
    const [existing] = await connection.execute(
        `SELECT id, token_number, status FROM opd_tokens
     WHERE patient_id = ? AND doctor_id = ? AND visit_date = ?
     AND status IN ('waiting', 'in_consultation')`,
        [patient_id, doctor_id, visit_date]
    );
    if (existing[0]) {
        const err = new Error('ACTIVE_TOKEN_EXISTS');
        err.token = existing[0];
        throw err;
    }

    const [todayTokens] = await connection.execute(
        'SELECT COUNT(*) as count FROM opd_tokens WHERE visit_date = ? AND department_id = ?',
        [visit_date, department_id]
    );
    const tokenSeq = todayTokens[0].count + 1;
    const tokenNumber = `T-${100 + tokenSeq}`;

    const [waiting] = await connection.execute(
        "SELECT COUNT(*) as count FROM opd_tokens WHERE visit_date = ? AND department_id = ? AND status = 'waiting'",
        [visit_date, department_id]
    );
    const queuePosition = waiting[0].count + 1;

    const time = appointment_time || '09:00:00';
    await connection.execute(
        "INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        [patient_id, doctor_id, department_id, visit_date, time]
    );
    const [tokenResult] = await connection.execute(
        "INSERT INTO opd_tokens (token_number, patient_id, doctor_id, department_id, visit_date, priority, status) VALUES (?, ?, ?, ?, ?, ?, 'waiting')",
        [tokenNumber, patient_id, doctor_id, department_id, visit_date, priority || 'normal']
    );

    return { tokenNumber, queuePosition, tokenId: tokenResult.insertId };
}

exports.createWalkInToken = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const {
            patient_id,
            doctor_id,
            department_id,
            visit_date,
            priority,
            appointment_time
        } = req.body;

        if (!patient_id || !doctor_id || !department_id) {
            return sendResponse(res, 400, 'patient_id, doctor_id and department_id are required');
        }

        const visitDate = visit_date || new Date().toISOString().slice(0, 10);

        const [patient] = await connection.execute('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient[0]) return sendResponse(res, 404, 'Patient not found');

        await connection.beginTransaction();
        let result;
        try {
            result = await issueOpdToken(connection, {
                patient_id,
                doctor_id,
                department_id,
                visit_date: visitDate,
                priority,
                appointment_time
            });
        } catch (e) {
            await connection.rollback();
            if (e.message === 'ACTIVE_TOKEN_EXISTS') {
                return sendResponse(res, 409, 'Patient already has an active token for this doctor today', e.token);
            }
            throw e;
        }
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
                'OPD Token Issued',
                `Walk-in token ${result.tokenNumber} — queue #${result.queuePosition}`,
                '/patient/token'
            ).catch(() => {});
        }

        socketService.emitQueueUpdate({ type: 'walk_in', patient_id, doctor_id });

        sendResponse(res, 201, 'Walk-in token issued', {
            tokenNumber: result.tokenNumber,
            queuePosition: result.queuePosition,
            tokenId: result.tokenId,
            visitDate
        });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

exports.updateTokenPriority = async (req, res) => {
    try {
        const { token_id, priority } = req.body;
        if (!['normal', 'emergency'].includes(priority)) {
            return sendResponse(res, 400, 'Invalid priority');
        }

        const [tokens] = await db.execute('SELECT * FROM opd_tokens WHERE id = ?', [token_id]);
        if (!tokens[0]) return sendResponse(res, 404, 'Token not found');

        const token = tokens[0];
        if (req.user.role === 'doctor') {
            const [doc] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (!doc[0] || doc[0].id !== token.doctor_id) {
                return sendResponse(res, 403, 'Not authorized for this token');
            }
        }

        await db.execute('UPDATE opd_tokens SET priority = ? WHERE id = ?', [priority, token_id]);
        socketService.emitQueueUpdate({ token_id, priority });

        sendResponse(res, 200, 'Priority updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
