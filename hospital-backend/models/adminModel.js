const db = require('../config/db');

const Admin = {
    // Get dashboard statistics
    getStats: async () => {
        const [patients] = await db.execute('SELECT COUNT(*) as count FROM patients');
        const [doctors] = await db.execute('SELECT COUNT(*) as count FROM doctors');
        const [appointments] = await db.execute('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = CURDATE()');
        const [revenue] = await db.execute('SELECT SUM(total_amount) as total FROM bills WHERE payment_status = "paid"');
        const [beds] = await db.execute('SELECT COUNT(*) as count FROM beds WHERE status = "available"');

        return {
            totalPatients: patients[0].count,
            totalDoctors: doctors[0].count,
            todayAppointments: appointments[0].count,
            totalRevenue: revenue[0].total || 0,
            availableBeds: beds[0].count
        };
    }
};

module.exports = Admin;
