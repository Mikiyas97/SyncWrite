import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Crucial for sending/receiving HTTP-only cookies
});

// Response interceptor for generic error handling if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can handle global 401s here if we want to force logout on token expiration
    return Promise.reject(error);
  }
);

export default api;
