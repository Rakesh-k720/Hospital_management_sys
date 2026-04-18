const db = require('../config/db');

const Doctor = {
    // Get Doctor Dashboard Stats
    getStats: async (doctorId) => {
        const [appointments] = await db.execute(
            'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = CURDATE()',
            [doctorId]
        );
        const [totalPatients] = await db.execute(
            'SELECT COUNT(DISTINCT patient_id) as count FROM appointments WHERE doctor_id = ?',
            [doctorId]
        );
        const [pendingReports] = await db.execute(
            'SELECT COUNT(*) as count FROM lab_reports WHERE doctor_id = ? AND status = "pending"',
            [doctorId]
        );

        return {
            todayAppointments: appointments[0].count,
            totalPatients: totalPatients[0].count,
            pendingReports: pendingReports[0].count
        };
    }
};

module.exports = Doctor;
