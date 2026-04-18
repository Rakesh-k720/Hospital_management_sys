const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All patient routes are protected and restricted to 'patient' role
router.use(protect);
router.use(authorize('patient'));

router.get('/dashboard', patientController.getDashboardStats);
router.post('/appointments', patientController.bookAppointment);
router.get('/appointments', patientController.getMyAppointments);
router.get('/bills', patientController.getMyBills);
router.get('/prescriptions', patientController.getMyPrescriptions);

module.exports = router;
