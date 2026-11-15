const pool = require('../config/db');
const { HttpError } = require('../utils/http');

exports.getNotifications = async (req, res) => {
    const [notifications] = await pool.query(
        'SELECT notification_id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.userId]
    );
    res.json(notifications);
};

exports.markAsRead = async (req, res) => {
    // user_id in the WHERE clause: users can only touch their own notifications.
    const [result] = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
        [req.params.id, req.user.userId]
    );
    if (!result.affectedRows) throw new HttpError(404, 'Notification not found.');
    res.json({ message: 'Notification marked as read' });
};

exports.markAllAsRead = async (req, res) => {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.userId]);
    res.json({ message: 'All notifications marked as read' });
};
