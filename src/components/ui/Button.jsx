import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-soft',
        secondary: 'bg-slate-100 text-secondary-700 hover:bg-slate-200',
        outline: 'border border-slate-200 text-secondary-700 hover:bg-slate-50',
        danger: 'bg-danger text-white hover:bg-red-600 shadow-soft',
        ghost: 'text-secondary-600 hover:bg-slate-100 hover:text-secondary-900',
        success: 'bg-success text-white hover:bg-green-600 shadow-soft',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        icon: 'p-2',
    };

    return (
        <button
            ref={ref}
            className={twMerge(
                'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
});

Button.displayName = 'Button';

export default Button;
