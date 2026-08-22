const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/add', verifyToken, recordController.createRecord);
router.get('/student/:studentId', verifyToken, recordController.getStudentRecords);

module.exports = router;
