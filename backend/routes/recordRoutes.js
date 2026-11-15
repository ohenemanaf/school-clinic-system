const express = require('express');
const c = require('../controllers/recordController');
const { staffOnly, studentOnly, verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { validateBody, validateIdParam, rules } = require('../middleware/validate');

const router = express.Router();

router.post(
    '/',
    staffOnly,
    validateBody({
        appointmentId: { rule: rules.id() },
        diagnosis: { rule: rules.string({ max: 2000 }) },
        notes: { rule: rules.string({ max: 4000 }), optional: true },
        prescriptions: { rule: (v) => (Array.isArray(v) ? null : 'must be a list'), optional: true },
    }),
    c.createRecord
);
router.get('/me', studentOnly, c.getMyRecords);
router.get('/student/:studentId', staffOnly, validateIdParam('studentId'), c.getStudentRecords);
router.get('/:id', verifyToken, verifyRole(['student', 'staff']), validateIdParam(), c.getRecord);

module.exports = router;
