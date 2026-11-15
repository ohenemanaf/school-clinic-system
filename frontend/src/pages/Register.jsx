import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Field, Input, errorMessage } from '../components/ui';
import { todayIso } from '../utils/format';
import AuthLayout, { PasswordInput } from './AuthLayout';

const EMPTY = { firstName: '', lastName: '', studentNumber: '', dob: '', email: '', password: '' };

const Register = () => {
    const [form, setForm] = useState(EMPTY);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await register(form);
            navigate('/login?registered=1');
        } catch (err) {
            setError(errorMessage(err, 'Could not create your account.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout
            title="Create your account"
            subtitle="For students booking at the campus clinic."
            footer={<>Already registered? <Link to="/login" className="font-medium text-blue-600 hover:underline">Sign in</Link></>}
        >
            {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="First name"><Input name="firstName" autoComplete="given-name" required value={form.firstName} onChange={set} /></Field>
                    <Field label="Last name"><Input name="lastName" autoComplete="family-name" required value={form.lastName} onChange={set} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Student number"><Input name="studentNumber" required value={form.studentNumber} onChange={set} /></Field>
                    <Field label="Date of birth"><Input type="date" name="dob" required max={todayIso()} value={form.dob} onChange={set} /></Field>
                </div>
                <Field label="Email"><Input type="email" name="email" autoComplete="email" required value={form.email} onChange={set} /></Field>
                <Field label="Password" hint="At least 8 characters.">
                    <PasswordInput
                        name="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={set}
                        show={showPassword}
                        onToggle={() => setShowPassword((s) => !s)}
                    />
                </Field>
                <Button type="submit" loading={busy} className="mt-1 w-full">Create account</Button>
            </form>
        </AuthLayout>
    );
};

export default Register;
