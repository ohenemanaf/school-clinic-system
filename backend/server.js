const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
require('dotenv').config({ quiet: true });

const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pool = require('./config/db');
const { ensureDefaultAdmin } = require('./services/defaultAdmin');
const { HttpError } = require('./utils/http');

const app = express();

// Render, Railway etc. sit behind one proxy; needed for correct client IPs in rate limiting.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(helmet());
app.use(cors({
    origin(origin, cb) {
        // Allow non-browser clients (no Origin header) and configured origins only.
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
    },
}));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.send('School Clinic API is running'));
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch {
        res.status(503).json({ status: 'db_unavailable' });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Central error handler: log details server-side, send a safe message to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
    if (err instanceof multer.MulterError) return res.status(400).json({ message: err.message });
    // HttpError messages are written for users (also the upload filter's 400).
    if (err instanceof HttpError || (err.status >= 400 && err.status < 500)) {
        return res.status(err.status).json({ message: err.message });
    }
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        console.error('JWT_SECRET must be set and at least 32 characters long.');
        process.exitCode = 1;
        return null;
    }
    try {
        await ensureDefaultAdmin();
        return app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Unable to initialize the default admin:', error);
        await pool.end();
        process.exitCode = 1;
        return null;
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
