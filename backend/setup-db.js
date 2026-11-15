// Creates all tables in DB_NAME from schema.sql. Safe to re-run (CREATE TABLE IF NOT EXISTS).
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

// Upgrades for databases created by older versions of schema.sql.
async function migrate() {
    const [cols] = await pool.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'active_slot_id'`
    );
    if (!cols.length) {
        // Old schema had UNIQUE(slot_id), which blocked re-booking a slot after a cancellation.
        await pool.query(`ALTER TABLE appointments
            ADD KEY idx_appointments_slot (slot_id),
            DROP INDEX slot_id,
            ADD COLUMN active_slot_id INT GENERATED ALWAYS AS (IF(status = 'cancelled', NULL, slot_id)) STORED,
            ADD UNIQUE KEY uq_active_slot (active_slot_id)`);
        console.log('Migrated appointments: slots can be re-booked after cancellation.');
    }
}

async function setupDatabase() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = sql
        .split(/;\s*$/m)
        .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
        .filter(Boolean);

    for (const statement of statements) await pool.query(statement);
    await migrate();
    console.log(`Schema applied to database "${process.env.DB_NAME || 'schoolclinic_db'}" (${statements.length} statements).`);
}

if (require.main === module) {
    setupDatabase()
        .catch((err) => {
            console.error('Schema setup failed:', err.message);
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}

module.exports = { setupDatabase };
