import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCalendarEvent, IconCalendarPlus, IconCheck, IconPlus, IconTrash, IconPrinter, IconX, IconClockOff } from '@tabler/icons-react';
import api from '../utils/api';
import AppShell from '../components/AppShell';
import RecordCard from '../components/RecordCard';
import { Button, Card, EmptyState, Field, IconButton, Input, Modal, Segmented, Spinner, StatusPill, Textarea, useToast, errorMessage } from '../components/ui';
import { formatDate, formatLongDate, formatRange, groupByDate, isToday, parseDate, todayIso } from '../utils/format';

const EMPTY_MED = { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' };
const startOfToday = () => new Date(new Date().toDateString());

const FILTERS = {
    today: (a) => isToday(a.slot_date) && a.status !== 'cancelled',
    upcoming: (a) => ['pending', 'confirmed'].includes(a.status) && parseDate(a.slot_date) >= startOfToday(),
    past: (a) => !['pending', 'confirmed'].includes(a.status) || parseDate(a.slot_date) < startOfToday(),
};

function CompleteVisitModal({ appointment, onClose, onDone }) {
    const toast = useToast();
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [meds, setMeds] = useState([]);
    const [history, setHistory] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!appointment) return;
        setDiagnosis('');
        setNotes('');
        setMeds([]);
        setHistory(null);
        api.get(`/records/student/${appointment.student_id}`)
            .then((r) => setHistory(r.data))
            .catch(() => setHistory([]));
    }, [appointment]);

    const setMed = (i, field, value) => setMeds((list) => list.map((m, j) => (j === i ? { ...m, [field]: value } : m)));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await api.post('/records', {
                appointmentId: appointment.appointment_id,
                diagnosis,
                notes,
                prescriptions: meds.filter((m) => m.medicineName.trim()),
            });
            toast(res.data.message);
            onDone();
        } catch (err) {
            toast(errorMessage(err, 'Could not save the record'), 'error');
        } finally {
            setBusy(false);
        }
    };

    if (!appointment) return null;
    return (
        <Modal
            open
            width="max-w-2xl"
            onClose={onClose}
            title={`Complete visit · ${appointment.student_first_name} ${appointment.student_last_name}`}
            description={`${formatLongDate(appointment.slot_date)}, ${formatRange(appointment.start_time, appointment.end_time)} · Reason: ${appointment.reason}`}
        >
            <form onSubmit={submit} className="flex flex-col gap-3.5">
                <Field label="Diagnosis">
                    <Input required maxLength={2000} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                </Field>
                <Field label="Notes (visible to the student)">
                    <Textarea maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Advice, follow-up, rest days…" />
                </Field>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Prescription</span>
                        <Button type="button" variant="secondary" size="sm" disabled={meds.length >= 10} onClick={() => setMeds([...meds, { ...EMPTY_MED }])}>
                            <IconPlus size={14} /> Add medicine
                        </Button>
                    </div>
                    {meds.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-500">
                            No medicines. Add one if this visit needs a prescription.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {meds.map((m, i) => (
                                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                                    <div className="flex gap-2">
                                        <Input aria-label="Medicine" required placeholder="Medicine and strength, e.g. Paracetamol 500mg" value={m.medicineName} onChange={(e) => setMed(i, 'medicineName', e.target.value)} />
                                        <IconButton type="button" label="Remove medicine" onClick={() => setMeds(meds.filter((_, j) => j !== i))}>
                                            <IconX size={16} />
                                        </IconButton>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        <Input aria-label="Dosage" placeholder="Dosage" value={m.dosage} onChange={(e) => setMed(i, 'dosage', e.target.value)} />
                                        <Input aria-label="Frequency" placeholder="Frequency" value={m.frequency} onChange={(e) => setMed(i, 'frequency', e.target.value)} />
                                        <Input aria-label="Duration" placeholder="Duration" value={m.duration} onChange={(e) => setMed(i, 'duration', e.target.value)} />
                                    </div>
                                    <Input className="mt-2" aria-label="Instructions" placeholder="Instructions (optional), e.g. after meals" value={m.instructions} onChange={(e) => setMed(i, 'instructions', e.target.value)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <details className="rounded-lg border border-slate-200 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">
                        Past visits {history ? `(${history.length})` : ''}
                    </summary>
                    <div className="mt-2 flex flex-col gap-2">
                        {!history ? <Spinner /> : history.length ? history.map((r) => <RecordCard key={r.record_id} record={r} />) : (
                            <p className="py-2 text-xs text-slate-500">First visit to the clinic.</p>
                        )}
                    </div>
                </details>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={busy}><IconCheck size={16} /> Complete visit</Button>
                </div>
            </form>
        </Modal>
    );
}

function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function AddSlotModal({ open, onClose, onDone }) {
    const toast = useToast();
    const [slot, setSlot] = useState({ slotDate: todayIso(), startTime: '09:00', endTime: '09:30' });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post('/appointments/staff/slots', slot);
            toast(`Slot added: ${formatDate(slot.slotDate)}, ${formatRange(slot.startTime, slot.endTime)}`);
            // Keep the modal open and move to the next block, so adding a morning of slots is quick.
            const duration = (() => {
                const [sh, sm] = slot.startTime.split(':').map(Number);
                const [eh, em] = slot.endTime.split(':').map(Number);
                return eh * 60 + em - (sh * 60 + sm);
            })();
            setSlot((s) => ({ ...s, startTime: s.endTime, endTime: addMinutes(s.endTime, duration) }));
            onDone();
        } catch (err) {
            toast(errorMessage(err, 'Could not add the slot'), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Add availability" description="Students can book this time once it's added.">
            <form onSubmit={submit} className="flex flex-col gap-3.5">
                <Field label="Date">
                    <Input type="date" required min={todayIso()} value={slot.slotDate} onChange={(e) => setSlot({ ...slot, slotDate: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Start">
                        <Input type="time" required value={slot.startTime} onChange={(e) => setSlot({ ...slot, startTime: e.target.value })} />
                    </Field>
                    <Field label="End">
                        <Input type="time" required value={slot.endTime} onChange={(e) => setSlot({ ...slot, endTime: e.target.value })} />
                    </Field>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-xs text-slate-500">Length</span>
                    {[15, 20, 30, 45, 60].map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setSlot((s) => ({ ...s, endTime: addMinutes(s.startTime, m) }))}
                            className="h-7 rounded-md border border-slate-200 px-2 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700"
                        >
                            {m}m
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>Done</Button>
                    <Button type="submit" loading={busy}>Add slot</Button>
                </div>
            </form>
        </Modal>
    );
}

const StaffDashboard = () => {
    const toast = useToast();
    const [tab, setTab] = useState('appointments');
    const [filter, setFilter] = useState('upcoming');
    const [appointments, setAppointments] = useState([]);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const [a, s] = await Promise.all([api.get('/appointments/staff'), api.get('/appointments/staff/slots')]);
            setAppointments(a.data);
            setSlots(s.data);
        } catch (err) {
            toast(errorMessage(err, 'Could not load your schedule'), 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    const act = async (id, request, success) => {
        setBusyId(id);
        try {
            await request();
            toast(success);
            await load();
        } catch (err) {
            toast(errorMessage(err), 'error');
        } finally {
            setBusyId(null);
        }
    };

    const shown = appointments.filter(FILTERS[filter]);
    if (filter === 'past') shown.reverse();
    const counts = Object.fromEntries(Object.entries(FILTERS).map(([k, f]) => [k, appointments.filter(f).length]));
    const pending = appointments.filter((a) => a.status === 'pending' && FILTERS.upcoming(a)).length;

    return (
        <AppShell
            title="Clinic schedule"
            subtitle={
                loading ? ' ' : `${counts.today} visit${counts.today === 1 ? '' : 's'} today${pending ? ` · ${pending} waiting for confirmation` : ''}`
            }
            actions={<Button onClick={() => setShowAddSlot(true)}><IconCalendarPlus size={16} /> Add availability</Button>}
        >
            <Card
                title={
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'appointments', label: 'Appointments', count: pending },
                            { value: 'slots', label: `Open slots (${slots.length})` },
                        ]}
                    />
                }
                action={
                    tab === 'appointments' && (
                        <Segmented
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { value: 'today', label: 'Today' },
                                { value: 'upcoming', label: 'Upcoming' },
                                { value: 'past', label: 'Past' },
                            ]}
                        />
                    )
                }
            >
                {loading ? (
                    <Spinner />
                ) : tab === 'appointments' ? (
                    shown.length === 0 ? (
                        <EmptyState icon={IconCalendarEvent} title={filter === 'past' ? 'No past visits yet' : 'Nothing scheduled'}>
                            {filter !== 'past' && 'Add availability so students can book you.'}
                        </EmptyState>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {shown.map((a) => {
                                const active = ['pending', 'confirmed'].includes(a.status);
                                return (
                                    <li key={a.appointment_id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                                        <div className="flex min-w-0 gap-3">
                                            <div className="w-24 shrink-0">
                                                <p className="text-sm font-medium text-slate-900">{isToday(a.slot_date) ? 'Today' : formatDate(a.slot_date)}</p>
                                                <p className="text-xs text-slate-500">{formatRange(a.start_time, a.end_time)}</p>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-sm font-medium text-slate-900">
                                                        {a.student_first_name} {a.student_last_name}
                                                    </span>
                                                    <StatusPill status={a.status} />
                                                </div>
                                                <p className="truncate text-xs text-slate-500">{a.student_number} · {a.reason}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-1.5 md:justify-end">
                                            {a.status === 'pending' && (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    loading={busyId === a.appointment_id}
                                                    onClick={() => act(a.appointment_id, () => api.put(`/appointments/${a.appointment_id}/confirm`), 'Confirmed. The student has been notified.')}
                                                >
                                                    Confirm
                                                </Button>
                                            )}
                                            {active && <Button size="sm" onClick={() => setCompleting(a)}>Complete visit</Button>}
                                            {active && <Button variant="ghost" size="sm" onClick={() => setCancelling(a)}>Cancel</Button>}
                                            {a.record_id && (
                                                <Link
                                                    to={`/prescriptions/${a.record_id}`}
                                                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    <IconPrinter size={14} /> Record
                                                </Link>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : slots.length === 0 ? (
                    <EmptyState icon={IconClockOff} title="No open slots">Add availability to let students book you.</EmptyState>
                ) : (
                    <div className="flex flex-col gap-4">
                        {groupByDate(slots).map(([date, daySlots]) => (
                            <div key={date}>
                                <h3 className="mb-2 text-xs font-medium text-slate-500">{isToday(date) ? 'Today' : formatDate(date)}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {daySlots.map((s) => (
                                        <span key={s.slot_id} className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 pl-2.5 pr-1 text-xs font-medium text-emerald-800">
                                            {formatRange(s.start_time, s.end_time)}
                                            <button
                                                aria-label="Remove slot"
                                                disabled={busyId === `slot-${s.slot_id}`}
                                                onClick={() => act(`slot-${s.slot_id}`, () => api.delete(`/appointments/staff/slots/${s.slot_id}`), 'Slot removed')}
                                                className="grid h-6 w-6 place-items-center rounded-md text-emerald-600 hover:bg-emerald-100 hover:text-red-600"
                                            >
                                                <IconTrash size={13} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <CompleteVisitModal appointment={completing} onClose={() => setCompleting(null)} onDone={() => { setCompleting(null); load(); }} />
            <AddSlotModal open={showAddSlot} onClose={() => setShowAddSlot(false)} onDone={load} />

            <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel this appointment?">
                {cancelling && (
                    <p className="text-sm text-slate-600">
                        {cancelling.student_first_name} will be notified. The {formatRange(cancelling.start_time, cancelling.end_time)} slot stays
                        closed, since you're unavailable then.
                    </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setCancelling(null)}>Keep it</Button>
                    <Button
                        variant="danger"
                        loading={busyId === cancelling?.appointment_id}
                        onClick={() =>
                            act(cancelling.appointment_id, () => api.put(`/appointments/${cancelling.appointment_id}/cancel-by-staff`), 'Cancelled. The student has been notified.')
                                .then(() => setCancelling(null))
                        }
                    >
                        Cancel appointment
                    </Button>
                </div>
            </Modal>
        </AppShell>
    );
};

export default StaffDashboard;
