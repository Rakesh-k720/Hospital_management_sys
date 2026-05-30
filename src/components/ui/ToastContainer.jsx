import React, { useEffect, useState } from 'react';
import { subscribeToast } from '../../utils/toast';

const ToastContainer = () => {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        return subscribeToast((t) => {
            setToast(t);
            setTimeout(() => setToast(null), 3500);
        });
    }, []);

    if (!toast) return null;

    return (
        <div
            className={`fixed top-20 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
                toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-green-600'
            }`}
        >
            {toast.message}
        </div>
    );
};

export default ToastContainer;
