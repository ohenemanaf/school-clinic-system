const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/stats', verifyToken, verifyRole(['admin']), adminController.getDashboardStats);
router.post('/staff', verifyToken, verifyRole(['admin']), adminController.addStaff);

module.exports = router;
