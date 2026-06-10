const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const emailService = require('../services/emailService');

/**
 * Generate a 6-digit OTP, hash it, store in DB, and return the plain OTP.
 */
exports.generateOTP = async (userId, purpose = 'login') => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.execute(
        'INSERT INTO otp_codes (user_id, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [userId, otpHash, purpose, expiresAt]
    );

    return otp;
};

/**
 * Verify an OTP against stored hashes for a user.
 */
exports.verifyOTP = async (userId, otp, purpose = 'login') => {
    const [rows] = await db.execute(
        `SELECT * FROM otp_codes 
         WHERE user_id = ? AND purpose = ? AND used = 0 AND expires_at > NOW() 
         ORDER BY id DESC LIMIT 5`,
        [userId, purpose]
    );

    for (const row of rows) {
        if (await bcrypt.compare(otp, row.otp_hash)) {
            await db.execute('UPDATE otp_codes SET used = 1 WHERE id = ?', [row.id]);
            return true;
        }
    }
    return false;
};

/**
 * Send OTP via email.
 */
exports.sendOTP = async (email, otp, userName) => {
    const hospital = process.env.HOSPITAL_NAME || 'LifeLine Hospital';
    const subject = `Your ${hospital} Login OTP`;
    const html = emailService.otpHtml(otp, userName);

    const result = await emailService.sendEmail({ to: email, subject, html });

    if (result.simulated) {
        console.log(`[OTP][SIMULATED] To: ${email} | User: ${userName} | OTP: ${otp}`);
        console.log(`[OTP] Valid for 10 minutes. Do not share with anyone.`);
    } else if (result.success) {
        console.log(`[OTP] Email sent successfully to ${email}`);
        if (result.previewUrl) {
            console.log(`[OTP] Preview URL: ${result.previewUrl}`);
        }
    } else {
        console.error(`[OTP] Failed to send email to ${email}:`, result.error);
    }

    return result;
};
