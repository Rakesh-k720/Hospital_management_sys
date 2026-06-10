const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'accountant'));

// Providers
router.get('/providers', insuranceController.getProviders);
router.post('/providers', authorize('admin'), insuranceController.createProvider);
router.put('/providers/:id', authorize('admin'), insuranceController.updateProvider);

// Patient Insurance
router.get('/patient/:patientId', insuranceController.getPatientInsurance);
router.post('/patient/:patientId', insuranceController.addPatientInsurance);
router.put('/patient-insurance/:id', insuranceController.updatePatientInsurance);

// Claims
router.get('/claims', insuranceController.getClaims);
router.post('/claims', insuranceController.createClaim);
router.patch('/claims/:id/status', insuranceController.updateClaimStatus);

// Stats
router.get('/stats', insuranceController.getInsuranceStats);

module.exports = router;
