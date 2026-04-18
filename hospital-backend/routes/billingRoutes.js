const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/all', authorize('admin'), billingController.getAllBills);
router.post('/generate', authorize('admin', 'doctor'), billingController.generateBill);
router.put('/pay', authorize('admin', 'patient'), billingController.updatePayment);

module.exports = router;
