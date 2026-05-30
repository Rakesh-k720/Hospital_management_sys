const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendResponse } = require('../utils/responseHandler');

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.execute(
            'SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?',
            [userId]
        );
        if (!users[0]) return sendResponse(res, 404, 'User not found');

        const profile = { user: users[0] };

        if (req.user.role === 'patient') {
            const [rows] = await db.execute(
                'SELECT * FROM patients WHERE user_id = ?',
                [userId]
            );
            profile.patient = rows[0] || null;
        } else if (req.user.role === 'doctor') {
            const [rows] = await db.execute(
                `SELECT d.*, dep.name as department_name, u.name, u.email, u.phone
         FROM doctors d
         JOIN users u ON d.user_id = u.id
         JOIN departments dep ON d.department_id = dep.id
         WHERE d.user_id = ?`,
                [userId]
            );
            profile.doctor = rows[0] || null;
        }

        sendResponse(res, 200, 'Profile fetched', profile);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            phone,
            age,
            gender,
            blood_group,
            address,
            emergency_contact,
            allergies,
            medical_notes,
            specialization,
            experience_years,
            room_number,
            consultation_fee,
            current_password,
            new_password
        } = req.body;

        if (name) await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
        if (phone) await db.execute('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);

        if (new_password) {
            const [u] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
            const match = await bcrypt.compare(current_password || '', u[0].password);
            if (!match) return sendResponse(res, 400, 'Current password is incorrect');
            const hashed = await bcrypt.hash(new_password, 10);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
        }

        if (req.user.role === 'patient') {
            await db.execute(
                `UPDATE patients SET
           age = COALESCE(?, age),
           gender = COALESCE(?, gender),
           blood_group = COALESCE(?, blood_group),
           address = COALESCE(?, address),
           emergency_contact = COALESCE(?, emergency_contact),
           allergies = COALESCE(?, allergies),
           medical_notes = COALESCE(?, medical_notes)
         WHERE user_id = ?`,
                [age, gender, blood_group, address, emergency_contact, allergies, medical_notes, userId]
            );
        } else if (req.user.role === 'doctor') {
            await db.execute(
                `UPDATE doctors SET specialization = COALESCE(?, specialization),
         experience_years = COALESCE(?, experience_years),
         room_number = COALESCE(?, room_number), consultation_fee = COALESCE(?, consultation_fee)
         WHERE user_id = ?`,
                [specialization, experience_years, room_number, consultation_fee, userId]
            );
        }

        sendResponse(res, 200, 'Profile updated successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
