const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// The first admin is created only when both env vars are set. There is no
// built-in fallback password: a hardcoded default would be a public backdoor.
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

async function findDefaultAdmin() {
    const [users] = await pool.query(
        'SELECT user_id, role FROM users WHERE email = ? LIMIT 1',
        [DEFAULT_ADMIN_EMAIL]
    );
    return users[0];
}

async function ensureDefaultAdmin() {
    if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
        console.log('DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD not set; skipping admin bootstrap.');
        return { created: false, skipped: true };
    }
    if (DEFAULT_ADMIN_PASSWORD.length < MIN_ADMIN_PASSWORD_LENGTH) {
        throw new Error(`DEFAULT_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
    }

    const existingUser = await findDefaultAdmin();
    if (existingUser) {
        if (existingUser.role !== 'admin') {
            throw new Error(`The default admin email (${DEFAULT_ADMIN_EMAIL}) belongs to a non-admin account.`);
        }
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
        // Another instance may have created it between the lookup and the insert.
        if (error.code === 'ER_DUP_ENTRY') {
            const concurrent = await findDefaultAdmin();
            if (concurrent?.role === 'admin') return { created: false, userId: concurrent.user_id };
        }
        throw error;
    }
}

module.exports = { DEFAULT_ADMIN_EMAIL, ensureDefaultAdmin };
