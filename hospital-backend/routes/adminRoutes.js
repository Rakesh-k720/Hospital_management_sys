const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const admissionController = require('../controllers/admissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes are protected and restricted to 'admin' role
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/doctors', adminController.getAllDoctors);
router.get('/patients', adminController.getAllPatients);
router.delete('/users/:id', adminController.deleteUser);

// IPD / Admission Routes
router.get('/beds', admissionController.getAllBeds);
router.get('/admissions', admissionController.getCurrentAdmissions);
router.post('/admit', admissionController.admitPatient);
router.post('/discharge', admissionController.dischargePatient);

module.exports = router;
