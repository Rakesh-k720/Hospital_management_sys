const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Admin: manage staff
router.post('/admin/create', authorize('admin'), staffController.createStaff);
router.get('/admin/list', authorize('admin'), staffController.listStaff);
router.put('/admin/:id', authorize('admin'), staffController.updateStaff);

// Receptionist
router.get('/receptionist/queue', authorize('admin', 'receptionist'), staffController.getTodayQueue);
router.post('/receptionist/walk-in', authorize('admin', 'receptionist'), staffController.registerWalkInPatient);

// Nurse
router.get('/nurse/ipd-patients', authorize('admin', 'nurse', 'doctor'), staffController.getIpdPatients);
router.post('/nurse/patient/:patientId/notes', authorize('admin', 'nurse', 'doctor'), staffController.addNursingNote);
router.get('/nurse/patient/:patientId/notes', authorize('admin', 'nurse', 'doctor'), staffController.getNursingNotes);

// Accountant
router.get('/accountant/summary', authorize('admin', 'accountant'), staffController.getFinancialSummary);
router.get('/accountant/unpaid-bills', authorize('admin', 'accountant'), staffController.getUnpaidBills);

module.exports = router;
