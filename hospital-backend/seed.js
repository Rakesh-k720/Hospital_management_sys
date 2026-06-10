const db = require('./config/db');
const bcrypt = require('bcryptjs');

const DEMO_USERS = [
    { name: 'Main Admin', email: 'admin@hms.com', phone: '1234567890', role: 'admin' },
    { name: 'Dr. Alice', email: 'alice@hms.com', phone: '1234567891', role: 'doctor' },
    { name: 'Rakesh Kumar', email: 'rakesh@gmail.com', phone: '9876543210', role: 'patient' },
    { name: 'Priya Sharma', email: 'receptionist@hms.com', phone: '9876543211', role: 'receptionist' },
    { name: 'Nurse Sunita', email: 'nurse@hms.com', phone: '9876543212', role: 'nurse' },
    { name: 'Pharmacist Raj', email: 'pharmacist@hms.com', phone: '9876543213', role: 'pharmacist' },
    { name: 'Accountant Amit', email: 'accountant@hms.com', phone: '9876543214', role: 'accountant' },
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
        await upsertUser(DEMO_USERS[3], hashedPass); // receptionist
        await upsertUser(DEMO_USERS[4], hashedPass); // nurse
        await upsertUser(DEMO_USERS[5], hashedPass); // pharmacist
        await upsertUser(DEMO_USERS[6], hashedPass); // accountant

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

        // --- Seed Pharmacy Medicines ---
        const medicines = [
            ['Paracetamol 500mg', 'Paracetamol', 'Cipla', 'Analgesic', 25.00, 500, 50, '2026-12-31', 'BT001'],
            ['Amoxicillin 250mg', 'Amoxicillin', 'Sun Pharma', 'Antibiotic', 85.00, 200, 30, '2026-06-30', 'BT002'],
            ['Metformin 500mg', 'Metformin', 'USV Ltd', 'Antidiabetic', 45.00, 300, 40, '2026-09-15', 'BT003'],
            ['Amlodipine 5mg', 'Amlodipine', 'Pfizer', 'Antihypertensive', 60.00, 250, 25, '2026-08-20', 'BT004'],
            ['Omeprazole 20mg', 'Omeprazole', 'Dr. Reddys', 'Antacid', 55.00, 180, 20, '2026-07-10', 'BT005'],
            ['Azithromycin 500mg', 'Azithromycin', 'Alkem', 'Antibiotic', 120.00, 150, 20, '2026-05-25', 'BT006'],
            ['Cetirizine 10mg', 'Cetirizine', 'Cipla', 'Antihistamine', 15.00, 400, 50, '2026-11-30', 'BT007'],
            ['Ibuprofen 400mg', 'Ibuprofen', 'Sun Pharma', 'NSAID', 30.00, 350, 40, '2026-10-15', 'BT008'],
            ['Pantoprazole 40mg', 'Pantoprazole', 'Alkem', 'Antacid', 70.00, 10, 15, '2026-04-20', 'BT009'],
            ['Ciprofloxacin 500mg', 'Ciprofloxacin', 'Ranbaxy', 'Antibiotic', 95.00, 8, 15, '2026-03-31', 'BT010'],
        ];
        for (const m of medicines) {
            await db.execute(
                `INSERT INTO medicines (name, generic_name, manufacturer, category, unit_price, stock_quantity, reorder_level, expiry_date, batch_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity)`,
                m
            );
        }

        // --- Seed Insurance Providers ---
        const providers = [
            ['Star Health Insurance', 'Star Health TPA', 'claims@starhealth.in', '18001020000', 'Mumbai, India'],
            ['HDFC ERGO Health', 'HDFC ERGO TPA', 'support@hdfcergo.com', '18002700700', 'Delhi, India'],
            ['ICICI Lombard', 'ICICI Lombard TPA', 'claims@icicilombard.com', '18002669725', 'Bangalore, India'],
            ['Max Bupa Health', 'Max Bupa TPA', 'care@maxbupa.com', '18003006336', 'Gurugram, India'],
        ];
        for (const p of providers) {
            await db.execute(
                `INSERT INTO insurance_providers (name, tpa_name, contact_email, contact_phone, address)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                p
            );
        }

        // --- Seed Sample Medical Conditions for patient ---
        const [patRow2] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [patientUserId]);
        if (patRow2.length) {
            const patientId = patRow2[0].id;
            const [docRow2] = await db.execute('SELECT id FROM doctors WHERE user_id = ?', [doctorUserId]);
            const doctorId = docRow2.length ? docRow2[0].id : null;

            const conditions = [
                [patientId, 'Type 2 Diabetes Mellitus', 'E11', '2024-01-15', 'active', 'Controlled with Metformin', doctorId],
                [patientId, 'Essential Hypertension', 'I10', '2024-03-20', 'active', 'On Amlodipine 5mg daily', doctorId],
                [patientId, 'Acute Viral Fever', 'R50.9', '2025-01-10', 'resolved', 'Resolved in 5 days', doctorId],
            ];
            for (const c of conditions) {
                await db.execute(
                    `INSERT INTO medical_conditions (patient_id, condition_name, icd10_code, diagnosis_date, status, notes, diagnosed_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
                    c
                );
            }

            // --- Seed Sample Vitals ---
            const vitals = [
                [patientId, doctorUserId, 170, 72, 120, 80, 78, 36.8, 98, '2025-01-10 10:30:00'],
                [patientId, doctorUserId, 170, 71, 118, 78, 76, 36.6, 99, '2025-02-15 11:00:00'],
            ];
            for (const v of vitals) {
                await db.execute(
                    `INSERT INTO vitals (patient_id, recorded_by, height_cm, weight_kg, bp_systolic, bp_diastolic, pulse, temperature, spo2, recorded_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
                    v
                );
            }
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
