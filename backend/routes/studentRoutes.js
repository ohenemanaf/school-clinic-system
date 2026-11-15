const express = require('express');
const c = require('../controllers/studentController');
const { studentOnly } = require('../middleware/authMiddleware');
const { validateBody, rules } = require('../middleware/validate');

const router = express.Router();

router.get('/me', studentOnly, c.getProfile);
router.put('/me', studentOnly, validateBody({ contactNumber: { rule: rules.string({ max: 20 }) } }), c.updateProfile);

module.exports = router;
