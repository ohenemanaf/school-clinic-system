const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clinic.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

async function findDefaultAdmin() {
    const [users] = await pool.query(
        'SELECT user_id, role FROM users WHERE email = ? LIMIT 1',
        [DEFAULT_ADMIN_EMAIL]
    );

    return users[0];
}

async function ensureDefaultAdmin() {
    const existingUser = await findDefaultAdmin();

    if (existingUser) {
        if (existingUser.role !== 'admin') {
            throw new Error(
                `The default admin email (${DEFAULT_ADMIN_EMAIL}) is already assigned to a non-admin account.`
            );
        }

        console.log(`Default admin already exists: ${DEFAULT_ADMIN_EMAIL}`);
        return { created: false, userId: existingUser.user_id };
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    try {
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
            [DEFAULT_ADMIN_EMAIL, hashedPassword, 'admin']
        );

        console.log(`Default admin created: ${DEFAULT_ADMIN_EMAIL}`);
        return { created: true, userId: result.insertId };
    } catch (error) {
        // Another server instance may have created the account between the
        // initial lookup and insert. Treat that as a successful initialization.
        if (error.code === 'ER_DUP_ENTRY') {
            const concurrentlyCreatedUser = await findDefaultAdmin();
            if (concurrentlyCreatedUser?.role === 'admin') {
                console.log(`Default admin already exists: ${DEFAULT_ADMIN_EMAIL}`);
                return { created: false, userId: concurrentlyCreatedUser.user_id };
            }
        }

        throw error;
    }
}

module.exports = {
    DEFAULT_ADMIN_EMAIL,
    ensureDefaultAdmin
};
