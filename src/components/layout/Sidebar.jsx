import React from 'react';
import { NavLink } from 'react-router-dom'; // Note: Need to install react-router-dom or use custom Link
import {
    LayoutDashboard,
    Users,
    UserRound,
    ClipboardList,
    Stethoscope,
    Bed,
    Calendar,
    CreditCard,
    FlaskConical,
    Pill,
    BarChart3,
    Settings,
    X
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const Sidebar = ({ role, isOpen, onClose }) => {
    const menuItems = {
        admin: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
            { name: 'Doctors', icon: Stethoscope, path: '/admin/doctors' },
            { name: 'Patients', icon: Users, path: '/admin/patients' },
            { name: 'OPD Management', icon: ClipboardList, path: '/admin/opd' },
            { name: 'IPD / Admission', icon: Bed, path: '/admin/ipd' },
            { name: 'Appointments', icon: Calendar, path: '/admin/appointments' },
            { name: 'Billing', icon: CreditCard, path: '/admin/billing' },
            { name: 'Reports', icon: BarChart3, path: '/admin/reports' },
            { name: 'Settings', icon: Settings, path: '/admin/settings' },
        ],
        doctor: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/doctor' },
            { name: 'Appointments', icon: Calendar, path: '/doctor/appointments' },
            { name: 'OPD Queue', icon: ClipboardList, path: '/doctor/queue' },
            { name: 'My Patients', icon: Users, path: '/doctor/patients' },
            { name: 'IPD Stats', icon: Bed, path: '/doctor/ipd' },
            { name: 'Lab Requests', icon: FlaskConical, path: '/doctor/labs' },
            { name: 'Profile', icon: UserRound, path: '/doctor/profile' },
        ],
        patient: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/patient' },
            { name: 'Book Appointment', icon: Calendar, path: '/patient/book' },
            { name: 'OPD Token', icon: ClipboardList, path: '/patient/token' },
            { name: 'My Reports', icon: FlaskConical, path: '/patient/reports' },
            { name: 'Prescriptions', icon: Pill, path: '/patient/prescriptions' },
            { name: 'Bills', icon: CreditCard, path: '/patient/billing' },
            { name: 'Profile', icon: UserRound, path: '/patient/profile' },
        ]
    };

    const items = menuItems[role] || [];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={twMerge(
                    "fixed inset-0 bg-secondary-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside className={twMerge(
                "fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-100 z-50 transition-transform lg:translate-x-0 shadow-premium",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-600 p-2 rounded-lg text-white">
                                <Stethoscope size={24} />
                            </div>
                            <h1 className="text-xl font-bold font-['Outfit'] text-secondary-900">LifeLine</h1>
                        </div>
                        <button onClick={onClose} className="lg:hidden text-secondary-500 hover:text-secondary-900">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                        <p className="px-2 pb-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                            Main Menu
                        </p>
                        {items.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) => twMerge(
                                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                    isActive
                                        ? "bg-primary-50 text-primary-600 shadow-sm"
                                        : "hover:bg-slate-50 hover:text-primary-600 text-secondary-600"
                                )}
                                onClick={onClose}
                            >
                                <item.icon size={20} className={twMerge(
                                    "transition-colors",
                                    "group-hover:text-primary-500"
                                )} />
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User Role Info */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-full shadow-sm text-primary-600">
                                <UserRound size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-900 capitalize">{role}</p>
                                <p className="text-xs text-secondary-500">Hospital Staff</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
