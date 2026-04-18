import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';

// Auth Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

// Admin Modules
import AdminHome from './components/modules/admin/AdminHome';
import DoctorManagement from './components/modules/admin/DoctorManagement';
import OpdManagement from './components/modules/admin/OpdManagement';
import BedManagement from './components/modules/admin/BedManagement';
import DischargeSummary from './components/modules/admin/DischargeSummary';
import BillingManagement from './components/modules/admin/BillingManagement';

// Doctor Modules
import DoctorHome from './components/modules/doctor/DoctorHome';
import PrescriptionForm from './components/modules/doctor/PrescriptionForm';

// Patient Modules
import PatientHome from './components/modules/patient/PatientHome';
import BookAppointment from './components/modules/patient/BookAppointment';
import OnlineToken from './components/modules/patient/OnlineToken';
import PatientReports from './components/modules/patient/PatientReports';
import PatientBilling from './components/modules/patient/PatientBilling';
import PatientPrescriptions from './components/modules/patient/PatientPrescriptions';

import { LogOut, ShieldCheck } from 'lucide-react';

function App() {
    const [auth, setAuth] = useState({
        token: localStorage.getItem('token'),
        user: JSON.parse(localStorage.getItem('user'))
    });

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuth({ token: null, user: null });
    };

    if (!auth.token || !auth.user) {
        // Clear any stale/corrupted localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return (
            <Router>
                <Routes>
                    <Route path="/login" element={<Login setAuth={setAuth} />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </Router>
        );
    }

    const { role } = auth.user;

    return (
        <Router>
            <Layout role={role}>
                <Routes>
                    {/* Admin Routes */}
                    {role === 'admin' && (
                        <>
                            <Route path="/" element={<AdminHome />} />
                            <Route path="/admin" element={<AdminHome />} />
                            <Route path="/admin/doctors" element={<DoctorManagement />} />
                            <Route path="/admin/opd" element={<OpdManagement />} />
                            <Route path="/admin/ipd" element={<BedManagement />} />
                            <Route path="/admin/reports" element={<DischargeSummary />} />
                            <Route path="/admin/billing" element={<BillingManagement />} />
                            <Route path="*" element={<Navigate to="/admin" />} />
                        </>
                    )}

                    {/* Doctor Routes */}
                    {role === 'doctor' && (
                        <>
                            <Route path="/" element={<DoctorHome />} />
                            <Route path="/doctor" element={<DoctorHome />} />
                            <Route path="/doctor/appointments" element={<DoctorHome />} />
                            <Route path="/doctor/queue" element={<PrescriptionForm />} />
                            <Route path="*" element={<Navigate to="/doctor" />} />
                        </>
                    )}

                    {/* Patient Routes */}
                    {role === 'patient' && (
                        <>
                            <Route path="/" element={<PatientHome />} />
                            <Route path="/patient" element={<PatientHome />} />
                            <Route path="/patient/book" element={<BookAppointment />} />
                            <Route path="/patient/token" element={<OnlineToken />} />
                            <Route path="/patient/reports" element={<PatientReports />} />
                            <Route path="/patient/billing" element={<PatientBilling />} />
                            <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
                            <Route path="*" element={<Navigate to="/patient" />} />
                        </>
                    )}
                </Routes>
            </Layout>

            {/* Logout Floating Button */}
            <button
                onClick={logout}
                className="fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-red-700 z-50 transition-all transition-transform active:scale-95 flex items-center gap-2 text-xs font-bold"
            >
                <LogOut size={16} />
                LOGOUT ({auth.user.name})
            </button>
        </Router>
    );
}

export default App;

