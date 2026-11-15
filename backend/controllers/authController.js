const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { HttpError, withTransaction } = require('../utils/http');

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '2h';

exports.register = async (req, res) => {
    const { email, password, firstName, lastName, dob, studentNumber } = req.body;
    if (new Date(dob) >= new Date()) throw new HttpError(400, 'dob must be in the past');

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const userId = await withTransaction(pool, async (conn) => {
            const [result] = await conn.query(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')",
                [email.toLowerCase(), hashedPassword]
            );
            await conn.query(
                'INSERT INTO students (user_id, student_number, first_name, last_name, dob) VALUES (?, ?, ?, ?, ?)',
                [result.insertId, studentNumber, firstName, lastName, dob]
            );
            return result.insertId;
        });
        res.status(201).json({ message: 'Account created. You can now log in.', userId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            throw new HttpError(409, 'An account with this email or student number already exists.');
        }
        throw err;
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const [users] = await pool.query(
        'SELECT user_id, role, password_hash FROM users WHERE email = ?',
        [email.toLowerCase()]
    );
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !isMatch) throw new HttpError(401, 'Invalid email or password');

    const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: TOKEN_TTL,
        algorithm: 'HS256',
    });
    res.json({ token, role: user.role, userId: user.user_id });
};
