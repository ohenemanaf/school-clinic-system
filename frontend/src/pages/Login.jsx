import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { Button, Field, Input, errorMessage } from '../components/ui';
import AuthLayout, { PasswordInput } from './AuthLayout';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const notice = params.get('expired')
        ? 'Your session expired. Please sign in again.'
        : params.get('registered')
          ? 'Account created. Sign in to book your first visit.'
          : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const { role } = await login(email, password);
            navigate(HOME_BY_ROLE[role], { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Could not sign in. Check your connection and try again.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout
            title="Sign in"
            subtitle="Book visits, see your records and prescriptions."
            footer={<>New student? <Link to="/register" className="font-medium text-blue-600 hover:underline">Create an account</Link></>}
        >
            {notice && !error && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">{notice}</div>}
            {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <Field label="Email">
                    <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Password">
                    <PasswordInput
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        show={showPassword}
                        onToggle={() => setShowPassword((s) => !s)}
                    />
                </Field>
                <Button type="submit" loading={busy} className="mt-1 w-full">Sign in</Button>
            </form>
        </AuthLayout>
    );
};

export default Login;
