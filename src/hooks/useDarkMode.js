import { useState, useEffect } from 'react';

const useDarkMode = () => {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage first
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';
        // Fall back to system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            // Only update if user hasn't explicitly set a preference
            const stored = localStorage.getItem('theme');
            if (!stored) {
                setIsDark(e.matches);
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleDarkMode = () => setIsDark((prev) => !prev);

    return { isDark, toggleDarkMode };
};

export default useDarkMode;
