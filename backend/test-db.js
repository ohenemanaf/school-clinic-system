const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });
const fs = require('fs');

async function testConnection() {
    try {
        console.log("Connecting to MySQL...");
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });
        console.log("Connected successfully to MySQL instance.");
        
        const databaseName = process.env.DB_NAME || 'schoolclinic_db';
        const [rows] = await connection.query('SHOW DATABASES LIKE ?', [databaseName]);
        if (rows.length === 0) {
            console.log(`Database '${databaseName}' does not exist. The schema script was likely not run.`);
        } else {
            console.log(`Database '${databaseName}' exists.`);
            await connection.query(`USE \`${databaseName.replace(/`/g, '``')}\``);
            const [tables] = await connection.query("SHOW TABLES");
            console.log(`Tables in ${databaseName}:`, tables);
        }
        await connection.end();
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}
testConnection();
