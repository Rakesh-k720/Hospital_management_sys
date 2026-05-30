const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));
router.get('/', inventoryController.list);
router.get('/:id', inventoryController.getById);
router.post('/', inventoryController.create);
router.put('/:id', inventoryController.update);
router.patch('/:id/stock', inventoryController.adjustStock);
router.delete('/:id', inventoryController.remove);

module.exports = router;
