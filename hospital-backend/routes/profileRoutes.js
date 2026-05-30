const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
