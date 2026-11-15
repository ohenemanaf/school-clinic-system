const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { HttpError, withTransaction } = require('../utils/http');

exports.getDashboardStats = async (req, res) => {
    const [[students], [staff], [appointmentStats], [recentAppointments], [daily]] = await Promise.all([
        pool.query('SELECT COUNT(*) AS count FROM students'),
        pool.query('SELECT COUNT(*) AS count FROM staff'),
        pool.query('SELECT status, COUNT(*) AS count FROM appointments GROUP BY status'),
        pool.query(`
            SELECT a.appointment_id, a.status, a.created_at, t.slot_date,
                   st.first_name AS student_first, st.last_name AS student_last,
                   sf.first_name AS staff_first, sf.last_name AS staff_last
            FROM appointments a
            JOIN students st ON a.student_id = st.student_id
            JOIN time_slots t ON a.slot_id = t.slot_id
            JOIN staff sf ON t.staff_id = sf.staff_id
            ORDER BY a.created_at DESC
            LIMIT 8
        `),
        // Appointments per day for the last 14 days (by slot date), for the trend chart.
        pool.query(`
            SELECT DATE_FORMAT(t.slot_date, '%Y-%m-%d') AS day, COUNT(*) AS count
            FROM appointments a JOIN time_slots t ON a.slot_id = t.slot_id
            WHERE t.slot_date BETWEEN CURDATE() - INTERVAL 13 DAY AND CURDATE()
            GROUP BY t.slot_date ORDER BY t.slot_date
        `),
    ]);

    const appointments = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    for (const { status, count } of appointmentStats) {
        appointments[status] = Number(count);
        appointments.total += Number(count);
    }

    res.json({
        students: Number(students[0].count),
        staff: Number(staff[0].count),
        appointments,
        recentAppointments,
        daily: daily.map((d) => ({ day: d.day, count: Number(d.count) })),
    });
};

exports.listStaff = async (req, res) => {
    const [rows] = await pool.query(`
        SELECT s.staff_id, s.first_name, s.last_name, s.specialization, s.room_number, u.email, u.created_at
        FROM staff s JOIN users u ON s.user_id = u.user_id
        ORDER BY s.last_name, s.first_name
    `);
    res.json(rows);
};

exports.addStaff = async (req, res) => {
    const { email, password, firstName, lastName, specialization = null, roomNumber = null } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await withTransaction(pool, async (conn) => {
            const [user] = await conn.query(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'staff')",
                [email.toLowerCase(), hashedPassword]
            );
            await conn.query(
                'INSERT INTO staff (user_id, first_name, last_name, specialization, room_number) VALUES (?, ?, ?, ?, ?)',
                [user.insertId, firstName, lastName, specialization, roomNumber]
            );
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'A user with this email already exists.');
        throw err;
    }
    res.status(201).json({ message: 'Staff member added.' });
};
