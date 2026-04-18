import React from 'react';
import { twMerge } from 'tailwind-merge';

const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-secondary-700 ml-0.5">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={twMerge(
                    'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-danger focus:ring-danger/20 focus:border-danger',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="text-xs text-danger font-medium ml-0.5">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
