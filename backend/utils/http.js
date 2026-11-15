// Shared HTTP helpers. Internal error details are logged, never sent to clients.

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Runs `work(connection)` inside a transaction, always releasing the connection.
async function withTransaction(pool, work) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

// Express 5 forwards rejected async handlers to the error handler, so no wrapper is needed.
module.exports = { HttpError, withTransaction };
