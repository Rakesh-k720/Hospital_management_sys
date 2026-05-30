const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const resolveReportUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    if (filePath.startsWith('/uploads')) return `${API_ORIGIN}${filePath}`;
    return `${API_ORIGIN}/uploads/${filePath}`;
};
