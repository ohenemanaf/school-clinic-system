const pool = require('../config/db');

exports.getProfile = async (req, res) => {
    const [rows] = await pool.query(`
        SELECT s.student_id, s.student_number, s.first_name, s.last_name, s.dob, s.contact_number,
               u.email, u.profile_picture_url
        FROM students s JOIN users u ON s.user_id = u.user_id
        WHERE s.student_id = ?
    `, [req.student.student_id]);
    res.json(rows[0]);
};

exports.updateProfile = async (req, res) => {
    if (!/^[+\d][\d\s-]{5,19}$/.test(req.body.contactNumber)) {
        return res.status(400).json({ message: 'contactNumber must be a valid phone number' });
    }
    await pool.query('UPDATE students SET contact_number = ? WHERE student_id = ?', [
        req.body.contactNumber,
        req.student.student_id,
    ]);
    res.json({ message: 'Profile updated' });
};
