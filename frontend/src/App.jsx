import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, HOME_BY_ROLE } from './context/AuthContext';
import { ToastProvider, Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';

// Each portal is its own chunk, so students don't download the staff and admin code.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PrescriptionPrint = lazy(() => import('./pages/PrescriptionPrint'));

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
    return children;
};

const Home = () => {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />;
};

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Router>
                    <Suspense fallback={<Spinner />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
                            <Route path="/staff-dashboard" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
                            <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                            <Route
                                path="/prescriptions/:recordId"
                                element={<ProtectedRoute allowedRoles={['student', 'staff']}><PrescriptionPrint /></ProtectedRoute>}
                            />
                            <Route path="*" element={<Home />} />
                        </Routes>
                    </Suspense>
                </Router>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
