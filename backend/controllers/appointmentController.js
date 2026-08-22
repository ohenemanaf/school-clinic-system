const pool = require('../config/db');

exports.getAvailableSlots = async (req, res) => {
    try {
        const [slots] = await pool.query(`
            SELECT t.*, s.first_name as staff_first_name, s.last_name as staff_last_name 
            FROM time_slots t 
            JOIN staff s ON t.staff_id = s.staff_id 
            WHERE t.is_booked = FALSE
            ORDER BY t.slot_date, t.start_time
        `);
        res.json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching slots', error: error.message });
    }
};

exports.bookAppointment = async (req, res) => {
    const userId = req.user.userId;
    const { slotId, reason } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [student] = await connection.query('SELECT student_id FROM students WHERE user_id = ?', [userId]);
            if (student.length === 0) return res.status(403).json({ message: 'Not a student' });
            const studentId = student[0].student_id;

            const [appointment] = await connection.query(
                'INSERT INTO appointments (student_id, slot_id, reason) VALUES (?, ?, ?)',
                [studentId, slotId, reason]
            );
            
            await connection.query(
                'UPDATE time_slots SET is_booked = TRUE WHERE slot_id = ?',
                [slotId]
            );

            await connection.commit();
            res.status(201).json({ message: 'Appointment booked successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error booking appointment', error: error.message });
    }
};

exports.getStaffAppointments = async (req, res) => {
    const userId = req.user.userId;
    try {
        // Find staff id
        const [staff] = await pool.query('SELECT staff_id FROM staff WHERE user_id = ?', [userId]);
        if (staff.length === 0) return res.status(403).json({ message: 'Not a staff member' });
        
        const staffId = staff[0].staff_id;

        const [appointments] = await pool.query(`
            SELECT a.appointment_id, a.reason, a.status, a.created_at, a.student_id,
                   t.slot_date, t.start_time, t.end_time, t.staff_id,
                   st.first_name as student_first_name, st.last_name as student_last_name, st.student_number
            FROM appointments a
            JOIN time_slots t ON a.slot_id = t.slot_id
            JOIN students st ON a.student_id = st.student_id
            WHERE t.staff_id = ?
            ORDER BY t.slot_date, t.start_time
        `, [staffId]);
        
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff appointments', error: error.message });
    }
};

exports.getStaffSlots = async (req, res) => {
    const userId = req.user.userId;
    try {
        // Find staff id
        const [staff] = await pool.query('SELECT staff_id FROM staff WHERE user_id = ?', [userId]);
        if (staff.length === 0) return res.status(403).json({ message: 'Not a staff member' });
        
        const staffId = staff[0].staff_id;

        const [slots] = await pool.query(`
            SELECT * FROM time_slots 
            WHERE staff_id = ? AND is_booked = FALSE
            ORDER BY slot_date, start_time
        `, [staffId]);
        
        res.json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff slots', error: error.message });
    }
};

exports.createTimeSlot = async (req, res) => {
    const userId = req.user.userId;
    const { slotDate, startTime, endTime } = req.body;
    try {
        // Find staff id
        const [staff] = await pool.query('SELECT staff_id FROM staff WHERE user_id = ?', [userId]);
        if (staff.length === 0) return res.status(403).json({ message: 'Not a staff member' });
        
        const staffId = staff[0].staff_id;

        await pool.query(
            'INSERT INTO time_slots (staff_id, slot_date, start_time, end_time) VALUES (?, ?, ?, ?)',
            [staffId, slotDate, startTime, endTime]
        );

        res.status(201).json({ message: 'Time slot created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'This time slot already exists for you' });
        }
        console.error("Server error creating slot:", error);
        res.status(500).json({ message: 'Error creating time slot', error: error.message });
    }
};

exports.cancelByStaff = async (req, res) => {
    const { id } = req.params; // appointment_id
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Update appointment status
            await connection.query(
                'UPDATE appointments SET status = "cancelled" WHERE appointment_id = ?',
                [id]
            );

            // 2. Fetch the student's user_id and staff info to construct the notification
            const [appointmentData] = await connection.query(`
                SELECT a.student_id, st.user_id as student_user_id, sf.last_name as staff_last_name, t.slot_date, t.start_time
                FROM appointments a
                JOIN students st ON a.student_id = st.student_id
                JOIN time_slots t ON a.slot_id = t.slot_id
                JOIN staff sf ON t.staff_id = sf.staff_id
                WHERE a.appointment_id = ?
            `, [id]);

            if (appointmentData.length > 0) {
                const data = appointmentData[0];
                const dateStr = new Date(data.slot_date).toLocaleDateString();
                const timeStr = data.start_time;
                const message = `Your appointment on ${dateStr} at ${timeStr} was cancelled by Dr. ${data.staff_last_name} because they became suddenly busy.`;

                // 3. Insert Notification
                await connection.query(
                    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
                    [data.student_user_id, message]
                );
            }

            // Note: We deliberately do NOT free up the time slot (is_booked stays true) 
            // because the doctor indicated they are busy during this time!

            await connection.commit();
            res.json({ message: 'Appointment cancelled and student notified' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error cancelling appointment', error: error.message });
    }
};
