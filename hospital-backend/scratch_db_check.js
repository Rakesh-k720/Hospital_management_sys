const db = require('./config/db');

async function check() {
    try {
        console.log("Checking DB Connection...");
        const [tables] = await db.execute("SHOW TABLES");
        console.log("Tables in database:", tables.map(t => Object.values(t)[0]));

        for (let table of ['users', 'patients', 'doctors', 'departments', 'appointments', 'opd_tokens', 'beds', 'admissions', 'prescriptions', 'prescription_medicines', 'lab_tests', 'lab_reports', 'bills', 'bill_items']) {
            try {
                const [cols] = await db.execute(`DESCRIBE \`${table}\``);
                console.log(`\nTable ${table} exists. Columns:`, cols.map(c => c.Field).join(', '));
            } catch (err) {
                console.error(`\nError describing table ${table}:`, err.message);
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
}

check();
