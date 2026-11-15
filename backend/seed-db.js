// Demo data for local development and the public demo: one doctor and a few open slots.
// Passwords come from env (SEED_STAFF_PASSWORD) or are generated and printed once.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const STAFF_EMAIL = process.env.SEED_STAFF_EMAIL || 'doctor@clinic.test';

function isoDate(daysFromNow) {
    const d = new Date(Date.now() + daysFromNow * 86400000);
    return d.toISOString().slice(0, 10);
}

async function seedDatabase() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
        throw new Error('Refusing to seed in production. Set ALLOW_SEED=true to override.');
    }

    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [STAFF_EMAIL]);
    if (existing.length) {
        console.log(`Demo staff ${STAFF_EMAIL} already exists; nothing to do.`);
        return;
    }

    const password = process.env.SEED_STAFF_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const [userRes] = await pool.query(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'staff')",
        [STAFF_EMAIL, await bcrypt.hash(password, 10)]
    );
    const [staffRes] = await pool.query(
        "INSERT INTO staff (user_id, first_name, last_name, specialization, room_number) VALUES (?, 'John', 'Smith', 'General Physician', 'Room 101')",
        [userRes.insertId]
    );

    const slots = [
        [1, '09:00', '09:30'], [1, '10:00', '10:30'],
        [2, '11:00', '11:30'], [2, '14:00', '14:30'],
        [3, '09:00', '09:30'],
    ];
    for (const [day, start, end] of slots) {
        await pool.query(
            'INSERT INTO time_slots (staff_id, slot_date, start_time, end_time) VALUES (?, ?, ?, ?)',
            [staffRes.insertId, isoDate(day), start, end]
        );
    }

    console.log(`Demo staff created: ${STAFF_EMAIL}`);
    if (!process.env.SEED_STAFF_PASSWORD) console.log(`Generated password (shown once): ${password}`);
}

seedDatabase()
    .catch((err) => {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
