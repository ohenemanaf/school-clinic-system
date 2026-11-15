// The API returns DATE columns as "YYYY-MM-DD". Parse them as LOCAL dates:
// new Date("2026-11-16") would be UTC midnight and can show the previous day.
export function parseDate(value) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(value);
}

export const formatDate = (value, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
    parseDate(value)?.toLocaleDateString(undefined, opts) ?? '';

export const formatLongDate = (value) =>
    formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' });

// "14:30:00" -> "2:30 PM"
export function formatTime(value) {
    if (!value) return '';
    const [h, m] = value.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export const formatRange = (start, end) => `${formatTime(start)} – ${formatTime(end)}`;

export function isToday(value) {
    const d = parseDate(value);
    const now = new Date();
    return d && d.toDateString() === now.toDateString();
}

export function relativeTime(value) {
    const diff = (Date.now() - new Date(value).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return formatDate(value, { day: 'numeric', month: 'short' });
}

export const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Groups rows by their slot_date, preserving order.
export function groupByDate(rows) {
    const groups = new Map();
    for (const r of rows) {
        if (!groups.has(r.slot_date)) groups.set(r.slot_date, []);
        groups.get(r.slot_date).push(r);
    }
    return [...groups.entries()];
}
