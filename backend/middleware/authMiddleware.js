const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Please log in to continue.' });
    }
    try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    } catch {
        return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    }
};

const verifyRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'You do not have permission to do that.' });
    }
    next();
};

// Resolves the caller's staff_id / student_id once, so controllers never trust ids from the client.
const loadStaff = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT staff_id, last_name FROM staff WHERE user_id = ?', [req.user.userId]);
        if (!rows.length) return res.status(403).json({ message: 'No staff profile for this account.' });
        req.staff = rows[0];
        next();
    } catch (err) {
        next(err);
    }
};

const loadStudent = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [req.user.userId]);
        if (!rows.length) return res.status(403).json({ message: 'No student profile for this account.' });
        req.student = rows[0];
        next();
    } catch (err) {
        next(err);
    }
};

const staffOnly = [verifyToken, verifyRole(['staff']), loadStaff];
const studentOnly = [verifyToken, verifyRole(['student']), loadStudent];
const adminOnly = [verifyToken, verifyRole(['admin'])];

module.exports = { verifyToken, verifyRole, loadStaff, loadStudent, staffOnly, studentOnly, adminOnly };
