import axios from 'axios';

// En desarrollo usa localhost, en producción usa la URL de Render
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`
});

// Interceptor: Antes de que salga cualquier petición, le pegamos el Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;