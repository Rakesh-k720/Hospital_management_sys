const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Register User
exports.register = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { name, email, phone, password, role } = req.body;
        const selectedRole = role || 'patient';

        // Check if user exists
        const userExists = await User.findByEmail(email);
        if (userExists) {
            return sendResponse(res, 400, 'User already exists');
        }

        await connection.beginTransaction();

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, hashedPassword, selectedRole]
        );
        const userId = userResult.insertId;

        // Ensure role-specific profile exists so role dashboards do not fail.
        if (selectedRole === 'patient') {
            await connection.execute(
                'INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?, ?, ?, ?, ?)',
                [userId, 18, 'other', null, null]
            );
        } else if (selectedRole === 'doctor') {
            await connection.execute(
                'INSERT INTO doctors (user_id, department_id, specialization, experience_years, room_number, consultation_fee) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 1, 'General Physician', 0, null, 500]
            );
        }

        await connection.commit();

        sendResponse(res, 201, 'User registered successfully', { userId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    } finally {
        connection.release();
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findByEmail(email);
        if (!user) {
            return sendResponse(res, 401, 'Invalid credentials');
        }

        // Check status
        if (user.status !== 'active') {
            return sendResponse(res, 401, 'Account is inactive');
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return sendResponse(res, 401, 'Invalid credentials');
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        sendResponse(res, 200, 'Login successful', {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
