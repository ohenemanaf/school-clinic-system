const pool = require('../config/db');
const { HttpError, withTransaction } = require('../utils/http');

const MAX_ITEMS = 10;
const ITEM_FIELDS = { medicineName: 255, dosage: 100, frequency: 100, duration: 100, instructions: 1000 };

// Validates the optional prescriptions list: [{ medicineName, dosage?, frequency?, duration?, instructions? }]
function cleanPrescriptions(items) {
    if (items === undefined || items === null) return [];
    if (!Array.isArray(items)) throw new HttpError(400, 'prescriptions must be a list');
    if (items.length > MAX_ITEMS) throw new HttpError(400, `At most ${MAX_ITEMS} medicines per record`);
    return items.map((item, i) => {
        const clean = {};
        for (const [field, max] of Object.entries(ITEM_FIELDS)) {
            const v = item?.[field];
            if (v === undefined || v === null || v === '') continue;
            if (typeof v !== 'string' || v.trim().length > max) {
                throw new HttpError(400, `Medicine ${i + 1}: ${field} must be text up to ${max} characters`);
            }
            clean[field] = v.trim();
        }
        if (!clean.medicineName) throw new HttpError(400, `Medicine ${i + 1}: medicine name is required`);
        return clean;
    });
}

const RECORD_SELECT = `
    SELECT m.record_id, m.appointment_id, m.student_id, m.diagnosis, m.notes,
           m.prescription AS legacy_prescription, m.created_at, t.slot_date,
           s.first_name AS staff_first_name, s.last_name AS staff_last_name, s.specialization, s.room_number,
           st.first_name AS student_first_name, st.last_name AS student_last_name, st.student_number, st.dob
    FROM medical_records m
    JOIN appointments a ON m.appointment_id = a.appointment_id
    JOIN time_slots t ON a.slot_id = t.slot_id
    JOIN staff s ON t.staff_id = s.staff_id
    JOIN students st ON m.student_id = st.student_id`;

async function attachPrescriptions(records) {
    if (!records.length) return records;
    const [items] = await pool.query(
        `SELECT prescription_id, record_id, medicine_name, dosage, frequency, duration, instructions
         FROM prescriptions WHERE record_id IN (?) ORDER BY prescription_id`,
        [records.map((r) => r.record_id)]
    );
    for (const r of records) r.prescriptions = items.filter((p) => p.record_id === r.record_id);
    return records;
}

// Staff completes one of THEIR appointments: record + prescriptions, appointment -> completed.
exports.createRecord = async (req, res) => {
    const { appointmentId, diagnosis, notes = null } = req.body;
    const prescriptions = cleanPrescriptions(req.body.prescriptions);

    const recordId = await withTransaction(pool, async (conn) => {
        const [rows] = await conn.query(
            `SELECT a.appointment_id, a.student_id, a.status, st.user_id AS student_user_id
             FROM appointments a
             JOIN time_slots t ON a.slot_id = t.slot_id
             JOIN students st ON a.student_id = st.student_id
             WHERE a.appointment_id = ? AND t.staff_id = ? FOR UPDATE`,
            [appointmentId, req.staff.staff_id]
        );
        const apt = rows[0];
        if (!apt) throw new HttpError(404, 'Appointment not found.');
        if (!['pending', 'confirmed'].includes(apt.status)) {
            throw new HttpError(409, `This appointment is already ${apt.status}.`);
        }

        const [record] = await conn.query(
            'INSERT INTO medical_records (appointment_id, student_id, diagnosis, notes) VALUES (?, ?, ?, ?)',
            [apt.appointment_id, apt.student_id, diagnosis, notes]
        );
        for (const p of prescriptions) {
            await conn.query(
                `INSERT INTO prescriptions (record_id, medicine_name, dosage, frequency, duration, instructions)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [record.insertId, p.medicineName, p.dosage ?? null, p.frequency ?? null, p.duration ?? null, p.instructions ?? null]
            );
        }
        await conn.query("UPDATE appointments SET status = 'completed' WHERE appointment_id = ?", [apt.appointment_id]);
        await conn.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [
            apt.student_user_id,
            prescriptions.length
                ? 'Your visit notes and prescription are ready in Medical History.'
                : 'Your visit notes are ready in Medical History.',
        ]);
        return record.insertId;
    });

    res.status(201).json({ message: 'Visit completed and record saved.', recordId });
};

// Student: own history.
exports.getMyRecords = async (req, res) => {
    const [records] = await pool.query(`${RECORD_SELECT} WHERE m.student_id = ? ORDER BY m.created_at DESC`, [
        req.student.student_id,
    ]);
    res.json(await attachPrescriptions(records));
};

// Staff: a student's history, to inform the current visit.
exports.getStudentRecords = async (req, res) => {
    const [records] = await pool.query(`${RECORD_SELECT} WHERE m.student_id = ? ORDER BY m.created_at DESC`, [
        req.params.studentId,
    ]);
    res.json(await attachPrescriptions(records));
};

// One record (used by the printable prescription). Students may only open their own.
exports.getRecord = async (req, res) => {
    const params = [req.params.id];
    let where = 'WHERE m.record_id = ?';
    if (req.user.role === 'student') {
        where += ' AND st.user_id = ?';
        params.push(req.user.userId);
    }
    const [records] = await pool.query(`${RECORD_SELECT} ${where}`, params);
    if (!records.length) throw new HttpError(404, 'Record not found.');
    const [record] = await attachPrescriptions(records);
    res.json(record);
};
