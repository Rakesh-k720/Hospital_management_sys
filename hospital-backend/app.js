const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { sendResponse } = require('./utils/responseHandler');

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Root Route
app.get('/', (req, res) => {
    res.send('<h1>Hospital Management System API</h1><p>The server is running. Visit <a href="/health">/health</a> for status.</p>');
});

// Health Check
app.get('/health', (req, res) => {
    sendResponse(res, 200, 'HMS API is running smoothly');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const labRoutes = require('./routes/labRoutes');
const billingRoutes = require('./routes/billingRoutes');
const profileRoutes = require('./routes/profileRoutes');
const queueRoutes = require('./routes/queueRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/schedules', scheduleRoutes);

if (process.env.ENABLE_SWAGGER !== 'false') {
    try {
        const swaggerUi = require('swagger-ui-express');
        const spec = {
            openapi: '3.0.0',
            info: { title: 'LifeLine HMS API', version: '1.0.0' },
            servers: [{ url: '/api' }],
            paths: {
                '/health': { get: { summary: 'Health check' } },
                '/auth/login': { post: { summary: 'Login' } },
                '/patient/appointments': { post: { summary: 'Book appointment' } },
                '/payments/create-order': { post: { summary: 'Razorpay order' } },
                '/queue/lobby': { get: { summary: 'Lobby display' } }
            }
        };
        app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
    } catch (e) {
        console.warn('Swagger UI not loaded');
    }
}

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    sendResponse(res, err.status || 500, err.message || 'Internal Server Error');
});

module.exports = app;
