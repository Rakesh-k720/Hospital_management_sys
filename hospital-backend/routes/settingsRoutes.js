const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', settingsController.getAll);

router.use(protect);
router.use(authorize('admin'));

router.get('/system-info', settingsController.getSystemInfo);
router.put('/', settingsController.update);

router.get('/backups', settingsController.listBackups);
router.post('/backups', settingsController.createBackup);
router.get('/backups/:filename/download', settingsController.downloadBackup);
router.delete('/backups/:filename', settingsController.deleteBackup);
router.post('/backups/:filename/restore', settingsController.restoreBackup);

module.exports = router;
