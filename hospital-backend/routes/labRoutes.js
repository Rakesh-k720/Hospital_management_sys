const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const labController = require('../controllers/labController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.get('/catalog', labController.getTestsCatalog);

// Protected routes
router.use(protect);

router.get('/pending', authorize('admin', 'doctor'), labController.getPendingRequests);
router.get('/my-reports', authorize('patient'), labController.getPatientReports);
router.post('/upload', authorize('admin'), upload.single('report'), labController.uploadReport);

module.exports = router;
