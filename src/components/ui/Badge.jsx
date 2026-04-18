import React from 'react';
import { twMerge } from 'tailwind-merge';

const Badge = ({ className, variant = 'primary', ...props }) => {
    const variants = {
        primary: 'bg-primary-50 text-primary-700 border-primary-100',
        secondary: 'bg-slate-100 text-secondary-700 border-slate-200',
        success: 'bg-green-50 text-green-700 border-green-100',
        danger: 'bg-red-50 text-red-700 border-red-100',
        warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        info: 'bg-blue-50 text-blue-700 border-blue-100',
    };

    return (
        <span
            className={twMerge(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
                variants[variant],
                className
            )}
            {...props}
        />
    );
};

export default Badge;
