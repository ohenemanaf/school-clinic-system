const pool = require('./config/db');
const { DEFAULT_ADMIN_EMAIL, ensureDefaultAdmin } = require('./services/defaultAdmin');

async function seedAdmin() {
    try {
        const result = await ensureDefaultAdmin();
        console.log(
            result.created
                ? `Admin seeded successfully: ${DEFAULT_ADMIN_EMAIL}`
                : 'No changes were needed.'
        );
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedAdmin();
