import { useCallback, useEffect, useRef, useState } from 'react';
import { IconBell, IconLogout, IconStethoscope, IconChecks } from '@tabler/icons-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { relativeTime } from '../utils/format';
import { IconButton } from './ui';

const ROLE_LABEL = { student: 'Student', staff: 'Clinic staff', admin: 'Administrator' };
const POLL_MS = 30000;

function Notifications() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/notifications/me');
            setItems(res.data);
        } catch {
            /* the badge just stays stale; not worth interrupting the user */
        }
    }, []);

    // Poll only while the tab is visible.
    useEffect(() => {
        load();
        const tick = () => document.visibilityState === 'visible' && load();
        const id = setInterval(tick, POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [load]);

    useEffect(() => {
        if (!open) return;
        const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const unread = items.filter((n) => !n.is_read).length;

    const markRead = async (n) => {
        if (n.is_read) return;
        setItems((list) => list.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: 1 } : x)));
        await api.put(`/notifications/${n.notification_id}/read`).catch(() => {});
    };

    const markAll = async () => {
        setItems((list) => list.map((x) => ({ ...x, is_read: 1 })));
        await api.put('/notifications/read-all').catch(() => {});
    };

    return (
        <div className="relative" ref={ref}>
            <IconButton label={`Notifications${unread ? ` (${unread} unread)` : ''}`} onClick={() => setOpen((o) => !o)}>
                <IconBell size={18} />
                {unread > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </IconButton>
            {open && (
                <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                        <span className="text-xs font-semibold text-slate-800">Notifications</span>
                        {unread > 0 && (
                            <button onClick={markAll} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <IconChecks size={14} /> Mark all read
                            </button>
                        )}
                    </div>
                    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {items.length === 0 && <li className="px-3 py-8 text-center text-xs text-slate-500">You're all caught up.</li>}
                        {items.map((n) => (
                            <li key={n.notification_id}>
                                <button
                                    onClick={() => markRead(n)}
                                    className={`flex w-full gap-2 px-3 py-2.5 text-left hover:bg-slate-50 ${n.is_read ? 'opacity-60' : ''}`}
                                >
                                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
                                    <span>
                                        <span className="block text-xs leading-relaxed text-slate-700">{n.message}</span>
                                        <span className="mt-0.5 block text-[11px] text-slate-400">{relativeTime(n.created_at)}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default function AppShell({ title, subtitle, actions, children }) {
    const { user, logout } = useAuth();
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
                    <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">
                            <IconStethoscope size={18} />
                        </div>
                        <div className="leading-tight">
                            <p className="text-sm font-semibold text-slate-900">Campus Clinic</p>
                            <p className="text-[11px] text-slate-500">{ROLE_LABEL[user?.role]}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Notifications />
                        <IconButton label="Log out" onClick={logout} className="hover:text-red-600">
                            <IconLogout size={18} />
                        </IconButton>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
                        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    {actions && <div className="self-start sm:self-auto">{actions}</div>}
                </div>
                {children}
            </main>
        </div>
    );
}
