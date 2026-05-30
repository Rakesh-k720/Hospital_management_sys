const db = require('../config/db');

let twilioClient = null;

const getTwilio = () => {
    if (twilioClient) return twilioClient;
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return null;
    }
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return twilioClient;
};

const formatPhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (String(phone).startsWith('+')) return String(phone);
    return `+${digits}`;
};

const logNotification = async (userId, channel, phone, message, status) => {
    try {
        await db.execute(
            'INSERT INTO notification_logs (user_id, channel, phone, message, status) VALUES (?, ?, ?, ?, ?)',
            [userId || null, channel, phone, message, status]
        );
    } catch (err) {
        console.warn('notification_logs insert skipped:', err.message);
    }
};

/**
 * Send OPD token alert via SMS and/or WhatsApp (Twilio).
 * Falls back to console + DB log when Twilio is not configured.
 */
exports.sendTokenBookingAlert = async ({ userId, phone, patientName, tokenNumber, doctorName, appointmentDate, appointmentTime, queuePosition }) => {
    const hospital = process.env.HOSPITAL_NAME || 'LifeLine Hospital';
    const message =
        `Dear ${patientName}, your OPD token is *${tokenNumber}* with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime}. ` +
        `Queue position: ${queuePosition}. Thank you — ${hospital}`;

    const formattedPhone = formatPhone(phone);
    const client = getTwilio();

    if (!client || !formattedPhone) {
        console.log(`[HMS NOTIFY][SIMULATED] To: ${phone} | ${message}`);
        await logNotification(userId, 'console', phone, message, 'simulated');
        return { sms: 'simulated', whatsapp: 'simulated' };
    }

    const results = { sms: 'skipped', whatsapp: 'skipped' };

    try {
        if (process.env.TWILIO_PHONE_NUMBER) {
            await client.messages.create({
                body: message.replace(/\*/g, ''),
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone
            });
            results.sms = 'sent';
            await logNotification(userId, 'sms', phone, message, 'sent');
        }
    } catch (err) {
        console.error('SMS failed:', err.message);
        results.sms = 'failed';
        await logNotification(userId, 'sms', phone, message, 'failed');
    }

    try {
        const waFrom = process.env.TWILIO_WHATSAPP_FROM;
        if (waFrom) {
            const from = waFrom.startsWith('whatsapp:') ? waFrom : `whatsapp:${waFrom}`;
            const to = formattedPhone.startsWith('whatsapp:') ? formattedPhone : `whatsapp:${formattedPhone}`;
            await client.messages.create({
                body: message.replace(/\*/g, ''),
                from,
                to
            });
            results.whatsapp = 'sent';
            await logNotification(userId, 'whatsapp', phone, message, 'sent');
        }
    } catch (err) {
        console.error('WhatsApp failed:', err.message);
        results.whatsapp = 'failed';
        await logNotification(userId, 'whatsapp', phone, message, 'failed');
    }

    return results;
};

exports.sendLabReportReadyAlert = async ({ userId, phone, patientName, testName }) => {
    const hospital = process.env.HOSPITAL_NAME || 'LifeLine Hospital';
    const message = `Dear ${patientName}, your lab report for "${testName}" is ready. Login to ${hospital} patient portal to download.`;
    const formattedPhone = formatPhone(phone);
    const client = getTwilio();

    if (!client || !formattedPhone) {
        console.log(`[HMS NOTIFY][SIMULATED] ${message}`);
        await logNotification(userId, 'console', phone, message, 'simulated');
        return { status: 'simulated' };
    }

    try {
        if (process.env.TWILIO_WHATSAPP_FROM) {
            const waFrom = process.env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
                ? process.env.TWILIO_WHATSAPP_FROM
                : `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
            await client.messages.create({
                body: message,
                from: waFrom,
                to: `whatsapp:${formattedPhone}`
            });
            await logNotification(userId, 'whatsapp', phone, message, 'sent');
            return { status: 'sent', channel: 'whatsapp' };
        }
        if (process.env.TWILIO_PHONE_NUMBER) {
            await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone
            });
            await logNotification(userId, 'sms', phone, message, 'sent');
            return { status: 'sent', channel: 'sms' };
        }
    } catch (err) {
        console.error('Lab notify failed:', err.message);
        await logNotification(userId, 'sms', phone, message, 'failed');
    }
    return { status: 'failed' };
};
