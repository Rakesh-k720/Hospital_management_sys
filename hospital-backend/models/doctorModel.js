const db = require('../config/db');

const Doctor = {
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
        const [waitingQueue] = await db.execute(
            `SELECT COUNT(*) as count FROM opd_tokens
       WHERE doctor_id = ? AND visit_date = CURDATE() AND status = 'waiting'`,
            [doctorId]
        );
        const [inConsultation] = await db.execute(
            `SELECT COUNT(*) as count FROM opd_tokens
       WHERE doctor_id = ? AND visit_date = CURDATE() AND status = 'in_consultation'`,
            [doctorId]
        );
        const [completedToday] = await db.execute(
            `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id = ? AND appointment_date = CURDATE() AND status = 'completed'`,
            [doctorId]
        );
        const [ipdAdmitted] = await db.execute(
            `SELECT COUNT(*) as count FROM admissions WHERE doctor_id = ? AND status = 'admitted'`,
            [doctorId]
        );
        const [prescriptionsToday] = await db.execute(
            `SELECT COUNT(*) as count FROM prescriptions
       WHERE doctor_id = ? AND DATE(created_at) = CURDATE()`,
            [doctorId]
        );

        return {
            todayAppointments: appointments[0].count,
            totalPatients: totalPatients[0].count,
            pendingReports: pendingReports[0].count,
            waitingQueue: waitingQueue[0].count,
            inConsultation: inConsultation[0].count,
            completedToday: completedToday[0].count,
            ipdAdmitted: ipdAdmitted[0].count,
            prescriptionsToday: prescriptionsToday[0].count
        };
    }
};

module.exports = Doctor;
