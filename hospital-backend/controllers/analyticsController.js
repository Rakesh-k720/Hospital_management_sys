const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

exports.getAdminAnalytics = async (req, res) => {
    try {
        const [revenueByMonth] = await db.execute(`
      SELECT DATE_FORMAT(bill_date, '%Y-%m') as month, SUM(total_amount) as revenue
      FROM bills WHERE payment_status = 'paid'
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);

        const [appointmentsTrend] = await db.execute(`
      SELECT appointment_date as date, COUNT(*) as count
      FROM appointments WHERE appointment_date >= CURDATE() - INTERVAL 14 DAY
      GROUP BY appointment_date ORDER BY appointment_date
    `);

        const [bedStats] = await db.execute(`
      SELECT status, COUNT(*) as count FROM beds GROUP BY status
    `);

        const [deptLoad] = await db.execute(`
      SELECT dep.name, COUNT(a.id) as appointments
      FROM appointments a
      JOIN departments dep ON a.department_id = dep.id
      WHERE a.appointment_date >= CURDATE() - INTERVAL 30 DAY
      GROUP BY dep.id ORDER BY appointments DESC
    `);

        const [summaryRows] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE() AND status != 'cancelled') as today_appointments,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE payment_status = 'paid' AND bill_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) as month_revenue,
        (SELECT COUNT(*) FROM bills WHERE payment_status = 'unpaid') as unpaid_bills,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE payment_status = 'unpaid') as unpaid_amount,
        (SELECT COUNT(*) FROM lab_reports WHERE status = 'pending') as pending_labs,
        (SELECT COUNT(*) FROM admissions WHERE status = 'admitted') as ipd_patients,
        (SELECT COUNT(*) FROM opd_tokens WHERE visit_date = CURDATE()) as today_opd_tokens,
        (SELECT COUNT(*) FROM patients) as total_patients,
        (SELECT COUNT(*) FROM doctors) as total_doctors
    `);

        const [paymentBreakdown] = await db.execute(`
      SELECT payment_status as status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM bills GROUP BY payment_status
    `);

        const [labTrend] = await db.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM lab_reports WHERE created_at >= CURDATE() - INTERVAL 14 DAY
      GROUP BY DATE(created_at) ORDER BY date
    `);

        const [topTests] = await db.execute(`
      SELECT lt.test_name as name, COUNT(lr.id) as count
      FROM lab_reports lr
      JOIN lab_tests lt ON lr.test_id = lt.id
      WHERE lr.created_at >= CURDATE() - INTERVAL 30 DAY
      GROUP BY lt.id ORDER BY count DESC LIMIT 6
    `);

        const bedTotal = bedStats.reduce((s, b) => s + Number(b.count), 0);
        const occupied = bedStats.find((b) => b.status === 'occupied')?.count || 0;

        sendResponse(res, 200, 'Analytics fetched', {
            revenueByMonth: revenueByMonth.reverse(),
            appointmentsTrend,
            bedStats,
            deptLoad,
            summary: {
                ...summaryRows[0],
                bed_occupancy_pct: bedTotal ? Math.round((occupied / bedTotal) * 100) : 0
            },
            paymentBreakdown,
            labTrend,
            topTests
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
