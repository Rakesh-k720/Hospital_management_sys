const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
    if (transporter) return transporter;

    // If SMTP is configured, use it
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: (parseInt(process.env.SMTP_PORT) === 465),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('[Email] SMTP transporter configured');
        return transporter;
    }

    // Dev mode: create Ethereal test account
    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('[Email] Ethereal test account created:', testAccount.user);
        return transporter;
    } catch (err) {
        console.warn('[Email] Could not create test account:', err.message);
        return null;
    }
};

// HTML email template wrapper
const wrapInTemplate = (content) => {
    const hospital = process.env.HOSPITAL_NAME || 'LifeLine Hospital';
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #0ea5e9; padding: 24px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 32px; }
        .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0; }
        .info-box { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${hospital}</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${hospital}. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
};

// Template: OTP verification
exports.otpHtml = (otp, userName) => wrapInTemplate(`
    <h2>Hello ${userName},</h2>
    <p>Your one-time password (OTP) for two-factor authentication is:</p>
    <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background-color: #f0f9ff; padding: 16px 32px; border-radius: 8px; color: #0369a1;">${otp}</span>
    </div>
    <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
    <p>If you did not request this code, please ignore this email.</p>
`);

// Template: Appointment confirmation
exports.appointmentReminderHtml = (details) => wrapInTemplate(`
    <h2>Appointment Confirmed</h2>
    <p>Dear ${details.patientName},</p>
    <p>Your appointment has been successfully booked:</p>
    <div class="info-box">
        <p><strong>Doctor:</strong> ${details.doctorName}</p>
        <p><strong>Date:</strong> ${details.date}</p>
        <p><strong>Time:</strong> ${details.time}</p>
        ${details.department ? `<p><strong>Department:</strong> ${details.department}</p>` : ''}
    </div>
    <p>Please arrive 15 minutes before your appointment time.</p>
`);

// Template: Bill ready
exports.billReadyHtml = (details) => wrapInTemplate(`
    <h2>Bill Generated</h2>
    <p>Dear ${details.patientName},</p>
    <p>Your bill has been generated:</p>
    <div class="info-box">
        <p><strong>Bill ID:</strong> INV-${details.billId}</p>
        <p><strong>Amount:</strong> Rs. ${details.amount}</p>
        <p><strong>Date:</strong> ${details.date}</p>
    </div>
    <p>Please make the payment at your earliest convenience.</p>
`);

// Template: Lab report ready
exports.labReportHtml = (details) => wrapInTemplate(`
    <h2>Lab Report Ready</h2>
    <p>Dear ${details.patientName},</p>
    <p>Your lab report is now available:</p>
    <div class="info-box">
        <p><strong>Test:</strong> ${details.testName}</p>
        <p><strong>Date:</strong> ${details.date}</p>
    </div>
    <p>Login to your patient portal to view and download your report.</p>
`);

// Template: Welcome email
exports.welcomeHtml = (userName) => wrapInTemplate(`
    <h2>Welcome to ${process.env.HOSPITAL_NAME || 'LifeLine Hospital'}!</h2>
    <p>Dear ${userName},</p>
    <p>Your account has been created successfully. You can now:</p>
    <ul>
        <li>Book appointments online</li>
        <li>View your medical records</li>
        <li>Access lab reports</li>
        <li>Pay bills online</li>
    </ul>
    <p>If you have any questions, please contact our helpdesk.</p>
`);

/**
 * Send email
 * @param {Object} options - { to, subject, html }
 * @returns {Object} - { success, messageId, previewUrl }
 */
exports.sendEmail = async ({ to, subject, html }) => {
    const transport = await getTransporter();

    if (!transport) {
        console.log(`[Email][SIMULATED] To: ${to} | Subject: ${subject}`);
        return { success: false, simulated: true };
    }

    try {
        const info = await transport.sendMail({
            from: process.env.SMTP_FROM || `"${process.env.HOSPITAL_NAME || 'LifeLine Hospital'}" <noreply@hms.com>`,
            to,
            subject,
            html,
        });

        // Get preview URL for Ethereal (dev mode)
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('[Email] Preview URL:', previewUrl);
        }

        return { success: true, messageId: info.messageId, previewUrl: previewUrl || null };
    } catch (err) {
        console.error('[Email] Send failed:', err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send email with template (convenience method)
 */
exports.sendTemplatedEmail = async ({ to, subject, template, data }) => {
    const templateMap = {
        otp: exports.otpHtml,
        appointment: exports.appointmentReminderHtml,
        bill: exports.billReadyHtml,
        labReport: exports.labReportHtml,
        welcome: exports.welcomeHtml,
    };

    const htmlFn = templateMap[template];
    if (!htmlFn) {
        console.error('[Email] Unknown template:', template);
        return { success: false, error: 'Unknown template' };
    }

    const html = typeof data === 'object' ? htmlFn(data) : htmlFn(data);
    return exports.sendEmail({ to, subject, html });
};
