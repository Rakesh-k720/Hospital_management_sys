const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Register User
exports.register = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { name, email, phone, password } = req.body;
        const selectedRole = 'patient';

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

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        if (!user) {
            return sendResponse(res, 200, 'If the email exists, reset instructions have been sent.');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(token, 10);
        const expires = new Date(Date.now() + 3600000);

        await db.execute(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [user.id, tokenHash, expires]
        );

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/Hospital_management_sys/#/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        console.log(`[PASSWORD RESET] ${email} → ${resetUrl}`);

        const payload = { message: 'If the email exists, reset instructions have been sent.' };
        if (process.env.NODE_ENV !== 'production') {
            payload.devResetToken = token;
            payload.devResetUrl = resetUrl;
        }
        sendResponse(res, 200, payload.message, payload);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, token, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return sendResponse(res, 400, 'Invalid or expired reset token');

        const [rows] = await db.execute(
            `SELECT * FROM password_reset_tokens WHERE user_id = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 5`,
            [user.id]
        );

        let matched = null;
        for (const row of rows) {
            if (await bcrypt.compare(token, row.token_hash)) {
                matched = row;
                break;
            }
        }
        if (!matched) return sendResponse(res, 400, 'Invalid or expired reset token');

        const hashed = await bcrypt.hash(password, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
        await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?', [user.id]);

        sendResponse(res, 200, 'Password reset successful. You can login now.');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
