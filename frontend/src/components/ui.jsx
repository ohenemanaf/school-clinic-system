import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { IconX, IconLoader2 } from '@tabler/icons-react';

const cx = (...c) => c.filter(Boolean).join(' ');

// ---------- Buttons & inputs ----------

const BUTTON_VARIANTS = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
    success: 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50',
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...props }) {
    return (
        <button
            className={cx(
                'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
                size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
                BUTTON_VARIANTS[variant],
                className
            )}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && <IconLoader2 size={14} className="animate-spin" />}
            {children}
        </button>
    );
}

export function IconButton({ label, className, children, ...props }) {
    return (
        <button
            aria-label={label}
            title={label}
            className={cx('relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800', className)}
            {...props}
        >
            {children}
        </button>
    );
}

const fieldClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15';

export function Field({ label, hint, children, className }) {
    return (
        <label className={cx('block', className)}>
            <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
        </label>
    );
}

export const Input = ({ className, ...props }) => <input className={cx(fieldClass, 'h-9', className)} {...props} />;
export const Textarea = ({ className, ...props }) => <textarea className={cx(fieldClass, 'min-h-20 resize-y py-2', className)} {...props} />;

// ---------- Layout ----------

export function Card({ title, action, children, className, bodyClassName }) {
    return (
        <section className={cx('rounded-xl border border-slate-200 bg-white', className)}>
            {(title || action) && (
                <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
                    {action}
                </header>
            )}
            <div className={cx('p-4', bodyClassName)}>{children}</div>
        </section>
    );
}

export function EmptyState({ icon: Icon, title, children }) {
    return (
        <div className="flex flex-col items-center px-4 py-10 text-center">
            {Icon && (
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <Icon size={20} />
                </div>
            )}
            <p className="text-sm font-medium text-slate-700">{title}</p>
            {children && <p className="mt-1 max-w-xs text-xs text-slate-500">{children}</p>}
        </div>
    );
}

export function Segmented({ options, value, onChange }) {
    return (
        <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {options.map((o) => (
                <button
                    key={o.value}
                    role="tab"
                    aria-selected={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cx(
                        'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all',
                        value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    )}
                >
                    {o.label}
                    {o.count > 0 && (
                        <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">{o.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export function StatusPill({ status }) {
    return (
        <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset', STATUS_STYLES[status])}>
            {status}
        </span>
    );
}

export function Spinner({ label = 'Loading…' }) {
    return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <IconLoader2 size={16} className="animate-spin" /> {label}
        </div>
    );
}

// ---------- Modal ----------

export function Modal({ open, title, description, onClose, children, width = 'max-w-md' }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        ref.current?.querySelector('input, textarea, select, button')?.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
                className={cx('max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl', width)}
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
                    </div>
                    <IconButton label="Close" onClick={onClose} className="-mr-1.5 -mt-1 h-8 w-8">
                        <IconX size={16} />
                    </IconButton>
                </header>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}

// ---------- Toasts (replace window.alert) ----------

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const push = useCallback((message, tone = 'success') => {
        const id = Math.random().toString(36).slice(2);
        setToasts((t) => [...t, { id, message, tone }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex print:hidden flex-col items-center gap-2 px-4">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cx(
                            'pointer-events-auto rounded-lg px-3.5 py-2 text-sm shadow-lg',
                            t.tone === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
                        )}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const errorMessage = (err, fallback = 'Something went wrong') => err?.response?.data?.message || fallback;
