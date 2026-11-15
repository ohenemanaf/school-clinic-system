const express = require('express');
const c = require('../controllers/adminController');
const { adminOnly } = require('../middleware/authMiddleware');
const { validateBody, rules } = require('../middleware/validate');

const router = express.Router();

router.get('/stats', adminOnly, c.getDashboardStats);
router.get('/staff', adminOnly, c.listStaff);
router.post(
    '/staff',
    adminOnly,
    validateBody({
        email: { rule: rules.email() },
        password: { rule: rules.string({ min: 8, max: 128 }), trim: false },
        firstName: { rule: rules.string({ max: 100 }) },
        lastName: { rule: rules.string({ max: 100 }) },
        specialization: { rule: rules.string({ max: 150 }), optional: true },
        roomNumber: { rule: rules.string({ max: 20 }), optional: true },
    }),
    c.addStaff
);

module.exports = router;
