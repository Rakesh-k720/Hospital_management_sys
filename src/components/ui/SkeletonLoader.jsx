import React from 'react';
import { twMerge } from 'tailwind-merge';

const SkeletonLoader = ({ className, variant = 'default', count = 1 }) => {
    const variants = {
        default: 'h-4 w-full rounded',
        circle: 'h-10 w-10 rounded-full',
        card: 'h-32 w-full rounded-xl',
        text: 'h-4 w-3/4 rounded',
        button: 'h-10 w-24 rounded-lg',
        table: 'h-12 w-full rounded',
    };

    const skeletons = Array.from({ length: count }, (_, i) => (
        <div
            key={i}
            className={twMerge(
                'bg-slate-200 dark:bg-slate-700 animate-pulse',
                variants[variant],
                className
            )}
        />
    ));

    return count === 1 ? skeletons[0] : <div className="space-y-2">{skeletons}</div>;
};

// Pre-built loading states for common patterns
export const CardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" className="w-1/2" />
        <SkeletonLoader variant="text" className="w-1/3" />
    </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <SkeletonLoader variant="table" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="p-4 border-b border-slate-50 dark:border-slate-700 last:border-0">
                <SkeletonLoader variant="table" />
            </div>
        ))}
    </div>
);

export const StatsSkeleton = ({ count = 4 }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6 space-y-3">
                <SkeletonLoader variant="text" className="w-1/2" />
                <SkeletonLoader variant="text" className="w-1/4 h-8" />
            </div>
        ))}
    </div>
);

export default SkeletonLoader;
