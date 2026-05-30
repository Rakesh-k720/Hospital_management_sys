import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/layout/Layout';
import ToastContainer from './components/ui/ToastContainer';

import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import LobbyDisplay from './pages/LobbyDisplay';

import AdminHome from './components/modules/admin/AdminHome';
import DoctorManagement from './components/modules/admin/DoctorManagement';
import PatientManagement from './components/modules/admin/PatientManagement';
import OpdManagement from './components/modules/admin/OpdManagement';
import BedManagement from './components/modules/admin/BedManagement';
import AdminReports from './components/modules/admin/AdminReports';
import BillingManagement from './components/modules/admin/BillingManagement';
import AdminAppointments from './components/modules/admin/AdminAppointments';
import AdminSettings from './components/modules/admin/AdminSettings';
import LabManagement from './components/modules/admin/LabManagement';
import AdminAnalytics from './components/modules/admin/AdminAnalytics';
import DepartmentManagement from './components/modules/admin/DepartmentManagement';
import InventoryManagement from './components/modules/admin/InventoryManagement';
import AuditLogs from './components/modules/admin/AuditLogs';

import DoctorHome from './components/modules/doctor/DoctorHome';
import DoctorAppointments from './components/modules/doctor/DoctorAppointments';
import PrescriptionForm from './components/modules/doctor/PrescriptionForm';
import DoctorLabRequests from './components/modules/doctor/DoctorLabRequests';
import DoctorPatients from './components/modules/doctor/DoctorPatients';
import DoctorIpd from './components/modules/doctor/DoctorIpd';

import PatientHome from './components/modules/patient/PatientHome';
import BookAppointment from './components/modules/patient/BookAppointment';
import OnlineToken from './components/modules/patient/OnlineToken';
import PatientReports from './components/modules/patient/PatientReports';
import PatientBilling from './components/modules/patient/PatientBilling';
import PatientPrescriptions from './components/modules/patient/PatientPrescriptions';
import ProfilePage from './components/modules/shared/ProfilePage';
import PatientProfilePage from './components/modules/patient/PatientProfilePage';

import { LogOut } from 'lucide-react';

function App() {
    const [auth, setAuth] = useState({
        token: localStorage.getItem('token'),
        user: JSON.parse(localStorage.getItem('user') || 'null')
    });

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuth({ token: null, user: null });
    };

    return (
        <>
            <ToastContainer />
            {!auth.token || !auth.user ? (
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login setAuth={setAuth} />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/lobby" element={<LobbyDisplay />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                </Router>
            ) : (
                <Router>
                    <Layout role={auth.user.role}>
                        <Routes>
                            <Route path="/lobby" element={<LobbyDisplay />} />

                            {auth.user.role === 'admin' && (
                                <>
                                    <Route path="/" element={<AdminHome />} />
                                    <Route path="/admin" element={<AdminHome />} />
                                    <Route path="/admin/doctors" element={<DoctorManagement />} />
                                    <Route path="/admin/patients" element={<PatientManagement />} />
                                    <Route path="/admin/opd" element={<OpdManagement />} />
                                    <Route path="/admin/ipd" element={<BedManagement />} />
                                    <Route path="/admin/appointments" element={<AdminAppointments />} />
                                    <Route path="/admin/billing" element={<BillingManagement />} />
                                    <Route path="/admin/lab" element={<LabManagement />} />
                                    <Route path="/admin/reports" element={<AdminReports />} />
                            <Route path="/admin/settings" element={<AdminSettings />} />
                            <Route path="/admin/analytics" element={<AdminAnalytics />} />
                            <Route path="/admin/departments" element={<DepartmentManagement />} />
                            <Route path="/admin/inventory" element={<InventoryManagement />} />
                            <Route path="/admin/audit" element={<AuditLogs />} />
                            <Route path="*" element={<Navigate to="/admin" />} />
                                </>
                            )}

                            {auth.user.role === 'doctor' && (
                                <>
                                    <Route path="/" element={<DoctorHome />} />
                                    <Route path="/doctor" element={<DoctorHome />} />
                                    <Route path="/doctor/appointments" element={<DoctorAppointments />} />
                                    <Route path="/doctor/queue" element={<PrescriptionForm />} />
                                    <Route path="/doctor/patients" element={<DoctorPatients />} />
                                    <Route path="/doctor/ipd" element={<DoctorIpd />} />
                                    <Route path="/doctor/labs" element={<DoctorLabRequests />} />
                                    <Route path="/doctor/profile" element={<ProfilePage role="doctor" />} />
                                    <Route path="*" element={<Navigate to="/doctor" />} />
                                </>
                            )}

                            {auth.user.role === 'patient' && (
                                <>
                                    <Route path="/" element={<PatientHome />} />
                                    <Route path="/patient" element={<PatientHome />} />
                                    <Route path="/patient/book" element={<BookAppointment />} />
                                    <Route path="/patient/token" element={<OnlineToken />} />
                                    <Route path="/patient/reports" element={<PatientReports />} />
                                    <Route path="/patient/billing" element={<PatientBilling />} />
                                    <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
                                    <Route path="/patient/profile" element={<PatientProfilePage />} />
                                    <Route path="*" element={<Navigate to="/patient" />} />
                                </>
                            )}
                        </Routes>
                    </Layout>

                    <button
                        onClick={logout}
                        className="no-print fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-red-700 z-50 flex items-center gap-2 text-xs font-bold"
                    >
                        <LogOut size={16} />
                        LOGOUT ({auth.user.name})
                    </button>
                </Router>
            )}
        </>
    );
}

export default App;
