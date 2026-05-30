const request = require('supertest');
const app = require('../app');

describe('Health API', () => {
    it('GET /health returns 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('Payments config', () => {
    it('GET /api/payments/config returns razorpayEnabled flag', async () => {
        const res = await request(app).get('/api/payments/config');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('razorpayEnabled');
    });
});
