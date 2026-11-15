import { useCallback, useEffect, useState } from 'react';
import { IconUserPlus, IconUsers, IconStethoscope, IconCalendarEvent, IconClockHour4 } from '@tabler/icons-react';
import api from '../utils/api';
import AppShell from '../components/AppShell';
import { Button, Card, EmptyState, Field, Input, Modal, Segmented, Spinner, StatusPill, useToast, errorMessage } from '../components/ui';
import { formatDate, parseDate } from '../utils/format';

// Order chosen so neighbours stay distinguishable for colour-blind readers (validated);
// every segment also carries a text label + count, so colour is never the only cue.
const STATUS_ORDER = [
    { key: 'completed', label: 'Completed', color: '#059669' },
    { key: 'confirmed', label: 'Confirmed', color: '#2563eb' },
    { key: 'pending', label: 'Pending', color: '#f59e0b' },
    { key: 'cancelled', label: 'Cancelled', color: '#94a3b8' },
];

function Stat({ icon: Icon, label, value, note }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Icon size={15} className="text-slate-400" /> {label}
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
            {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
        </div>
    );
}

function StatusBreakdown({ appointments }) {
    const total = appointments.total;
    if (!total) return <EmptyState icon={IconCalendarEvent} title="No appointments yet" />;
    return (
        <div>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Appointments by status">
                {STATUS_ORDER.filter((s) => appointments[s.key] > 0).map((s) => (
                    <div
                        key={s.key}
                        title={`${s.label}: ${appointments[s.key]}`}
                        style={{ width: `${(appointments[s.key] / total) * 100}%`, background: s.color }}
                        className="first:rounded-l-full last:rounded-r-full"
                    />
                ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {STATUS_ORDER.map((s) => (
                    <li key={s.key} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
                        </span>
                        <span className="tabular-nums text-slate-900">
                            {appointments[s.key]} <span className="text-slate-400">· {Math.round((appointments[s.key] / total) * 100)}%</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Visits per day for the past week and the coming week (by slot date). Zero days are drawn
// as a hairline so gaps stay visible; a divider marks today.
function DailyBars({ daily }) {
    const byDay = Object.fromEntries(daily.map((d) => [d.day, d.count]));
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i - 6);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { iso, count: byDay[iso] || 0, today: i === 6, future: i > 6 };
    });
    const max = Math.max(1, ...days.map((d) => d.count));
    const past = days.filter((d) => !d.future).reduce((n, d) => n + d.count, 0);
    const ahead = days.filter((d) => d.future).reduce((n, d) => n + d.count, 0);

    return (
        <div>
            <div className="mb-3 flex gap-6 text-xs text-slate-500">
                <p><span className="text-lg font-semibold tabular-nums text-slate-900">{past}</span> past 7 days</p>
                <p><span className="text-lg font-semibold tabular-nums text-slate-900">{ahead}</span> booked ahead</p>
            </div>
            <div className="flex h-28 items-end gap-0.5 border-b border-slate-200" role="img" aria-label={`Visits per day: ${past} in the past week, ${ahead} booked for the coming week`}>
                {days.map((d) => (
                    <div key={d.iso} className={`group relative flex h-full flex-1 items-end ${d.today ? 'border-l border-dashed border-slate-300 pl-0.5' : ''}`}>
                        <div
                            className={`w-full rounded-t-[4px] transition-colors ${d.future ? 'bg-blue-300 group-hover:bg-blue-400' : 'bg-blue-600 group-hover:bg-blue-700'}`}
                            style={{ height: d.count ? `${(d.count / max) * 100}%` : '2px', opacity: d.count ? 1 : 0.2 }}
                        />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100">
                            {formatDate(d.iso)}: {d.count} {d.future ? 'booked' : 'visits'}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-1 grid grid-cols-[6fr_1fr_7fr] text-[11px] text-slate-400">
                <span>{formatDate(days[0].iso, { day: 'numeric', month: 'short' })}</span>
                <span className="text-center font-medium text-slate-600">Today</span>
                <span className="text-right">{formatDate(days[13].iso, { day: 'numeric', month: 'short' })}</span>
            </div>
        </div>
    );
}

const EMPTY_STAFF = { firstName: '', lastName: '', email: '', password: '', specialization: '', roomNumber: '' };

function AddStaffModal({ open, onClose, onDone }) {
    const toast = useToast();
    const [form, setForm] = useState(EMPTY_STAFF);
    const [busy, setBusy] = useState(false);
    const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    useEffect(() => {
        if (open) setForm(EMPTY_STAFF);
    }, [open]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post('/admin/staff', form);
            toast(`${form.firstName} ${form.lastName} can now sign in`);
            onDone();
            onClose();
        } catch (err) {
            toast(errorMessage(err, 'Could not add staff member'), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Add staff member" description="They sign in with this email and temporary password.">
            <form onSubmit={submit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="First name"><Input name="firstName" required value={form.firstName} onChange={set} /></Field>
                    <Field label="Last name"><Input name="lastName" required value={form.lastName} onChange={set} /></Field>
                </div>
                <Field label="Email"><Input type="email" name="email" required value={form.email} onChange={set} /></Field>
                <Field label="Temporary password" hint="At least 8 characters. Share it with them privately.">
                    <Input type="text" name="password" required minLength={8} autoComplete="off" value={form.password} onChange={set} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Specialization"><Input name="specialization" placeholder="General physician" value={form.specialization} onChange={set} /></Field>
                    <Field label="Room"><Input name="roomNumber" placeholder="Room 102" value={form.roomNumber} onChange={set} /></Field>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={busy}>Add staff</Button>
                </div>
            </form>
        </Modal>
    );
}

const AdminDashboard = () => {
    const toast = useToast();
    const [stats, setStats] = useState(null);
    const [staff, setStaff] = useState([]);
    const [tab, setTab] = useState('activity');
    const [showAdd, setShowAdd] = useState(false);

    const load = useCallback(async () => {
        try {
            const [s, st] = await Promise.all([api.get('/admin/stats'), api.get('/admin/staff')]);
            setStats(s.data);
            setStaff(st.data);
        } catch (err) {
            toast(errorMessage(err, 'Could not load statistics'), 'error');
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <AppShell
            title="Clinic overview"
            subtitle="Usage across students, staff and appointments."
            actions={<Button onClick={() => setShowAdd(true)}><IconUserPlus size={16} /> Add staff</Button>}
        >
            {!stats ? (
                <Spinner />
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat icon={IconUsers} label="Students" value={stats.students} />
                        <Stat icon={IconStethoscope} label="Staff" value={stats.staff} />
                        <Stat icon={IconCalendarEvent} label="Appointments" value={stats.appointments.total} />
                        <Stat
                            icon={IconClockHour4}
                            label="Awaiting confirmation"
                            value={stats.appointments.pending}
                            note={stats.appointments.pending ? 'Pending staff review' : 'All caught up'}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card title="Visits per day"><DailyBars daily={stats.daily} /></Card>
                        <Card title="Appointments by status"><StatusBreakdown appointments={stats.appointments} /></Card>
                    </div>

                    <Card
                        title={
                            <Segmented
                                value={tab}
                                onChange={setTab}
                                options={[
                                    { value: 'activity', label: 'Recent activity' },
                                    { value: 'staff', label: `Staff (${staff.length})` },
                                ]}
                            />
                        }
                        bodyClassName="p-0"
                    >
                        <div className="overflow-x-auto">
                            {tab === 'activity' ? (
                                stats.recentAppointments.length === 0 ? (
                                    <EmptyState icon={IconCalendarEvent} title="No activity yet" />
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs text-slate-500">
                                            <tr className="border-b border-slate-100">
                                                <th className="px-4 py-2 font-medium">Visit date</th>
                                                <th className="px-4 py-2 font-medium">Student</th>
                                                <th className="px-4 py-2 font-medium">Doctor</th>
                                                <th className="px-4 py-2 text-right font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {stats.recentAppointments.map((a) => (
                                                <tr key={a.appointment_id} className="hover:bg-slate-50">
                                                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(a.slot_date)}</td>
                                                    <td className="px-4 py-2.5 text-slate-900">{a.student_first} {a.student_last}</td>
                                                    <td className="px-4 py-2.5 text-slate-600">Dr. {a.staff_last}</td>
                                                    <td className="px-4 py-2.5 text-right"><StatusPill status={a.status} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : staff.length === 0 ? (
                                <EmptyState icon={IconStethoscope} title="No staff yet">Add a doctor or nurse so students can book.</EmptyState>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs text-slate-500">
                                        <tr className="border-b border-slate-100">
                                            <th className="px-4 py-2 font-medium">Name</th>
                                            <th className="px-4 py-2 font-medium">Specialization</th>
                                            <th className="px-4 py-2 font-medium">Room</th>
                                            <th className="px-4 py-2 font-medium">Email</th>
                                            <th className="px-4 py-2 text-right font-medium">Added</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {staff.map((s) => (
                                            <tr key={s.staff_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2.5 text-slate-900">{s.first_name} {s.last_name}</td>
                                                <td className="px-4 py-2.5 text-slate-600">{s.specialization || '—'}</td>
                                                <td className="px-4 py-2.5 text-slate-600">{s.room_number || '—'}</td>
                                                <td className="px-4 py-2.5 text-slate-600">{s.email}</td>
                                                <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500">
                                                    {parseDate(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                </div>
            )}
            <AddStaffModal open={showAdd} onClose={() => setShowAdd(false)} onDone={load} />
        </AppShell>
    );
};

export default AdminDashboard;
