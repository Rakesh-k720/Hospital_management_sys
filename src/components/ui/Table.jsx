import React from 'react';
import { twMerge } from 'tailwind-merge';

const Table = ({ className, children, ...props }) => {
    return (
        <div className="w-full overflow-auto">
            <table
                className={twMerge('w-full border-collapse text-left text-sm', className)}
                {...props}
            >
                {children}
            </table>
        </div>
    );
};

const TableHeader = ({ className, children, ...props }) => {
    return (
        <thead className={twMerge('bg-slate-50/50 border-b border-slate-100', className)} {...props}>
            {children}
        </thead>
    );
};

const TableBody = ({ className, children, ...props }) => {
    return (
        <tbody className={twMerge('divide-y divide-slate-100', className)} {...props}>
            {children}
        </tbody>
    );
};

const TableRow = ({ className, children, ...props }) => {
    return (
        <tr
            className={twMerge(
                'transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-50',
                className
            )}
            {...props}
        >
            {children}
        </tr>
    );
};

const TableHead = ({ className, children, ...props }) => {
    return (
        <th
            className={twMerge(
                'h-12 px-4 text-left align-middle font-medium text-secondary-500 [&:has([role=checkbox])]:pr-0',
                className
            )}
            {...props}
        >
            {children}
        </th>
    );
};

const TableCell = ({ className, children, ...props }) => {
    return (
        <td
            className={twMerge('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
            {...props}
        >
            {children}
        </td>
    );
};

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
