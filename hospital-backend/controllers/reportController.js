const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Department-wise revenue
exports.getDepartmentWiseRevenue = async (req, res) => {
    try {
        const { from, to } = req.query;
        const dateFrom = from || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0];
        const dateTo = to || new Date().toISOString().split('T')[0];

        const [rows] = await db.execute(`
            SELECT dep.name as department, dep.id as department_id,
                   COUNT(a.id) as total_appointments,
                   SUM(a.status = 'completed') as completed,
                   COALESCE(SUM(bi.cost), 0) as revenue
            FROM departments dep
            LEFT JOIN appointments a ON a.department_id = dep.id AND a.appointment_date BETWEEN ? AND ?
            LEFT JOIN bills b ON b.patient_id = a.patient_id AND b.bill_date BETWEEN ? AND ?
            LEFT JOIN bill_items bi ON bi.bill_id = b.id
            GROUP BY dep.id ORDER BY revenue DESC
        `, [dateFrom, dateTo, dateFrom, dateTo]);

        sendResponse(res, 200, 'Department revenue fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Patient demographics
exports.getPatientDemographics = async (req, res) => {
    try {
        const [genderDist] = await db.execute(
            'SELECT gender, COUNT(*) as count FROM patients GROUP BY gender'
        );

        const [ageGroups] = await db.execute(`
            SELECT 
                CASE 
                    WHEN age < 18 THEN '0-17 (Children)'
                    WHEN age BETWEEN 18 AND 30 THEN '18-30 (Young Adults)'
                    WHEN age BETWEEN 31 AND 45 THEN '31-45 (Adults)'
                    WHEN age BETWEEN 46 AND 60 THEN '46-60 (Middle Age)'
                    ELSE '60+ (Senior)'
                END as age_group,
                COUNT(*) as count
            FROM patients GROUP BY age_group ORDER BY MIN(age)
        `);

        const [bloodGroups] = await db.execute(
            'SELECT blood_group, COUNT(*) as count FROM patients WHERE blood_group IS NOT NULL GROUP BY blood_group ORDER BY count DESC'
        );

        sendResponse(res, 200, 'Demographics fetched', { genderDist, ageGroups, bloodGroups });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Doctor performance
exports.getDoctorPerformance = async (req, res) => {
    try {
        const { from, to } = req.query;
        const dateFrom = from || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];
        const dateTo = to || new Date().toISOString().split('T')[0];

        const [rows] = await db.execute(`
            SELECT d.id as doctor_id, u.name as doctor_name, dep.name as department,
                   d.specialization,
                   COUNT(a.id) as total_appointments,
                   SUM(a.status = 'completed') as completed,
                   SUM(a.status = 'cancelled') as cancelled,
                   ROUND(SUM(a.status = 'completed') / NULLIF(COUNT(a.id), 0) * 100, 1) as completion_rate,
                   COALESCE(d.consultation_fee * SUM(a.status = 'completed'), 0) as estimated_revenue
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN departments dep ON d.department_id = dep.id
            LEFT JOIN appointments a ON a.doctor_id = d.id AND a.appointment_date BETWEEN ? AND ?
            WHERE d.status = 'active'
            GROUP BY d.id ORDER BY total_appointments DESC
        `, [dateFrom, dateTo]);

        sendResponse(res, 200, 'Doctor performance fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Monthly comparison
exports.getMonthlyComparison = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                DATE_FORMAT(months.m, '%Y-%m') as month,
                COALESCE(opd.count, 0) as opd_count,
                COALESCE(ipd.count, 0) as ipd_count,
                COALESCE(revenue.total, 0) as revenue
            FROM (
                SELECT DATE_FORMAT(CURDATE() - INTERVAL n MONTH, '%Y-%m-01') as m
                FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) nums
            ) months
            LEFT JOIN (
                SELECT DATE_FORMAT(appointment_date, '%Y-%m') as m, COUNT(*) as count
                FROM appointments WHERE appointment_date >= CURDATE() - INTERVAL 6 MONTH
                GROUP BY m
            ) opd ON opd.m = DATE_FORMAT(months.m, '%Y-%m')
            LEFT JOIN (
                SELECT DATE_FORMAT(admission_date, '%Y-%m') as m, COUNT(*) as count
                FROM admissions WHERE admission_date >= CURDATE() - INTERVAL 6 MONTH
                GROUP BY m
            ) ipd ON ipd.m = DATE_FORMAT(months.m, '%Y-%m')
            LEFT JOIN (
                SELECT DATE_FORMAT(bill_date, '%Y-%m') as m, SUM(total_amount) as total
                FROM bills WHERE payment_status = 'paid' AND bill_date >= CURDATE() - INTERVAL 6 MONTH
                GROUP BY m
            ) revenue ON revenue.m = DATE_FORMAT(months.m, '%Y-%m')
            ORDER BY months.m
        `);

        sendResponse(res, 200, 'Monthly comparison fetched', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Custom date range report
exports.getCustomDateReport = async (req, res) => {
    try {
        const { from, to, department_id, doctor_id } = req.query;
        const dateFrom = from || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
        const dateTo = to || new Date().toISOString().split('T')[0];

        let apptSql = `
            SELECT COUNT(*) as total, SUM(status='completed') as completed, SUM(status='cancelled') as cancelled, SUM(status='pending') as pending
            FROM appointments WHERE appointment_date BETWEEN ? AND ?`;
        const apptParams = [dateFrom, dateTo];
        if (department_id) { apptSql += ' AND department_id = ?'; apptParams.push(department_id); }
        if (doctor_id) { apptSql += ' AND doctor_id = ?'; apptParams.push(doctor_id); }

        const [apptStats] = await db.execute(apptSql, apptParams);

        let billSql = `
            SELECT COUNT(*) as total_bills, SUM(payment_status='paid') as paid, SUM(payment_status='unpaid') as unpaid,
                   COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END), 0) as collected,
                   COALESCE(SUM(CASE WHEN payment_status='unpaid' THEN total_amount ELSE 0 END), 0) as pending_amount
            FROM bills WHERE bill_date BETWEEN ? AND ?`;
        const billParams = [dateFrom, dateTo];

        const [billStats] = await db.execute(billSql, billParams);

        const [dailyBreakdown] = await db.execute(`
            SELECT DATE(appointment_date) as date, COUNT(*) as appointments
            FROM appointments WHERE appointment_date BETWEEN ? AND ?
            GROUP BY DATE(appointment_date) ORDER BY date
        `, [dateFrom, dateTo]);

        sendResponse(res, 200, 'Custom report fetched', {
            period: { from: dateFrom, to: dateTo },
            appointmentStats: apptStats[0],
            billingStats: billStats[0],
            dailyBreakdown
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
