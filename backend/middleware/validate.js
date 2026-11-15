// Minimal request-body validation. Each rule returns an error string or null.
// Valid values are trimmed and written back to req.body; unknown keys are dropped.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const rules = {
    string: ({ min = 1, max = 255 } = {}) => (v) => {
        if (typeof v !== 'string') return 'must be text';
        const t = v.trim();
        if (!t) return 'is required';
        if (t.length < min) return min === 1 ? 'is required' : `must be at least ${min} characters`;
        if (t.length > max) return `must be at most ${max} characters`;
        return null;
    },
    email: () => (v) => (typeof v === 'string' && EMAIL_RE.test(v.trim()) && v.length <= 255 ? null : 'must be a valid email'),
    date: () => (v) => (typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) ? null : 'must be a date (YYYY-MM-DD)'),
    time: () => (v) => (typeof v === 'string' && TIME_RE.test(v) ? null : 'must be a time (HH:MM)'),
    id: () => (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? null : 'must be a valid id'),
};

// schema: { field: { rule, optional, trim = true } }. Use trim: false for passwords.
function validateBody(schema) {
    return (req, res, next) => {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const clean = {};
        const errors = {};
        for (const [field, { rule, optional, trim = true }] of Object.entries(schema)) {
            const value = body[field];
            if (value === undefined || value === null || value === '') {
                if (!optional) errors[field] = 'is required';
                continue;
            }
            const err = rule(value);
            if (err) errors[field] = err;
            else clean[field] = trim && typeof value === 'string' ? value.trim() : value;
        }
        if (Object.keys(errors).length) {
            const first = Object.entries(errors)[0];
            return res.status(400).json({ message: `${first[0]} ${first[1]}`, errors });
        }
        req.body = clean;
        next();
    };
}

// Validates that :param route params are positive integers.
function validateIdParam(name = 'id') {
    return (req, res, next) => {
        if (rules.id()(req.params[name])) return res.status(400).json({ message: `Invalid ${name}` });
        next();
    };
}

module.exports = { rules, validateBody, validateIdParam };
