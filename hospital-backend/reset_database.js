/**
 * Full database reset: DROP → CREATE → schema → migrations → seed
 * Run: node reset_database.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'hospital_db';

async function runSqlFile(connection, filePath, label) {
    if (!fs.existsSync(filePath)) {
        console.warn(`Skip (not found): ${label}`);
        return;
    }
    console.log(`Running: ${label}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await connection.query(sql);
    console.log(`Done: ${label}`);
}

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS,
        multipleStatements: true
    });

    try {
        console.log('Dropping database:', dbName);
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        console.log('Creating fresh database:', dbName);
        await connection.query(
            `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await connection.query(`USE \`${dbName}\``);

        const root = path.join(__dirname, '..');
        await runSqlFile(connection, path.join(root, 'hms_schema.sql'), 'hms_schema.sql');
        await runSqlFile(
            connection,
            path.join(__dirname, 'migrations', '001_payments_notifications.sql'),
            'migration 001'
        );
        await runSqlFile(
            connection,
            path.join(__dirname, 'migrations', '002_all_phases.sql'),
            'migration 002'
        );
        await runSqlFile(
            connection,
            path.join(__dirname, 'migrations', '003_patient_profile_fields.sql'),
            'migration 003'
        );

        await connection.end();
        console.log('Seeding demo users...');
        execSync('node seed.js', { cwd: __dirname, stdio: 'inherit' });

        console.log('\n✅ Database reset complete!');
        console.log('Login: admin@hms.com / password123');
        console.log('Login: alice@hms.com / password123');
        console.log('Login: rakesh@gmail.com / password123');
        process.exit(0);
    } catch (err) {
        console.error('Reset failed:', err.message);
        process.exit(1);
    }
}

main();
