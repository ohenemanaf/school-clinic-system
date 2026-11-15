import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 20000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// An expired or invalid session sends the user back to login instead of failing silently.
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const isAuthCall = error.config?.url?.startsWith('/auth/');
        if (error.response?.status === 401 && !isAuthCall) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('userId');
            if (window.location.pathname !== '/login') window.location.assign('/login?expired=1');
        }
        return Promise.reject(error);
    }
);

export default api;
