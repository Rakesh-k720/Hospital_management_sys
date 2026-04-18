const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDb() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`Database ${process.env.DB_NAME} created or already exists.`);

        await connection.query(`USE ${process.env.DB_NAME}`);

        const sqlPath = path.join(__dirname, '..', 'hms_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Importing schema...');
        await connection.query(sql);
        console.log('Schema imported successfully.');

    } catch (err) {
        console.error('Error during DB initialization:', err);
    } finally {
        await connection.end();
    }
}

initDb();
