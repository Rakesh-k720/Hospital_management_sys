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
router.post('/doctors', adminController.addDoctor);
router.get('/patients', adminController.getAllPatients);
router.get('/patients/:id', adminController.getPatientById);
router.post('/patients', adminController.createPatient);
router.put('/patients/:id', adminController.updatePatient);
router.get('/appointments', adminController.getAllAppointments);
router.post('/appointments', adminController.createAppointment);
router.patch('/appointments/:id/status', adminController.updateAppointmentStatus);
router.get('/activity', adminController.getRecentActivity);
router.get('/departments', adminController.getDepartments);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/doctors/:id', adminController.updateDoctor);
router.get('/audit-logs', adminController.getAuditLogs);

// IPD / Admission Routes
router.get('/beds', admissionController.getAllBeds);
router.get('/admissions', admissionController.getCurrentAdmissions);
router.get('/admissions/discharged/list', admissionController.getDischargedAdmissions);
router.post('/admit', admissionController.admitPatient);
router.post('/discharge', admissionController.dischargePatient);
router.get('/admissions/:id', admissionController.getAdmissionById);
router.patch('/beds/:id/status', admissionController.updateBedStatus);

module.exports = router;
