const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All doctor routes are protected and restricted to 'doctor' role
router.use(protect);
router.use(authorize('doctor'));

router.get('/dashboard', doctorController.getDashboardStats);
router.get('/appointments', doctorController.getAppointments);
router.post('/prescription', doctorController.createPrescription);
router.post('/lab-request', doctorController.requestLabTest);

module.exports = router;
