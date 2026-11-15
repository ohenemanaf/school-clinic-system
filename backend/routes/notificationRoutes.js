const express = require('express');
const c = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateIdParam } = require('../middleware/validate');

const router = express.Router();

router.get('/me', verifyToken, c.getNotifications);
router.put('/read-all', verifyToken, c.markAllAsRead);
router.put('/:id/read', verifyToken, validateIdParam(), c.markAsRead);

module.exports = router;
