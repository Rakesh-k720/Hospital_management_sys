const db = require('../config/db');

const User = {
    // Find user by email
    findByEmail: async (email) => {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    // Create new user (Patient registration)
    create: async (userData) => {
        const { name, email, phone, password, role } = userData;
        const [result] = await db.execute(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, password, role]
        );
        return result.insertId;
    },

    // Find user by ID
    findById: async (id) => {
        const [rows] = await db.execute('SELECT id, name, email, role, status FROM users WHERE id = ?', [id]);
        return rows[0];
    }
};

module.exports = User;
