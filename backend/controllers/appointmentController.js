const pool = require('../config/db');
const { HttpError, withTransaction } = require('../utils/http');

// req.staff / req.student are set by the auth middleware (see middleware/authMiddleware.js).

const UPCOMING = "(t.slot_date > CURDATE() OR (t.slot_date = CURDATE() AND t.start_time > CURTIME()))";

function formatSlot(row) {
    return `${row.slot_date} at ${String(row.start_time).slice(0, 5)}`;
}

// ---------- Students ----------

exports.getAvailableSlots = async (req, res) => {
    const [slots] = await pool.query(`
        SELECT t.slot_id, t.staff_id, t.slot_date, t.start_time, t.end_time,
               s.first_name AS staff_first_name, s.last_name AS staff_last_name,
               s.specialization, s.room_number
        FROM time_slots t
        JOIN staff s ON t.staff_id = s.staff_id
        WHERE t.is_booked = FALSE AND ${UPCOMING}
        ORDER BY t.slot_date, t.start_time
    `);
    res.json(slots);
};

exports.getMyAppointments = async (req, res) => {
    const [rows] = await pool.query(`
        SELECT a.appointment_id, a.reason, a.status, a.created_at,
               t.slot_date, t.start_time, t.end_time,
               s.first_name AS staff_first_name, s.last_name AS staff_last_name, s.room_number
        FROM appointments a
        JOIN time_slots t ON a.slot_id = t.slot_id
        JOIN staff s ON t.staff_id = s.staff_id
        WHERE a.student_id = ?
        ORDER BY t.slot_date DESC, t.start_time DESC
    `, [req.student.student_id]);
    res.json(rows);
};

exports.bookAppointment = async (req, res) => {
    const { slotId, reason } = req.body;
    await withTransaction(pool, async (conn) => {
        // Lock the slot row so two students can't book it at the same time.
        const [slots] = await conn.query(
            `SELECT t.slot_id, t.is_booked, t.slot_date, t.start_time, s.user_id AS staff_user_id,
                    ${UPCOMING} AS is_upcoming
             FROM time_slots t JOIN staff s ON t.staff_id = s.staff_id
             WHERE t.slot_id = ? FOR UPDATE`,
            [slotId]
        );
        const slot = slots[0];
        if (!slot) throw new HttpError(404, 'That time slot no longer exists.');
        if (slot.is_booked) throw new HttpError(409, 'Sorry, that slot was just taken. Please pick another.');
        if (!slot.is_upcoming) throw new HttpError(400, 'That time slot has already passed.');

        await conn.query(
            'INSERT INTO appointments (student_id, slot_id, reason) VALUES (?, ?, ?)',
            [req.student.student_id, slotId, reason]
        );
        await conn.query('UPDATE time_slots SET is_booked = TRUE WHERE slot_id = ?', [slotId]);
        await conn.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [
            slot.staff_user_id,
            `New appointment request for ${formatSlot(slot)}.`,
        ]);
    });
    res.status(201).json({ message: 'Appointment booked. The clinic will confirm it shortly.' });
};

exports.cancelByStudent = async (req, res) => {
    await withTransaction(pool, async (conn) => {
        const [rows] = await conn.query(
            `SELECT a.appointment_id, a.status, a.slot_id, t.slot_date, t.start_time, s.user_id AS staff_user_id
             FROM appointments a
             JOIN time_slots t ON a.slot_id = t.slot_id
             JOIN staff s ON t.staff_id = s.staff_id
             WHERE a.appointment_id = ? AND a.student_id = ? FOR UPDATE`,
            [req.params.id, req.student.student_id]
        );
        const apt = rows[0];
        if (!apt) throw new HttpError(404, 'Appointment not found.');
        if (!['pending', 'confirmed'].includes(apt.status)) {
            throw new HttpError(409, `This appointment is already ${apt.status}.`);
        }

        await conn.query("UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?", [apt.appointment_id]);
        // A student cancellation re-opens the slot for someone else.
        await conn.query('UPDATE time_slots SET is_booked = FALSE WHERE slot_id = ?', [apt.slot_id]);
        await conn.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [
            apt.staff_user_id,
            `A student cancelled their appointment on ${formatSlot(apt)}.`,
        ]);
    });
    res.json({ message: 'Appointment cancelled.' });
};

// ---------- Staff ----------

exports.getStaffAppointments = async (req, res) => {
    const [appointments] = await pool.query(`
        SELECT a.appointment_id, a.reason, a.status, a.created_at, a.student_id,
               t.slot_date, t.start_time, t.end_time,
               st.first_name AS student_first_name, st.last_name AS student_last_name, st.student_number,
               m.record_id
        FROM appointments a
        JOIN time_slots t ON a.slot_id = t.slot_id
        JOIN students st ON a.student_id = st.student_id
        LEFT JOIN medical_records m ON m.appointment_id = a.appointment_id
        WHERE t.staff_id = ?
        ORDER BY t.slot_date, t.start_time
    `, [req.staff.staff_id]);
    res.json(appointments);
};

exports.getStaffSlots = async (req, res) => {
    const [slots] = await pool.query(`
        SELECT t.slot_id, t.slot_date, t.start_time, t.end_time
        FROM time_slots t
        WHERE t.staff_id = ? AND t.is_booked = FALSE AND ${UPCOMING}
        ORDER BY t.slot_date, t.start_time
    `, [req.staff.staff_id]);
    res.json(slots);
};

exports.createTimeSlot = async (req, res) => {
    const { slotDate, startTime, endTime } = req.body;
    if (endTime <= startTime) throw new HttpError(400, 'End time must be after start time.');
    const today = new Date().toISOString().slice(0, 10);
    if (slotDate < today) throw new HttpError(400, 'You cannot add a slot in the past.');

    try {
        await pool.query(
            'INSERT INTO time_slots (staff_id, slot_date, start_time, end_time) VALUES (?, ?, ?, ?)',
            [req.staff.staff_id, slotDate, startTime, endTime]
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You already have a slot at that time.');
        throw err;
    }
    res.status(201).json({ message: 'Time slot added.' });
};

exports.deleteTimeSlot = async (req, res) => {
    const [result] = await pool.query(
        'DELETE FROM time_slots WHERE slot_id = ? AND staff_id = ? AND is_booked = FALSE',
        [req.params.id, req.staff.staff_id]
    );
    if (!result.affectedRows) throw new HttpError(404, 'Open slot not found.');
    res.json({ message: 'Time slot removed.' });
};

// Loads an appointment that belongs to the calling staff member, locked for update.
async function loadOwnAppointment(conn, appointmentId, staffId) {
    const [rows] = await conn.query(
        `SELECT a.appointment_id, a.status, st.user_id AS student_user_id, t.slot_date, t.start_time
         FROM appointments a
         JOIN time_slots t ON a.slot_id = t.slot_id
         JOIN students st ON a.student_id = st.student_id
         WHERE a.appointment_id = ? AND t.staff_id = ? FOR UPDATE`,
        [appointmentId, staffId]
    );
    if (!rows[0]) throw new HttpError(404, 'Appointment not found.');
    return rows[0];
}

exports.confirmByStaff = async (req, res) => {
    await withTransaction(pool, async (conn) => {
        const apt = await loadOwnAppointment(conn, req.params.id, req.staff.staff_id);
        if (apt.status !== 'pending') throw new HttpError(409, `This appointment is already ${apt.status}.`);
        await conn.query("UPDATE appointments SET status = 'confirmed' WHERE appointment_id = ?", [apt.appointment_id]);
        await conn.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [
            apt.student_user_id,
            `Your appointment on ${formatSlot(apt)} with Dr. ${req.staff.last_name} is confirmed.`,
        ]);
    });
    res.json({ message: 'Appointment confirmed and student notified.' });
};

exports.cancelByStaff = async (req, res) => {
    await withTransaction(pool, async (conn) => {
        const apt = await loadOwnAppointment(conn, req.params.id, req.staff.staff_id);
        if (!['pending', 'confirmed'].includes(apt.status)) {
            throw new HttpError(409, `This appointment is already ${apt.status}.`);
        }
        await conn.query("UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?", [apt.appointment_id]);
        // The slot stays booked: the staff member is unavailable at that time.
        await conn.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [
            apt.student_user_id,
            `Your appointment on ${formatSlot(apt)} was cancelled by Dr. ${req.staff.last_name}. Please book another slot.`,
        ]);
    });
    res.json({ message: 'Appointment cancelled and student notified.' });
};
