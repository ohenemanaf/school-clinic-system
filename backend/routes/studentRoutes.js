const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/:id', verifyToken, studentController.getProfile);
router.put('/:id', verifyToken, studentController.updateProfile);

module.exports = router;
