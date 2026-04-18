const db = require('./config/db');

const resetData = async () => {
    try {
        console.log('Starting Database Reset (Clearing all tables)...');

        // Disable foreign key checks to allow truncation
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');

        // List of tables to clear
        const tables = [
            'bill_items',
            'bills',
            'lab_reports',
            'lab_tests',
            'prescription_medicines',
            'prescriptions',
            'admissions',
            'beds',
            'opd_tokens',
            'appointments',
            'patients',
            'doctors',
            'departments',
            'users'
        ];

        for (const table of tables) {
            console.log(`Clearing table: ${table}`);
            await db.execute(`TRUNCATE TABLE ${table}`);
        }

        // Re-enable foreign key checks
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database Reset Completed Successfully! All tables are now empty.');
        process.exit(0);
    } catch (err) {
        console.error('Database Reset Failed:', err);
        process.exit(1);
    }
};

resetData();
