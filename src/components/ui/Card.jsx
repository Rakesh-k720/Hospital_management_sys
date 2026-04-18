import React from 'react';
import { twMerge } from 'tailwind-merge';

const Card = ({ className, children, ...props }) => {
    return (
        <div
            className={twMerge(
                'bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

const CardHeader = ({ className, children, ...props }) => {
    return (
        <div
            className={twMerge('px-6 py-4 border-b border-slate-50', className)}
            {...props}
        >
            {children}
        </div>
    );
};

const CardTitle = ({ className, children, ...props }) => {
    return (
        <h3
            className={twMerge(
                'text-lg font-semibold font-["Outfit"] text-secondary-900',
                className
            )}
            {...props}
        >
            {children}
        </h3>
    );
};

const CardContent = ({ className, children, ...props }) => {
    return (
        <div className={twMerge('px-6 py-4', className)} {...props}>
            {children}
        </div>
    );
};

const CardFooter = ({ className, children, ...props }) => {
    return (
        <div
            className={twMerge('px-6 py-4 border-t border-slate-50 bg-slate-50/50', className)}
            {...props}
        >
            {children}
        </div>
    );
};

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
