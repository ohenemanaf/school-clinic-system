const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.register = async (req, res) => {
    const { email, password, firstName, lastName, dob, studentNumber } = req.body;
    const role = 'student'; // Force role to student for public registration
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [result] = await connection.query(
                'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                [email, hashedPassword, role]
            );
            const userId = result.insertId;

            await connection.query(
                'INSERT INTO students (user_id, student_number, first_name, last_name, dob) VALUES (?, ?, ?, ?, ?)',
                [userId, studentNumber, firstName, lastName, dob]
            );

            await connection.commit();
            res.status(201).json({ message: 'User registered successfully', userId });
        } catch (err) {
            await connection.rollback();
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'An account with this email or student number already exists.' });
            }
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
        
        const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role, userId: user.user_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};
