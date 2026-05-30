const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const labController = require('../controllers/labController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Storage Config
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /pdf|image\/(jpeg|png)/i.test(file.mimetype);
        cb(ok ? null : new Error('Only PDF and images allowed'), ok);
    }
});

router.get('/catalog', labController.getTestsCatalog);

// Protected routes
router.use(protect);

router.get('/pending', authorize('admin', 'doctor'), labController.getPendingRequests);
router.get('/reports', authorize('admin'), labController.getAdminReports);
router.post('/request', authorize('admin'), labController.createLabRequestAdmin);
router.post('/tests', authorize('admin'), labController.createLabTest);
router.patch('/tests/:id', authorize('admin'), labController.updateLabTest);
router.delete('/reports/:id', authorize('admin'), labController.cancelLabReport);
router.get('/my-reports', authorize('patient'), labController.getPatientReports);
router.post('/upload', authorize('admin'), upload.single('report'), labController.uploadReport);

module.exports = router;
