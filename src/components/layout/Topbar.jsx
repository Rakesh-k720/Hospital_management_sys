import React from 'react';
import {
    Menu,
    User,
    LogOut,
    ShieldCheck,
    ChevronDown,
    Sun,
    Moon
} from 'lucide-react';
import Button from '../ui/Button';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import NotificationsPanel from './NotificationsPanel';
import { useTranslation } from 'react-i18next';
import useDarkMode from '../../hooks/useDarkMode';

const Topbar = ({ role, user, onMenuClick }) => {
    const { t } = useTranslation();
    const { isDark, toggleDarkMode } = useDarkMode();
    const displayName = user?.name || 'User';
    return (
        <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 z-30 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-secondary-600 dark:text-secondary-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                >
                    <Menu size={20} />
                </button>

                <GlobalSearch />
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
                <button
                    onClick={toggleDarkMode}
                    className="p-2 text-secondary-600 dark:text-secondary-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <LanguageSwitcher />
                <NotificationsPanel />

                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-600 mx-2 hidden sm:block"></div>

                <div className="flex items-center gap-3 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-700 p-1.5 pr-3 rounded-full transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                    <div className="bg-primary-50 dark:bg-primary-900/50 p-1.5 rounded-full text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800">
                        <User size={20} />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-bold text-secondary-900 dark:text-white leading-none">{displayName}</p>
                        <p className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase mt-0.5 tracking-wider flex items-center gap-1">
                            <ShieldCheck size={10} className="text-success" />
                            {role}
                        </p>
                    </div>
                    <ChevronDown size={14} className="text-secondary-400 dark:text-secondary-500 group-hover:text-secondary-600 dark:group-hover:text-secondary-300 hidden sm:block" />
                </div>
            </div>
        </header>
    );
};

export default Topbar;
