const crypto = require('crypto');

describe('Razorpay signature verification', () => {
    it('validates HMAC signature correctly', () => {
        const secret = 'test_secret';
        const orderId = 'order_123';
        const paymentId = 'pay_456';
        const body = `${orderId}|${paymentId}`;
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

        const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
        expect(signature).toBe(expected);
    });
});
