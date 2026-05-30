const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/config', paymentController.getConfig);
router.post('/webhook', express.json({ type: 'application/json' }), paymentController.razorpayWebhook);

router.use(protect);
router.post('/create-order', authorize('patient', 'admin'), paymentController.createOrder);
router.post('/verify', authorize('patient', 'admin'), paymentController.verifyPayment);

module.exports = router;
