const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/slots', verifyToken, appointmentController.getAvailableSlots);
router.post('/book', verifyToken, appointmentController.bookAppointment);
router.post('/staff-appointments', verifyToken, appointmentController.getStaffAppointments);
router.post('/staff-slots', verifyToken, appointmentController.getStaffSlots);
router.post('/slots/add', verifyToken, appointmentController.createTimeSlot);
router.put('/:id/cancel-by-staff', verifyToken, appointmentController.cancelByStaff);

module.exports = router;
