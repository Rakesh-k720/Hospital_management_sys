const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));
router.get('/dashboard', analyticsController.getAdminAnalytics);

module.exports = router;
