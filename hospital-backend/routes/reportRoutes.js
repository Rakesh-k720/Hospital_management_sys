const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'accountant'));

router.get('/department-revenue', reportController.getDepartmentWiseRevenue);
router.get('/demographics', reportController.getPatientDemographics);
router.get('/doctor-performance', reportController.getDoctorPerformance);
router.get('/monthly-comparison', reportController.getMonthlyComparison);
router.get('/custom', reportController.getCustomDateReport);

module.exports = router;
