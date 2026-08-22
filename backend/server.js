const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pool = require('./config/db');
const { ensureDefaultAdmin } = require('./services/defaultAdmin');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => {
    res.send('School Clinic API is running');
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await ensureDefaultAdmin();
        return app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
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
