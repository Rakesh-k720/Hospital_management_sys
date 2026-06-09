const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection and auto-seed tables if empty
pool.getConnection(async (err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('MySQL Database Connected Successfully');
        
        try {
            const promisePool = pool.promise();

            // Create support_tickets table if it doesn't exist
            await promisePool.execute(`
                CREATE TABLE IF NOT EXISTS \`support_tickets\` (
                    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                    \`patient_id\` INT NOT NULL,
                    \`title\` VARCHAR(255) NOT NULL,
                    \`category\` VARCHAR(100) NOT NULL,
                    \`description\` TEXT NOT NULL,
                    \`priority\` ENUM('low', 'medium', 'high') DEFAULT 'medium',
                    \`status\` ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                    \`reply\` TEXT,
                    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            
            // 1. Seed departments if empty
            const [depts] = await promisePool.execute('SELECT COUNT(*) as count FROM departments');
            if (depts[0].count === 0) {
                console.log('Seeding departments...');
                await promisePool.execute(`
                    INSERT INTO departments (name, description) VALUES 
                    ('Cardiology', 'Heart related disorders'),
                    ('Neurology', 'Nervous system disorders'),
                    ('Pediatrics', 'Child healthcare'),
                    ('General Medicine', 'General health issues')
                `);
            }

            // 2. Seed beds if empty
            const [beds] = await promisePool.execute('SELECT COUNT(*) as count FROM beds');
            if (beds[0].count === 0) {
                console.log('Seeding beds...');
                const bedSeeds = [
                    ['ICU Unit', 'ICU-101', 'ICU', 'occupied'],
                    ['ICU Unit', 'ICU-102', 'ICU', 'available'],
                    ['ICU Unit', 'ICU-103', 'ICU', 'available'],
                    ['ICU Unit', 'ICU-104', 'ICU', 'cleaning'],
                    ['ICU Unit', 'ICU-105', 'ICU', 'available'],
                    ['ICU Unit', 'ICU-106', 'ICU', 'occupied'],
                    ['General Ward A', 'G-201', 'general', 'occupied'],
                    ['General Ward A', 'G-202', 'general', 'available'],
                    ['General Ward A', 'G-203', 'general', 'available'],
                    ['General Ward A', 'G-204', 'general', 'occupied'],
                    ['General Ward A', 'G-205', 'general', 'cleaning'],
                    ['General Ward A', 'G-206', 'general', 'available'],
                    ['Private Ward', 'P-301', 'private', 'available'],
                    ['Private Ward', 'P-302', 'private', 'occupied'],
                    ['Private Ward', 'P-303', 'private', 'available']
                ];
                for (const b of bedSeeds) {
                    await promisePool.execute(
                        'INSERT INTO beds (ward_name, bed_number, bed_type, status) VALUES (?, ?, ?, ?)',
                        b
                    );
                }
            }
        } catch (seedErr) {
            console.error('Seeding tables failed:', seedErr.message);
        } finally {
            connection.release();
        }
    }
});

module.exports = pool.promise();
