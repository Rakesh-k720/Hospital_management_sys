const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

exports.getDoctorSchedule = async (req, res) => {
    const doctorId = req.params.doctorId || req.query.doctor_id;
    const [rows] = await db.execute(
        'SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week, start_time',
        [doctorId]
    );
    sendResponse(res, 200, 'Schedule fetched', rows);
};

exports.saveDoctorSchedule = async (req, res) => {
    const { doctor_id, slots } = req.body;
    await db.execute('DELETE FROM doctor_schedules WHERE doctor_id = ?', [doctor_id]);
    for (const slot of slots || []) {
        await db.execute(
            'INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, ?)',
            [doctor_id, slot.day_of_week, slot.start_time, slot.end_time, slot.is_available !== false ? 1 : 0]
        );
    }
    sendResponse(res, 200, 'Schedule saved');
};
