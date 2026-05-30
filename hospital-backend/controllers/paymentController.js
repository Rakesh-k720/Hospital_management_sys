const crypto = require('crypto');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }
    const Razorpay = require('razorpay');
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

exports.getConfig = (req, res) => {
    sendResponse(res, 200, 'Payment config', {
        razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID),
        keyId: process.env.RAZORPAY_KEY_ID || null
    });
};

exports.createOrder = async (req, res) => {
    try {
        const { bill_id } = req.body;
        const razorpay = getRazorpay();
        if (!razorpay) {
            return sendResponse(res, 503, 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
        }

        const [bills] = await db.execute('SELECT * FROM bills WHERE id = ?', [bill_id]);
        if (!bills[0]) return sendResponse(res, 404, 'Bill not found');
        const bill = bills[0];

        if (bill.payment_status === 'paid') {
            return sendResponse(res, 400, 'Bill is already paid');
        }

        if (req.user.role === 'patient') {
            const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient[0] || patient[0].id !== bill.patient_id) {
                return sendResponse(res, 403, 'Not authorized for this bill');
            }
        }

        const amountPaise = Math.round(Number(bill.total_amount) * 100);
        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt: `bill_${bill_id}_${Date.now()}`,
            notes: { bill_id: String(bill_id), patient_id: String(bill.patient_id) }
        });

        await db.execute('UPDATE bills SET razorpay_order_id = ? WHERE id = ?', [order.id, bill_id]);

        sendResponse(res, 200, 'Order created', {
            orderId: order.id,
            amount: amountPaise,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID,
            billId: bill_id
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, err.message || 'Failed to create payment order');
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            bill_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!process.env.RAZORPAY_KEY_SECRET) {
            return sendResponse(res, 503, 'Razorpay not configured');
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expected !== razorpay_signature) {
            return sendResponse(res, 400, 'Invalid payment signature');
        }

        const [bills] = await db.execute('SELECT * FROM bills WHERE id = ?', [bill_id]);
        if (!bills[0]) return sendResponse(res, 404, 'Bill not found');

        if (req.user.role === 'patient') {
            const [patient] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient[0] || patient[0].id !== bills[0].patient_id) {
                return sendResponse(res, 403, 'Not authorized');
            }
        }

        await db.execute(
            `UPDATE bills SET payment_status = 'paid', payment_method = 'online',
       razorpay_order_id = ?, razorpay_payment_id = ? WHERE id = ?`,
            [razorpay_order_id, razorpay_payment_id, bill_id]
        );

        sendResponse(res, 200, 'Payment verified successfully', { billId: bill_id });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Payment verification failed');
    }
};

/** Razorpay webhook (optional) — set RAZORPAY_WEBHOOK_SECRET */
exports.razorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (secret && req.headers['x-razorpay-signature']) {
            const crypto = require('crypto');
            const expected = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');
            if (expected !== req.headers['x-razorpay-signature']) {
                return res.status(400).json({ success: false });
            }
        }

        const event = req.body?.event;
        if (event === 'payment.captured') {
            const payment = req.body.payload?.payment?.entity;
            const orderId = payment?.order_id;
            if (orderId) {
                await db.execute(
                    `UPDATE bills SET payment_status = 'paid', payment_method = 'online', razorpay_payment_id = ?
           WHERE razorpay_order_id = ?`,
                    [payment.id, orderId]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};
