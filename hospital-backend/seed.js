const db = require('./config/db');
const bcrypt = require('bcryptjs');

const DEMO_USERS = [
    { name: 'Main Admin', email: 'admin@hms.com', phone: '1234567890', role: 'admin' },
    { name: 'Dr. Alice', email: 'alice@hms.com', phone: '1234567891', role: 'doctor' },
    { name: 'Rakesh Kumar', email: 'rakesh@gmail.com', phone: '9876543210', role: 'patient' },
];

const upsertUser = async (user, hashedPass) => {
    await db.execute(
        `INSERT INTO users (name, email, phone, password, role, status)
         VALUES (?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
           password = VALUES(password),
           name = VALUES(name),
           phone = VALUES(phone),
           role = VALUES(role),
           status = 'active'`,
        [user.name, user.email, user.phone, hashedPass, user.role]
    );
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [user.email]);
    return rows[0].id;
};

const seedData = async () => {
    try {
        console.log('Starting Seeding...');

        const hashedPass = await bcrypt.hash('password123', 10);

        const adminId = await upsertUser(DEMO_USERS[0], hashedPass);
        const doctorUserId = await upsertUser(DEMO_USERS[1], hashedPass);
        const patientUserId = await upsertUser(DEMO_USERS[2], hashedPass);

        await db.execute('INSERT IGNORE INTO lab_tests (test_name, description, price) VALUES (?, ?, ?)',
            ['Blood Count (CBC)', 'Complete blood count analysis', 450.00]);
        await db.execute('INSERT IGNORE INTO lab_tests (test_name, description, price) VALUES (?, ?, ?)',
            ['X-Ray Chest', 'Radiological imaging of chest', 1200.00]);

        const [docRow] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [doctorUserId]);
        if (!docRow.length) {
            await db.execute(
                'INSERT INTO doctors (user_id, department_id, specialization, experience_years, room_number, consultation_fee) VALUES (?, ?, ?, ?, ?, ?)',
                [doctorUserId, 1, 'General Physician', 5, '202B', 400.00]
            );
        }

        const [patRow] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [patientUserId]);
        if (!patRow.length) {
            await db.execute(
                'INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?, ?, ?, ?, ?)',
                [patientUserId, 20, 'male', 'A+', 'Street 1, NY']
            );
        }

        // Remove legacy schema placeholder users (invalid plaintext passwords)
        const [legacy] = await db.execute(
            `SELECT id FROM users WHERE email IN ('admin@hospital.com', 'smith@hospital.com')`
        );
        for (const row of legacy) {
            await db.execute('DELETE FROM doctors WHERE user_id = ?', [row.id]);
            await db.execute('DELETE FROM patients WHERE user_id = ?', [row.id]);
            await db.execute('DELETE FROM users WHERE id = ?', [row.id]);
        }

        console.log('Seeding Completed Successfully!');
        console.log('Demo logins (password: password123):');
        DEMO_USERS.forEach((u) => console.log(`  - ${u.role}: ${u.email}`));
        console.log(`  (admin id: ${adminId})`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
};

seedData();
