const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { validateBody, rules } = require('../middleware/validate');

const router = express.Router();

// Slows down password guessing: N attempts per IP per 15 minutes.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT) || 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post(
    '/register',
    authLimiter,
    validateBody({
        email: { rule: rules.email() },
        password: { rule: rules.string({ min: 8, max: 128 }), trim: false },
        firstName: { rule: rules.string({ max: 100 }) },
        lastName: { rule: rules.string({ max: 100 }) },
        dob: { rule: rules.date() },
        studentNumber: { rule: rules.string({ max: 50 }) },
    }),
    authController.register
);

router.post(
    '/login',
    authLimiter,
    validateBody({
        email: { rule: rules.email() },
        password: { rule: rules.string({ max: 128 }), trim: false },
    }),
    authController.login
);

module.exports = router;
