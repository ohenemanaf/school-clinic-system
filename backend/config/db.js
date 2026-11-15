const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

// Managed MySQL (Aiven, TiDB, PlanetScale...) requires TLS. Provide the provider's CA
// certificate as DB_SSL_CA (PEM text; literal "\n" sequences are accepted) to verify it.
function sslConfig() {
    if (process.env.DB_SSL_CA) {
        return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    }
    if (process.env.DB_SSL === 'true') return { rejectUnauthorized: true };
    return undefined;
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schoolclinic_db',
    ssl: sslConfig(),
    dateStrings: ['DATE'],
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
    queueLimit: 0,
});

module.exports = pool;
