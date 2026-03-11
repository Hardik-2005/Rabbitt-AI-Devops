import axios from 'axios';

// In Docker: VITE_API_BASE_URL=http://backend:5000  (set in docker-compose.yml)
// Locally:   falls back to http://localhost:5000
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
});

/**
 * Upload a sales file and trigger AI summary + email delivery.
 * @param {File}   file  - CSV or XLSX file (max 5 MB)
 * @param {string} email - Recipient email address
 */
export const uploadSalesFile = (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('email', email);

  return api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
