const db = require('../config/db');

const Admin = {
    // Get dashboard statistics
    getStats: async () => {
        const [patients] = await db.execute('SELECT COUNT(*) as count FROM patients');
        const [doctors] = await db.execute('SELECT COUNT(*) as count FROM doctors');
        const [appointments] = await db.execute('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = CURDATE()');
        const [revenue] = await db.execute("SELECT SUM(total_amount) as total FROM bills WHERE payment_status = 'paid'");
        const [beds] = await db.execute("SELECT COUNT(*) as count FROM beds WHERE status = 'available'");
        const [totalBeds] = await db.execute('SELECT COUNT(*) as count FROM beds');
        const [waiting] = await db.execute(
            "SELECT COUNT(*) as count FROM opd_tokens WHERE visit_date = CURDATE() AND status = 'waiting'"
        );
        const [unpaidBills] = await db.execute(
            "SELECT COUNT(*) as count FROM bills WHERE payment_status != 'paid'"
        );
        const [pendingLabs] = await db.execute(
            "SELECT COUNT(*) as count FROM lab_reports WHERE status = 'pending'"
        );
        const [ipdAdmitted] = await db.execute(
            "SELECT COUNT(*) as count FROM admissions WHERE status = 'admitted'"
        );
        const [pendingRevenue] = await db.execute(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE payment_status != 'paid'"
        );

        return {
            totalPatients: patients[0].count,
            totalDoctors: doctors[0].count,
            todayAppointments: appointments[0].count,
            totalRevenue: revenue[0].total || 0,
            availableBeds: beds[0].count,
            totalBeds: totalBeds[0].count,
            waitingPatients: waiting[0].count,
            unpaidBills: unpaidBills[0].count,
            pendingLabs: pendingLabs[0].count,
            ipdAdmitted: ipdAdmitted[0].count,
            pendingRevenue: pendingRevenue[0].total || 0,
            occupiedBeds: totalBeds[0].count - beds[0].count
        };
    }
};

module.exports = Admin;
