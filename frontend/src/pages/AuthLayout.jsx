import { IconStethoscope } from '@tabler/icons-react';

export default function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
            <div className="mb-5 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">
                    <IconStethoscope size={20} />
                </div>
                <span className="text-base font-semibold text-slate-900">Campus Clinic</span>
            </div>
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                <p className="mb-5 mt-0.5 text-sm text-slate-500">{subtitle}</p>
                {children}
            </div>
            {footer && <p className="mt-4 text-sm text-slate-500">{footer}</p>}
        </div>
    );
}

export function PasswordInput({ show, onToggle, ...props }) {
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-14 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                {...props}
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
                {show ? 'Hide' : 'Show'}
            </button>
        </div>
    );
}
