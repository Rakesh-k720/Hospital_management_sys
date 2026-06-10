const express = require('express');
const router = express.Router();
const ehrController = require('../controllers/ehrController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// EHR view — accessible by admin, doctor, nurse
router.get('/patient/:patientId', authorize('admin', 'doctor', 'nurse'), ehrController.getPatientEHR);

// Conditions — doctor and admin
router.post('/patient/:patientId/conditions', authorize('admin', 'doctor'), ehrController.addCondition);
router.put('/conditions/:id', authorize('admin', 'doctor'), ehrController.updateCondition);
router.delete('/conditions/:id', authorize('admin', 'doctor'), ehrController.deleteCondition);

// Vitals — doctor, nurse, admin
router.post('/patient/:patientId/vitals', authorize('admin', 'doctor', 'nurse'), ehrController.recordVitals);
router.get('/patient/:patientId/vitals', authorize('admin', 'doctor', 'nurse'), ehrController.getVitalsHistory);

module.exports = router;
