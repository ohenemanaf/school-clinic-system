// Integration tests against a real MySQL. Start one with:
//   docker run -d --name clinic-mysql -e MYSQL_ROOT_PASSWORD=devroot -p 3307:3306 mysql:8.4
// then: npm test   (override with TEST_DB_HOST / TEST_DB_PORT / TEST_DB_USER / TEST_DB_PASSWORD)
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const TEST_DB = 'clinic_test';
Object.assign(process.env, {
    DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1',
    DB_PORT: process.env.TEST_DB_PORT || '3307',
    DB_USER: process.env.TEST_DB_USER || 'root',
    DB_PASSWORD: process.env.TEST_DB_PASSWORD ?? 'devroot',
    DB_NAME: TEST_DB,
    DB_SSL_CA: '',
    JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-chars',
    DEFAULT_ADMIN_EMAIL: 'admin@test.local',
    DEFAULT_ADMIN_PASSWORD: 'admin-password-123',
    AUTH_RATE_LIMIT: '1000',
    AWS_S3_BUCKET_NAME: '',
});

let request, app, pool;
const tokens = {};
const ids = {};

const future = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.token;
}

async function registerStudent(n) {
    const email = `student${n}@test.local`;
    const res = await request(app).post('/api/auth/register').send({
        email, password: 'student-pass-1', firstName: `Stu${n}`, lastName: 'Dent', dob: '2004-05-06', studentNumber: `S00${n}`,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return login(email, 'student-pass-1');
}

async function addStaff(n) {
    const email = `doc${n}@test.local`;
    const res = await request(app).post('/api/admin/staff').set(auth('admin')).send({
        email, password: 'doctor-pass-1', firstName: `Doc${n}`, lastName: `House${n}`, specialization: 'GP', roomNumber: `R${n}`,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return login(email, 'doctor-pass-1');
}

async function addSlot(who, day, start, end) {
    const res = await request(app).post('/api/appointments/staff/slots').set(auth(who)).send({ slotDate: future(day), startTime: start, endTime: end });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const slots = await request(app).get('/api/appointments/staff/slots').set(auth(who));
    return slots.body.find((s) => s.slot_date === future(day) && s.start_time.startsWith(start)).slot_id;
}

async function book(who, slotId) {
    return request(app).post('/api/appointments/book').set(auth(who)).send({ slotId, reason: 'Headache' });
}

async function myAppointment(who, slotDate) {
    const res = await request(app).get('/api/appointments/me').set(auth(who));
    return res.body.find((a) => a.slot_date === slotDate && a.status !== 'cancelled');
}

before(async () => {
    const root = await mysql.createConnection({
        host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    });
    await root.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await root.query(`CREATE DATABASE ${TEST_DB}`);
    await root.end();

    request = require('supertest');
    pool = require('../config/db');
    await require('../setup-db').setupDatabase();
    await require('../services/defaultAdmin').ensureDefaultAdmin();
    ({ app } = require('../server'));

    tokens.admin = await login('admin@test.local', 'admin-password-123');
    tokens.doc1 = await addStaff(1);
    tokens.doc2 = await addStaff(2);
    tokens.stu1 = await registerStudent(1);
    tokens.stu2 = await registerStudent(2);
});

after(async () => {
    await pool?.end();
});

describe('auth', () => {
    test('rejects bad credentials with a generic message', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.local', password: 'wrong-password' });
        assert.equal(res.status, 401);
        assert.equal(res.body.message, 'Invalid email or password');
    });

    test('validates registration input', async () => {
        const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'x' });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /email/);
    });

    test('duplicate registration returns 409, not a 500', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'student1@test.local', password: 'student-pass-1', firstName: 'A', lastName: 'B', dob: '2004-01-01', studentNumber: 'S999',
        });
        assert.equal(res.status, 409);
    });

    test('public registration cannot create staff or admin', async () => {
        await request(app).post('/api/auth/register').send({
            email: 'sneaky@test.local', password: 'sneaky-pass-1', firstName: 'S', lastName: 'N', dob: '2004-01-01', studentNumber: 'S777', role: 'admin',
        });
        const token = await login('sneaky@test.local', 'sneaky-pass-1');
        const res = await request(app).get('/api/admin/stats').set({ Authorization: `Bearer ${token}` });
        assert.equal(res.status, 403);
    });

    test('rejects missing and forged tokens with 401', async () => {
        assert.equal((await request(app).get('/api/appointments/me')).status, 401);
        const forged = await request(app).get('/api/appointments/me').set({ Authorization: 'Bearer abc.def.ghi' });
        assert.equal(forged.status, 401);
    });

    test('server errors never leak internals', async () => {
        const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
        assert.equal(res.status, 400);
        assert.equal(res.body.message, 'Malformed JSON body');
    });
});

describe('role checks', () => {
    test('students cannot write medical records', async () => {
        const res = await request(app).post('/api/records').set(auth('stu1')).send({ appointmentId: 1, diagnosis: 'Self-diagnosed' });
        assert.equal(res.status, 403);
    });

    test('students cannot create slots or cancel as staff', async () => {
        const slot = await request(app).post('/api/appointments/staff/slots').set(auth('stu1')).send({ slotDate: future(5), startTime: '09:00', endTime: '09:30' });
        assert.equal(slot.status, 403);
        const cancel = await request(app).put('/api/appointments/1/cancel-by-staff').set(auth('stu1'));
        assert.equal(cancel.status, 403);
    });

    test('staff and students cannot use admin routes', async () => {
        assert.equal((await request(app).get('/api/admin/stats').set(auth('doc1'))).status, 403);
        assert.equal((await request(app).post('/api/admin/staff').set(auth('stu1')).send({})).status, 403);
    });
});

describe('booking flow', () => {
    test('book -> double-book blocked -> confirm -> complete with prescriptions -> print data', async () => {
        const slotId = await addSlot('doc1', 1, '09:00', '09:30');

        assert.equal((await book('stu1', slotId)).status, 201);
        const second = await book('stu2', slotId);
        assert.equal(second.status, 409);

        const apt = await myAppointment('stu1', future(1));
        assert.equal(apt.status, 'pending');

        // Another doctor can't confirm or complete doc1's appointment.
        assert.equal((await request(app).put(`/api/appointments/${apt.appointment_id}/confirm`).set(auth('doc2'))).status, 404);
        const foreign = await request(app).post('/api/records').set(auth('doc2')).send({ appointmentId: apt.appointment_id, diagnosis: 'x' });
        assert.equal(foreign.status, 404);

        assert.equal((await request(app).put(`/api/appointments/${apt.appointment_id}/confirm`).set(auth('doc1'))).status, 200);

        const rec = await request(app).post('/api/records').set(auth('doc1')).send({
            appointmentId: apt.appointment_id,
            diagnosis: 'Tension headache',
            notes: 'Drink water',
            prescriptions: [
                { medicineName: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3x daily', duration: '3 days' },
                { medicineName: 'ORS', instructions: 'Dissolve in 1L water' },
            ],
        });
        assert.equal(rec.status, 201, JSON.stringify(rec.body));
        ids.recordId = rec.body.recordId;

        // Completing twice is rejected.
        const again = await request(app).post('/api/records').set(auth('doc1')).send({ appointmentId: apt.appointment_id, diagnosis: 'x' });
        assert.equal(again.status, 409);

        const mine = await request(app).get('/api/records/me').set(auth('stu1'));
        assert.equal(mine.body.length, 1);
        assert.equal(mine.body[0].prescriptions.length, 2);

        const print = await request(app).get(`/api/records/${ids.recordId}`).set(auth('stu1'));
        assert.equal(print.status, 200);
        assert.equal(print.body.prescriptions[0].medicine_name, 'Paracetamol 500mg');
    });

    test("a student cannot open another student's record", async () => {
        const res = await request(app).get(`/api/records/${ids.recordId}`).set(auth('stu2'));
        assert.equal(res.status, 404);
    });

    test('prescription items are validated', async () => {
        const slotId = await addSlot('doc1', 2, '10:00', '10:30');
        await book('stu2', slotId);
        const apt = await myAppointment('stu2', future(2));
        const res = await request(app).post('/api/records').set(auth('doc1')).send({
            appointmentId: apt.appointment_id, diagnosis: 'Flu', prescriptions: [{ dosage: '1 tablet' }],
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /medicine name/);
    });

    test('student cancellation re-opens the slot for someone else', async () => {
        const slotId = await addSlot('doc2', 3, '11:00', '11:30');
        assert.equal((await book('stu1', slotId)).status, 201);
        const apt = await myAppointment('stu1', future(3));

        // stu2 cannot cancel stu1's appointment.
        assert.equal((await request(app).put(`/api/appointments/${apt.appointment_id}/cancel`).set(auth('stu2'))).status, 404);

        assert.equal((await request(app).put(`/api/appointments/${apt.appointment_id}/cancel`).set(auth('stu1'))).status, 200);
        assert.equal((await book('stu2', slotId)).status, 201);
    });

    test('staff cancellation keeps the slot closed and notifies the student', async () => {
        const slotId = await addSlot('doc2', 4, '12:00', '12:30');
        await book('stu1', slotId);
        const apt = await myAppointment('stu1', future(4));
        assert.equal((await request(app).put(`/api/appointments/${apt.appointment_id}/cancel-by-staff`).set(auth('doc2'))).status, 200);

        const slots = await request(app).get('/api/appointments/slots').set(auth('stu2'));
        assert.ok(!slots.body.some((s) => s.slot_id === slotId));

        const notes = await request(app).get('/api/notifications/me').set(auth('stu1'));
        assert.ok(notes.body.some((n) => /cancelled by Dr\. House2/.test(n.message)));
    });

    test('slot validation: end after start, not in the past, no duplicates', async () => {
        const post = (body) => request(app).post('/api/appointments/staff/slots').set(auth('doc1')).send(body);
        assert.equal((await post({ slotDate: future(6), startTime: '10:00', endTime: '09:00' })).status, 400);
        assert.equal((await post({ slotDate: '2020-01-01', startTime: '09:00', endTime: '09:30' })).status, 400);
        assert.equal((await post({ slotDate: future(6), startTime: '09:00', endTime: '09:30' })).status, 201);
        assert.equal((await post({ slotDate: future(6), startTime: '09:00', endTime: '09:30' })).status, 409);
    });
});

describe('notifications', () => {
    test("users cannot mark someone else's notification as read", async () => {
        const notes = await request(app).get('/api/notifications/me').set(auth('stu1'));
        const id = notes.body[0].notification_id;
        assert.equal((await request(app).put(`/api/notifications/${id}/read`).set(auth('stu2'))).status, 404);
        assert.equal((await request(app).put(`/api/notifications/${id}/read`).set(auth('stu1'))).status, 200);
    });
});

describe('uploads', () => {
    test('returns 503 instead of a fake URL when storage is not configured', async () => {
        const res = await request(app)
            .post('/api/upload/profile-picture')
            .set(auth('stu1'))
            .attach('profilePicture', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'a.png', contentType: 'image/png' });
        assert.equal(res.status, 503);
    });
});

describe('admin', () => {
    test('stats include counts and the 14-day trend', async () => {
        const res = await request(app).get('/api/admin/stats').set(auth('admin'));
        assert.equal(res.status, 200);
        assert.equal(res.body.staff, 2);
        assert.ok(res.body.appointments.total >= 4);
        assert.ok(Array.isArray(res.body.daily));
    });
});
