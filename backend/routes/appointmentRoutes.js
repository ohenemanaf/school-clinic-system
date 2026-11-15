const express = require('express');
const c = require('../controllers/appointmentController');
const { staffOnly, studentOnly } = require('../middleware/authMiddleware');
const { validateBody, validateIdParam, rules } = require('../middleware/validate');

const router = express.Router();

// Students
router.get('/slots', studentOnly, c.getAvailableSlots);
router.get('/me', studentOnly, c.getMyAppointments);
router.post(
    '/book',
    studentOnly,
    validateBody({ slotId: { rule: rules.id() }, reason: { rule: rules.string({ max: 1000 }) } }),
    c.bookAppointment
);
router.put('/:id/cancel', studentOnly, validateIdParam(), c.cancelByStudent);

// Staff
router.get('/staff', staffOnly, c.getStaffAppointments);
router.get('/staff/slots', staffOnly, c.getStaffSlots);
router.post(
    '/staff/slots',
    staffOnly,
    validateBody({
        slotDate: { rule: rules.date() },
        startTime: { rule: rules.time() },
        endTime: { rule: rules.time() },
    }),
    c.createTimeSlot
);
router.delete('/staff/slots/:id', staffOnly, validateIdParam(), c.deleteTimeSlot);
router.put('/:id/confirm', staffOnly, validateIdParam(), c.confirmByStaff);
router.put('/:id/cancel-by-staff', staffOnly, validateIdParam(), c.cancelByStaff);

module.exports = router;
