const db = require('./config/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        console.log('Starting Seeding...');

        // 1. Clean tables (optional, order matters)
        // await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        // await db.execute('TRUNCATE users');
        // ...

        // 2. Hash Passwords
        const hashedPass = await bcrypt.hash('password123', 10);

        // 3. Seed Departments (if not already handled by SQL script)
        // 4. Seed Users
        const [admin] = await db.execute(
            'INSERT IGNORE INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            ['Main Admin', 'admin@hms.com', '1234567890', hashedPass, 'admin']
        );

        const [doctor] = await db.execute(
            'INSERT IGNORE INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            ['Dr. Alice', 'alice@hms.com', '1234567891', hashedPass, 'doctor']
        );

        const [patient] = await db.execute(
            'INSERT IGNORE INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            ['Rakesh Kumar', 'rakesh@gmail.com', '9876543210', hashedPass, 'patient']
        );

        // 5. Seed Lab Tests
        await db.execute('INSERT IGNORE INTO lab_tests (test_name, description, price) VALUES (?, ?, ?)',
            ['Blood Count (CBC)', 'Complete blood count analysis', 450.00]);
        await db.execute('INSERT IGNORE INTO lab_tests (test_name, description, price) VALUES (?, ?, ?)',
            ['X-Ray Chest', 'Radiological imaging of chest', 1200.00]);

        // 6. Connect Doctor to Profile
        if (doctor.insertId) {
            await db.execute(
                'INSERT IGNORE INTO doctors (user_id, department_id, specialization, experience_years, room_number, consultation_fee) VALUES (?, ?, ?, ?, ?, ?)',
                [doctor.insertId, 1, 'General Physician', 5, '202B', 400.00]
            );
        }

        // 7. Connect Patient to Profile
        if (patient.insertId) {
            await db.execute(
                'INSERT IGNORE INTO patients (user_id, age, gender, blood_group, address) VALUES (?, ?, ?, ?, ?)',
                [patient.insertId, 20, 'male', 'A+', 'Street 1, NY']
            );
        }

        console.log('Seeding Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
};

seedData();
