import { useCallback, useEffect, useState } from 'react';
import { IconCalendarEvent, IconClock, IconUser, IconFileText, IconCalendarOff, IconSettings, IconMapPin } from '@tabler/icons-react';
import api from '../utils/api';
import AppShell from '../components/AppShell';
import RecordCard from '../components/RecordCard';
import { Button, Card, EmptyState, Field, Input, Modal, Segmented, Spinner, StatusPill, Textarea, useToast, errorMessage } from '../components/ui';
import { formatDate, formatLongDate, formatRange, groupByDate, isToday, parseDate } from '../utils/format';

const isUpcoming = (a) => ['pending', 'confirmed'].includes(a.status) && parseDate(a.slot_date) >= new Date(new Date().toDateString());

function BookTab({ slots, loading, onBook }) {
    if (loading) return <Spinner />;
    if (!slots.length) {
        return (
            <EmptyState icon={IconCalendarOff} title="No open slots right now">
                Clinic staff add new times regularly. Check back later today.
            </EmptyState>
        );
    }
    return (
        <div className="flex flex-col gap-5">
            {groupByDate(slots).map(([date, daySlots]) => (
                <div key={date}>
                    <h3 className="mb-2 text-xs font-medium text-slate-500">
                        {isToday(date) ? 'Today' : formatDate(date)}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {daySlots.map((slot) => (
                            <button
                                key={slot.slot_id}
                                onClick={() => onBook(slot)}
                                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/40"
                            >
                                <span>
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                        <IconClock size={14} className="text-slate-400 group-hover:text-blue-500" />
                                        {formatRange(slot.start_time, slot.end_time)}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                        Dr. {slot.staff_last_name}
                                        {slot.specialization ? ` · ${slot.specialization}` : ''}
                                    </span>
                                </span>
                                <span className="text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">Book</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AppointmentsTab({ appointments, loading, onCancel }) {
    if (loading) return <Spinner />;
    if (!appointments.length) {
        return <EmptyState icon={IconCalendarEvent} title="No appointments yet">Book a slot and it will show up here.</EmptyState>;
    }
    return (
        <ul className="divide-y divide-slate-100">
            {appointments.map((a) => (
                <li key={a.appointment_id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{formatDate(a.slot_date)}</span>
                            <span className="text-xs text-slate-500">{formatRange(a.start_time, a.end_time)}</span>
                            <StatusPill status={a.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                            Dr. {a.staff_last_name}
                            {a.room_number && <> · <IconMapPin size={11} className="inline -mt-0.5" /> {a.room_number}</>} · {a.reason}
                        </p>
                    </div>
                    {isUpcoming(a) && (
                        <Button variant="danger" size="sm" onClick={() => onCancel(a)}>Cancel</Button>
                    )}
                </li>
            ))}
        </ul>
    );
}

function ProfileModal({ open, onClose, profile, onSaved }) {
    const toast = useToast();
    const [contact, setContact] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setContact(profile?.contact_number || '');
            setFile(null);
        }
    }, [open, profile]);

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            if (contact !== (profile?.contact_number || '')) await api.put('/students/me', { contactNumber: contact });
            if (file) {
                const form = new FormData();
                form.append('profilePicture', file);
                await api.post('/upload/profile-picture', form);
            }
            toast('Profile saved');
            onSaved();
            onClose();
        } catch (err) {
            toast(errorMessage(err, 'Could not save your profile'), 'error');
        } finally {
            setBusy(false);
        }
    };

    if (!profile) return null;
    const rows = [
        ['Name', `${profile.first_name} ${profile.last_name}`],
        ['Student number', profile.student_number],
        ['Email', profile.email],
        ['Date of birth', formatLongDate(profile.dob)],
    ];
    return (
        <Modal open={open} onClose={onClose} title="My profile">
            <dl className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-3 py-2 text-xs">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="truncate font-medium text-slate-800">{v}</dd>
                    </div>
                ))}
            </dl>
            <form onSubmit={save} className="flex flex-col gap-3.5">
                <Field label="Phone number" hint="So the clinic can reach you about your visit.">
                    <Input type="tel" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+233 24 000 0000" />
                </Field>
                <Field label="Profile photo" hint="JPG, PNG or WebP, up to 2 MB.">
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setFile(e.target.files[0] || null)}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                </Field>
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={busy}>Save</Button>
                </div>
            </form>
        </Modal>
    );
}

const Dashboard = () => {
    const toast = useToast();
    const [tab, setTab] = useState('book');
    const [slots, setSlots] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [records, setRecords] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [cancelling, setCancelling] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    const load = useCallback(async () => {
        try {
            const [s, a, r, p] = await Promise.all([
                api.get('/appointments/slots'),
                api.get('/appointments/me'),
                api.get('/records/me'),
                api.get('/students/me'),
            ]);
            setSlots(s.data);
            setAppointments(a.data);
            setRecords(r.data);
            setProfile(p.data);
        } catch (err) {
            toast(errorMessage(err, 'Could not load your dashboard'), 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    const confirmBooking = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await api.post('/appointments/book', { slotId: booking.slot_id, reason });
            toast(res.data.message);
            setBooking(null);
            setReason('');
            setTab('appointments');
        } catch (err) {
            toast(errorMessage(err, 'Could not book that slot'), 'error');
        } finally {
            setBusy(false);
            load();
        }
    };

    const confirmCancel = async () => {
        setBusy(true);
        try {
            await api.put(`/appointments/${cancelling.appointment_id}/cancel`);
            toast('Appointment cancelled');
            setCancelling(null);
            load();
        } catch (err) {
            toast(errorMessage(err, 'Could not cancel'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const upcoming = appointments.filter(isUpcoming);
    const next = [...upcoming].sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time))[0];

    return (
        <AppShell
            title={`Hi${profile ? `, ${profile.first_name}` : ''}`}
            subtitle={
                next
                    ? `Next visit: ${formatDate(next.slot_date)}, ${formatRange(next.start_time, next.end_time)} with Dr. ${next.staff_last_name}`
                    : 'Book a visit with the campus clinic.'
            }
            actions={
                <Button variant="secondary" onClick={() => setShowProfile(true)}>
                    {profile?.profile_picture_url ? (
                        <img src={profile.profile_picture_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                        <IconUser size={16} />
                    )}
                    Profile
                    <IconSettings size={14} className="text-slate-400" />
                </Button>
            }
        >
            <Card
                title={
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'book', label: 'Book a visit' },
                            { value: 'appointments', label: 'My appointments', count: upcoming.length },
                            { value: 'history', label: 'Medical history' },
                        ]}
                    />
                }
            >
                {tab === 'book' && <BookTab slots={slots} loading={loading} onBook={setBooking} />}
                {tab === 'appointments' && <AppointmentsTab appointments={appointments} loading={loading} onCancel={setCancelling} />}
                {tab === 'history' &&
                    (loading ? (
                        <Spinner />
                    ) : records.length ? (
                        <div className="flex flex-col gap-3">{records.map((r) => <RecordCard key={r.record_id} record={r} />)}</div>
                    ) : (
                        <EmptyState icon={IconFileText} title="No records yet">
                            After a visit, the doctor's notes and any prescriptions appear here.
                        </EmptyState>
                    ))}
            </Card>

            <Modal
                open={!!booking}
                onClose={() => setBooking(null)}
                title="Book this visit"
                description={booking && `${formatLongDate(booking.slot_date)}, ${formatRange(booking.start_time, booking.end_time)} · Dr. ${booking.staff_last_name}${booking.room_number ? ` · ${booking.room_number}` : ''}`}
            >
                <form onSubmit={confirmBooking} className="flex flex-col gap-3.5">
                    <Field label="Reason for visit" hint="A short note helps the clinic prepare.">
                        <Textarea required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Headache and fever since yesterday" />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setBooking(null)}>Cancel</Button>
                        <Button type="submit" loading={busy}>Book visit</Button>
                    </div>
                </form>
            </Modal>

            <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel this appointment?">
                {cancelling && (
                    <p className="text-sm text-slate-600">
                        {formatLongDate(cancelling.slot_date)}, {formatRange(cancelling.start_time, cancelling.end_time)} with Dr. {cancelling.staff_last_name}.
                        The slot will be released to other students.
                    </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setCancelling(null)}>Keep it</Button>
                    <Button variant="danger" loading={busy} onClick={confirmCancel}>Cancel appointment</Button>
                </div>
            </Modal>

            <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} profile={profile} onSaved={load} />
        </AppShell>
    );
};

export default Dashboard;
