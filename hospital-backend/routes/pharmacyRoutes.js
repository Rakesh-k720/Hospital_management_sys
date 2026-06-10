const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'pharmacist'));

// Medicines CRUD
router.get('/medicines', pharmacyController.getMedicines);
router.get('/medicines/:id', pharmacyController.getMedicineById);
router.post('/medicines', pharmacyController.createMedicine);
router.put('/medicines/:id', pharmacyController.updateMedicine);
router.delete('/medicines/:id', pharmacyController.deleteMedicine);

// Orders
router.get('/orders', pharmacyController.getOrders);
router.get('/orders/:id', pharmacyController.getOrderDetail);
router.post('/dispense', pharmacyController.dispensePrescription);
router.post('/walk-in', pharmacyController.createWalkInOrder);
router.patch('/orders/:id/status', pharmacyController.updateOrderStatus);

// Stats
router.get('/stats', pharmacyController.getPharmacyStats);

module.exports = router;
