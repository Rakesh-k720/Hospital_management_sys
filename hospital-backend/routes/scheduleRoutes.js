const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/:doctorId', authorize('admin', 'doctor'), scheduleController.getDoctorSchedule);
router.post('/', authorize('admin'), scheduleController.saveDoctorSchedule);

module.exports = router;
