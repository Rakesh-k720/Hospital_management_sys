const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/lobby', queueController.getLobbyDisplay);

router.use(protect);
router.get('/opd', authorize('admin', 'doctor'), queueController.getOpdQueue);
router.post('/walk-in', authorize('admin'), queueController.createWalkInToken);
router.patch('/token-status', authorize('admin', 'doctor'), queueController.updateTokenStatus);
router.patch('/token-priority', authorize('admin', 'doctor'), queueController.updateTokenPriority);

module.exports = router;
