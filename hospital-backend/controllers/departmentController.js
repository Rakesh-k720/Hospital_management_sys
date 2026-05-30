const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');

const deptSelect = `
  SELECT d.*,
    (SELECT COUNT(*) FROM doctors doc WHERE doc.department_id = d.id) as doctor_count,
    (SELECT COUNT(*) FROM appointments a
      WHERE a.department_id = d.id AND a.appointment_date >= CURDATE() - INTERVAL 30 DAY
      AND a.status != 'cancelled') as appointments_30d,
    (SELECT COUNT(*) FROM opd_tokens t
      WHERE t.department_id = d.id AND t.visit_date = CURDATE() AND t.status = 'waiting') as opd_waiting_today
  FROM departments d
`;

exports.list = async (req, res) => {
    try {
        const [rows] = await db.execute(`${deptSelect} ORDER BY d.name`);

        const [statsRows] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT COUNT(*) FROM doctors) as total_doctors,
        (SELECT COUNT(*) FROM appointments
          WHERE appointment_date >= CURDATE() - INTERVAL 30 DAY AND status != 'cancelled') as appointments_30d
    `);

        sendResponse(res, 200, 'Departments fetched', {
            departments: rows,
            stats: statsRows[0] || {}
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [deptRows] = await db.execute(`${deptSelect} WHERE d.id = ?`, [id]);
        if (!deptRows[0]) return sendResponse(res, 404, 'Department not found');

        const [doctors] = await db.execute(
            `SELECT d.id, u.name, u.email, u.phone, d.specialization, d.experience_years,
              d.room_number, d.consultation_fee, d.status
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.department_id = ?
       ORDER BY u.name`,
            [id]
        );

        const [recentAppts] = await db.execute(
            `SELECT a.id, a.appointment_date, a.appointment_time, a.status, u.name as patient_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE a.department_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 10`,
            [id]
        );

        sendResponse(res, 200, 'Department detail fetched', {
            department: deptRows[0],
            doctors,
            recentAppointments: recentAppts
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.create = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name?.trim()) return sendResponse(res, 400, 'Department name is required');

        const [dup] = await db.execute('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)', [name.trim()]);
        if (dup[0]) return sendResponse(res, 409, 'Department with this name already exists');

        const [r] = await db.execute('INSERT INTO departments (name, description) VALUES (?, ?)', [
            name.trim(),
            description || null
        ]);
        await auditLogger.log(req.user.id, 'department_create', 'department', r.insertId, { name });
        sendResponse(res, 201, 'Department created', { id: r.insertId });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        if (!name?.trim()) return sendResponse(res, 400, 'Department name is required');

        const [dup] = await db.execute(
            'SELECT id FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?',
            [name.trim(), id]
        );
        if (dup[0]) return sendResponse(res, 409, 'Department with this name already exists');

        await db.execute('UPDATE departments SET name = ?, description = ? WHERE id = ?', [
            name.trim(),
            description || null,
            id
        ]);
        await auditLogger.log(req.user.id, 'department_update', 'department', id);
        sendResponse(res, 200, 'Department updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.remove = async (req, res) => {
    try {
        const { id } = req.params;

        const [docs] = await db.execute('SELECT COUNT(*) as count FROM doctors WHERE department_id = ?', [id]);
        if (Number(docs[0].count) > 0) {
            return sendResponse(res, 400, 'Cannot delete: doctors are assigned to this department');
        }

        const [appts] = await db.execute(
            'SELECT COUNT(*) as count FROM appointments WHERE department_id = ? AND appointment_date >= CURDATE()',
            [id]
        );
        if (Number(appts[0].count) > 0) {
            return sendResponse(res, 400, 'Cannot delete: department has upcoming appointments');
        }

        await db.execute('DELETE FROM departments WHERE id = ?', [id]);
        await auditLogger.log(req.user.id, 'department_delete', 'department', id);
        sendResponse(res, 200, 'Department deleted');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
