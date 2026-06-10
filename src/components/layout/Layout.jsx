import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PatientBottomNav from './PatientBottomNav';

const Layout = ({ role, children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isPatient = role === 'patient';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            <Sidebar
                role={role}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="lg:pl-64 flex flex-col min-h-screen transition-all">
                <Topbar
                    role={role}
                    user={user}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />

                <main className={`flex-1 pt-24 px-4 pb-8 lg:px-8 max-w-7xl mx-auto w-full ${isPatient ? 'pb-24 lg:pb-8' : ''}`}>
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>

            {isPatient && <PatientBottomNav />}
        </div>
    );
};

export default Layout;
