const pool = require('../config/db');

exports.updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { contactNumber } = req.body;
    
    try {
        await pool.query(
            'UPDATE students SET contact_number = ? WHERE user_id = ?',
            [contactNumber, userId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    const userId = req.user.userId;
    try {
        const [student] = await pool.query(`
            SELECT s.*, u.email, u.profile_picture_url 
            FROM students s 
            JOIN users u ON s.user_id = u.user_id 
            WHERE s.user_id = ?
        `, [userId]);
        
        if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
        
        res.json(student[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};
