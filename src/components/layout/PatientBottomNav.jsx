import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    ClipboardList,
    FlaskConical,
    UserRound
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';

const PatientBottomNav = () => {
    const { t } = useTranslation();

    const navItems = [
        { nameKey: 'nav.dashboard', icon: LayoutDashboard, path: '/patient' },
        { nameKey: 'nav.bookAppointment', icon: Calendar, path: '/patient/book' },
        { nameKey: 'nav.opdToken', icon: ClipboardList, path: '/patient/token' },
        { nameKey: 'nav.reports', icon: FlaskConical, path: '/patient/reports' },
        { nameKey: 'nav.profile', icon: UserRound, path: '/patient/profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 z-40 lg:hidden animate-slide-up shadow-lg">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/patient'}
                        className={({ isActive }) => twMerge(
                            'flex flex-col items-center justify-center w-full h-full gap-1 rounded-lg transition-all',
                            isActive
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-secondary-500 dark:text-secondary-400 hover:text-primary-500 dark:hover:text-primary-400'
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={twMerge(
                                    'p-1.5 rounded-lg transition-all',
                                    isActive && 'bg-primary-50 dark:bg-primary-900/50'
                                )}>
                                    <item.icon size={20} />
                                </div>
                                <span className="text-[10px] font-medium">
                                    {t(item.nameKey)}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default PatientBottomNav;
