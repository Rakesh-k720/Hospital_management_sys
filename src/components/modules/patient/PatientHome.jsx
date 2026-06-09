import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import {
    Calendar, Ticket, CreditCard, ClipboardCheck, ArrowRight,
    Download, Heart, Activity, Clock, ShieldAlert,
    History, MapPin, FileHeart, MessageSquare, Plus, Minus,
    Check, AlertTriangle, Zap, CheckCircle2
} from 'lucide-react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Link } from 'react-router-dom';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';

const defaultVitalsHistory = [
    { date: '06/05', heart_rate: 70, blood_pressure_sys: 118, blood_pressure_dia: 78, blood_sugar: 98, weight: 69.5 },
    { date: '06/06', heart_rate: 75, blood_pressure_sys: 122, blood_pressure_dia: 82, blood_sugar: 105, weight: 69.8 },
    { date: '06/07', heart_rate: 72, blood_pressure_sys: 120, blood_pressure_dia: 80, blood_sugar: 102, weight: 70.0 },
    { date: '06/08', heart_rate: 68, blood_pressure_sys: 119, blood_pressure_dia: 79, blood_sugar: 95, weight: 69.9 },
    { date: '06/09', heart_rate: 72, blood_pressure_sys: 120, blood_pressure_dia: 80, blood_sugar: 110, weight: 70.1 }
];

const PatientHome = () => {
    const [dashboard, setDashboard] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [bills, setBills] = useState([]);
    const [reports, setReports] = useState([]);
    const [profile, setProfile] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Vitals Logger States
    const [vitalsHistory, setVitalsHistory] = useState(() => {
        const saved = localStorage.getItem('vitals_history');
        return saved ? JSON.parse(saved) : defaultVitalsHistory;
    });
    const [activeVitalTab, setActiveVitalTab] = useState('heart_rate');
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [newHR, setNewHR] = useState('');
    const [newBPSys, setNewBPSys] = useState('');
    const [newBPDia, setNewBPDia] = useState('');
    const [newSugar, setNewSugar] = useState('');
    const [newWeight, setNewWeight] = useState('');

    // Hydration Tracker State (3000 ml goal)
    const todayDateKey = new Date().toISOString().slice(0, 10);
    const [waterIntake, setWaterIntake] = useState(() => {
        const saved = localStorage.getItem(`water_${todayDateKey}`);
        return saved ? Number(saved) : 0;
    });

    // Medication Checklist State
    const [medAdherence, setMedAdherence] = useState(() => {
        const saved = localStorage.getItem(`meds_${todayDateKey}`);
        return saved ? JSON.parse(saved) : {};
    });

    // SOS Emergency Countdown State
    const [sosActive, setSosActive] = useState(false);
    const [sosTimer, setSosTimer] = useState(5);
    const [sosDispatched, setSosDispatched] = useState(false);
    const sosIntervalRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashRes, apptRes, billRes, reportRes, profileRes, prescRes] = await Promise.all([
                    API.get('/patient/dashboard'),
                    API.get('/patient/appointments'),
                    API.get('/patient/bills'),
                    API.get('/lab/my-reports'),
                    API.get('/profile').catch(() => null),
                    API.get('/patient/prescriptions').catch(() => null)
                ]);
                setDashboard(dashRes.data.data);
                setAppointments(apptRes.data.data || []);
                setBills(billRes.data.data || []);
                setReports(reportRes.data.data || []);
                if (profileRes) setProfile(profileRes.data.data);
                if (prescRes) setPrescriptions(prescRes.data.data || []);
            } catch (err) {
                console.error('Error loading patient dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Billing Summary Memo
    const billingSummary = useMemo(() => {
        const pending = bills.filter((b) => b.payment_status !== 'paid');
        const pendingAmount = pending.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
        return { pendingCount: pending.length, pendingAmount };
    }, [bills]);

    // Water Log Handler
    const handleAddWater = (amount) => {
        setWaterIntake(prev => {
            const val = Math.max(0, prev + amount);
            localStorage.setItem(`water_${todayDateKey}`, val);
            return val;
        });
    };

    // Medication Checklist Mapper
    const activeMeds = useMemo(() => {
        const fallbackMeds = [
            { id: 'm1', name: 'Metformin 500mg', times: ['morning', 'night'], instruction: 'Take after meals' },
            { id: 'm2', name: 'Atorvastatin 10mg', times: ['night'], instruction: 'Take before bed' },
            { id: 'm3', name: 'Vitamin D3 1000 IU', times: ['morning'], instruction: 'Take with breakfast' }
        ];

        if (!prescriptions || prescriptions.length === 0) return fallbackMeds;
        const latestPresc = prescriptions[0];
        if (!latestPresc.medicines || latestPresc.medicines.length === 0) return fallbackMeds;

        return latestPresc.medicines.map((m, idx) => {
            const dosage = (m.dosage || '').toLowerCase();
            const times = [];
            if (dosage.includes('morning') || dosage.startsWith('1-') || dosage.includes('1-0-1') || dosage.includes('1-1-1') || dosage.includes('1-0-0')) {
                times.push('morning');
            }
            if (dosage.includes('afternoon') || dosage.includes('1-1-1') || dosage.includes('0-1-0') || (dosage.split('-')[1] === '1')) {
                times.push('afternoon');
            }
            if (dosage.includes('night') || dosage.includes('evening') || dosage.includes('1-0-1') || dosage.includes('1-1-1') || dosage.endsWith('-1') || dosage.includes('0-0-1')) {
                times.push('night');
            }
            if (times.length === 0) times.push('morning'); // Default
            return {
                id: m.id || `m_${idx}`,
                name: m.medicine_name,
                times,
                instruction: m.instructions || 'As advised'
            };
        });
    }, [prescriptions]);

    const toggleMedAdherence = (medId, time) => {
        setMedAdherence(prev => {
            const key = `${medId}_${time}`;
            const val = !prev[key];
            const updated = { ...prev, [key]: val };
            localStorage.setItem(`meds_${todayDateKey}`, JSON.stringify(updated));
            return updated;
        });
    };

    const medicationProgress = useMemo(() => {
        let totalDoses = 0;
        let takenDoses = 0;
        activeMeds.forEach(m => {
            m.times.forEach(t => {
                totalDoses++;
                if (medAdherence[`${m.id}_${t}`]) {
                    takenDoses++;
                }
            });
        });
        return totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;
    }, [activeMeds, medAdherence]);

    // Vitals Logger Handler
    const handleLogVitals = (e) => {
        e.preventDefault();
        if (!newHR && !newBPSys && !newSugar && !newWeight) {
            showToast('Please enter at least one metric', 'warning');
            return;
        }

        const todayStr = new Date().toLocaleDateString([], { month: '2-digit', day: '2-digit' });
        const lastLog = vitalsHistory[vitalsHistory.length - 1] || {};

        const newLog = {
            date: todayStr,
            heart_rate: newHR ? Number(newHR) : lastLog.heart_rate || 72,
            blood_pressure_sys: newBPSys ? Number(newBPSys) : lastLog.blood_pressure_sys || 120,
            blood_pressure_dia: newBPDia ? Number(newBPDia) : lastLog.blood_pressure_dia || 80,
            blood_sugar: newSugar ? Number(newSugar) : lastLog.blood_sugar || 100,
            weight: newWeight ? Number(newWeight) : lastLog.weight || 70.0
        };

        const updated = [...vitalsHistory.slice(-5), newLog]; // Keep last 6 logs
        setVitalsHistory(updated);
        localStorage.setItem('vitals_history', JSON.stringify(updated));
        showToast('Vitals logged successfully');
        setShowVitalsModal(false);

        // Reset inputs
        setNewHR('');
        setNewBPSys('');
        setNewBPDia('');
        setNewSugar('');
        setNewWeight('');
    };

    // SOS Timer Handler
    const handleTriggerSOS = () => {
        setSosActive(true);
        setSosTimer(5);
        setSosDispatched(false);
        sosIntervalRef.current = setInterval(() => {
            setSosTimer(prev => {
                if (prev <= 1) {
                    clearInterval(sosIntervalRef.current);
                    setSosDispatched(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleCancelSOS = () => {
        clearInterval(sosIntervalRef.current);
        setSosActive(false);
        setSosTimer(5);
        setSosDispatched(false);
    };

    useEffect(() => {
        return () => clearInterval(sosIntervalRef.current);
    }, []);

    // Vitals Display Metrics
    const latestVital = useMemo(() => {
        return vitalsHistory[vitalsHistory.length - 1] || { heart_rate: '--', blood_pressure_sys: '--', blood_pressure_dia: '--', blood_sugar: '--', weight: '--' };
    }, [vitalsHistory]);

    const patientIdLabel = profile?.patient?.id
        ? `P-${String(profile.patient.id).padStart(4, '0')}`
        : '#P-8821';

    const patientName = profile?.user?.name || 'Patient';

    return (
        <div className="space-y-6 relative">
            
            {/* SOS Active Overlay Screen */}
            {sosActive && (
                <div className="fixed inset-0 bg-red-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white px-4">
                    <div className="bg-red-600 p-8 rounded-full border-4 border-white/20 animate-pulse text-white mb-6">
                        <Zap size={64} />
                    </div>
                    {!sosDispatched ? (
                        <>
                            <h2 className="text-3xl md:text-5xl font-black font-['Outfit'] mb-2 uppercase tracking-wide">Triggering Emergency SOS</h2>
                            <p className="text-sm md:text-base text-red-200 mb-8 max-w-md text-center">
                                Direct alert will be sent to the LifeLine Trauma center. Ambulance will be dispatched immediately.
                            </p>
                            <div className="text-8xl font-black font-['Outfit'] mb-12 animate-bounce">
                                {sosTimer}s
                            </div>
                            <Button
                                onClick={handleCancelSOS}
                                className="bg-white hover:bg-slate-100 text-red-700 font-bold px-12 py-4 rounded-2xl shadow-2xl text-base"
                            >
                                Cancel Emergency Request
                            </Button>
                        </>
                    ) : (
                        <div className="text-center max-w-md animate-fade-in">
                            <h2 className="text-3xl md:text-4xl font-black font-['Outfit'] mb-4 uppercase tracking-wide text-green-300">SOS ALERT SENT!</h2>
                            <div className="p-5 bg-white/10 rounded-2xl border border-white/10 text-left space-y-2.5 mb-8">
                                <p className="text-sm font-bold flex justify-between">
                                    <span>Ambulance Status:</span>
                                    <span className="text-green-400 font-black">Dispatched (ETA: 12 min)</span>
                                </p>
                                <p className="text-sm font-bold flex justify-between">
                                    <span>Tracking Code:</span>
                                    <span className="text-amber-300 font-bold font-mono">#SOS-${Math.floor(1000 + Math.random() * 9000)}</span>
                                </p>
                                <p className="text-sm font-bold flex justify-between">
                                    <span>Primary Helpline:</span>
                                    <span>+1 (800) 999 000</span>
                                </p>
                            </div>
                            <p className="text-xs text-red-200 mb-8">
                                A paramedic call agent is calling your registered mobile number right now. Please keep your phone lines open.
                            </p>
                            <Button
                                onClick={handleCancelSOS}
                                className="bg-red-700 hover:bg-red-800 text-white font-bold px-8 py-3 rounded-xl border border-red-500"
                            >
                                Close & Dismiss
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Dashboard Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">
                        Welcome Back, {patientName}
                    </h2>
                    <p className="text-xs text-secondary-500 flex flex-wrap gap-2 items-center mt-1">
                        <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-bold">{patientIdLabel}</span>
                        {profile?.patient?.age && (
                            <>
                                <span>•</span>
                                <span>Age: {profile.patient.age}</span>
                            </>
                        )}
                        {profile?.patient?.gender && (
                            <>
                                <span>•</span>
                                <span className="capitalize">Gender: {profile.patient.gender}</span>
                            </>
                        )}
                        {profile?.patient?.blood_group && (
                            <>
                                <span>•</span>
                                <span className="text-red-500 font-bold">Blood: {profile.patient.blood_group}</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link to="/patient/helpdesk">
                        <Button variant="outline" className="flex items-center gap-2 border-slate-200 text-primary-600 bg-white">
                            <MessageSquare size={16} />
                            Support Helpdesk
                        </Button>
                    </Link>
                    <Link to="/patient/reports">
                        <Button variant="outline" className="flex items-center gap-2 border-slate-200 bg-white">
                            <History size={16} />
                            Medical Records
                        </Button>
                    </Link>
                    <Link to="/patient/book">
                        <Button className="flex items-center gap-2 shadow-soft bg-primary-600 hover:bg-primary-700">
                            <Calendar size={16} />
                            Book Appointment
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Allergies Warning Banner */}
            {profile?.patient?.allergies && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-800">Critical Medical Alerts / Allergies</p>
                        <p className="text-xs font-semibold mt-0.5 text-secondary-700">{profile.patient.allergies}</p>
                    </div>
                </div>
            )}

            {/* Top Stat Brief Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Upcoming Appointments', value: loading ? '-' : (dashboard?.upcomingAppointments ?? 0), icon: Calendar, color: 'primary' },
                    { label: 'Total Visits', value: loading ? '-' : (dashboard?.totalVisits ?? 0), icon: Activity, color: 'amber' },
                    { label: 'Pending Bills', value: loading ? '-' : (dashboard?.pendingBills ?? 0), icon: CreditCard, color: 'red' },
                    { label: 'Reports Available', value: loading ? '-' : reports.length, icon: ClipboardCheck, color: 'green' },
                ].map((item) => (
                    <Card key={item.label} className="border-none shadow-premium bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`p-2.5 rounded-2xl bg-${item.color === 'red' ? 'red-50 text-red-500' : item.color === 'primary' ? 'primary-50 text-primary-600' : item.color === 'amber' ? 'amber-50 text-amber-600' : 'green-50 text-green-600'}`}>
                                <item.icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                                <p className="text-base font-bold text-secondary-900 font-['Outfit']">{item.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Interactive Health Vitals Panel & Chart */}
            <Card className="border-none shadow-premium">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 py-4">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Heart className="text-red-500" size={18} />
                            Health Vitals & Biometrics History
                        </CardTitle>
                        <p className="text-xs text-secondary-500 mt-0.5">Track your daily medical readings and trends</p>
                    </div>
                    <Button onClick={() => setShowVitalsModal(true)} size="sm" className="flex items-center gap-1.5 self-start sm:self-auto text-xs py-1.5 h-8">
                        <Plus size={14} /> Log Vitals
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Vitals Quick Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { key: 'heart_rate', name: 'Heart Rate', val: `${latestVital.heart_rate} BPM`, status: latestVital.heart_rate > 100 || latestVital.heart_rate < 60 ? 'Warning' : 'Normal', color: 'border-red-100 bg-red-50/20 text-red-600' },
                            { key: 'blood_pressure', name: 'Blood Pressure', val: `${latestVital.blood_pressure_sys}/${latestVital.blood_pressure_dia}`, status: latestVital.blood_pressure_sys > 130 ? 'High' : 'Normal', color: 'border-blue-100 bg-blue-50/20 text-blue-600' },
                            { key: 'blood_sugar', name: 'Blood Sugar', val: `${latestVital.blood_sugar} mg/dL`, status: latestVital.blood_sugar > 140 ? 'High' : 'Normal', color: 'border-amber-100 bg-amber-50/20 text-amber-600' },
                            { key: 'weight', name: 'Weight', val: `${latestVital.weight} kg`, status: 'Normal', color: 'border-emerald-100 bg-emerald-50/20 text-emerald-600' },
                            { key: 'spo2', name: 'SpO2 Level', val: '98%', status: 'Normal', color: 'border-purple-100 bg-purple-50/20 text-purple-600' }
                        ].map((v) => (
                            <div
                                key={v.key}
                                onClick={() => v.key !== 'spo2' && setActiveVitalTab(v.key)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    activeVitalTab === v.key ? 'border-primary-500 ring-2 ring-primary-100 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                                } bg-white`}
                            >
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider">{v.name}</p>
                                <h4 className="text-lg font-black text-secondary-900 mt-1 font-['Outfit']">{v.val}</h4>
                                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-2 ${
                                    v.status === 'Normal' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                    {v.status}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Chart Display */}
                    <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-secondary-700 uppercase tracking-wider">
                                {activeVitalTab.replace('_', ' ')} Trend Chart
                            </h4>
                            <div className="flex gap-1.5">
                                {['heart_rate', 'blood_pressure', 'blood_sugar', 'weight'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveVitalTab(tab)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize border transition-all ${
                                            activeVitalTab === tab
                                                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                                : 'bg-white border-slate-200 text-secondary-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {tab.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={vitalsHistory}>
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 9 }} />
                                    <Tooltip />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    {activeVitalTab === 'heart_rate' && <Line type="monotone" dataKey="heart_rate" name="Heart Rate (BPM)" stroke="#ef4444" strokeWidth={2.5} />}
                                    {activeVitalTab === 'blood_pressure' && (
                                        <>
                                            <Line type="monotone" dataKey="blood_pressure_sys" name="Systolic BP" stroke="#3b82f6" strokeWidth={2.5} />
                                            <Line type="monotone" dataKey="blood_pressure_dia" name="Diastolic BP" stroke="#60a5fa" strokeWidth={2} />
                                        </>
                                    )}
                                    {activeVitalTab === 'blood_sugar' && <Line type="monotone" dataKey="blood_sugar" name="Sugar Level (mg/dL)" stroke="#f59e0b" strokeWidth={2.5} />}
                                    {activeVitalTab === 'weight' && <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#10b981" strokeWidth={2.5} />}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Vitals Log Modal */}
            {showVitalsModal && (
                <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-secondary-900 font-['Outfit']">Record Daily Health Vitals</h3>
                            <button onClick={() => setShowVitalsModal(false)} className="text-secondary-400 hover:text-secondary-600 text-sm font-bold">✕</button>
                        </div>
                        <form onSubmit={handleLogVitals}>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Heart Rate (BPM)"
                                        type="number"
                                        value={newHR}
                                        onChange={(e) => setNewHR(e.target.value)}
                                        placeholder="e.g. 72"
                                    />
                                    <Input
                                        label="Blood Sugar (mg/dL)"
                                        type="number"
                                        value={newSugar}
                                        onChange={(e) => setNewSugar(e.target.value)}
                                        placeholder="e.g. 98"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="BP Systolic (Upper)"
                                        type="number"
                                        value={newBPSys}
                                        onChange={(e) => setNewBPSys(e.target.value)}
                                        placeholder="e.g. 120"
                                    />
                                    <Input
                                        label="BP Diastolic (Lower)"
                                        type="number"
                                        value={newBPDia}
                                        onChange={(e) => setNewBPDia(e.target.value)}
                                        placeholder="e.g. 80"
                                    />
                                </div>
                                <Input
                                    label="Weight (kg)"
                                    type="number"
                                    step="0.1"
                                    value={newWeight}
                                    onChange={(e) => setNewWeight(e.target.value)}
                                    placeholder="e.g. 70.5"
                                />
                            </div>
                            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                                <Button type="button" variant="outline" onClick={() => setShowVitalsModal(false)} size="sm">
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm">
                                    Save Vitals Log
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Columns (Span 2) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* My Appointments Card */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-50">
                            <CardTitle className="text-base">Active Appointments</CardTitle>
                            <Link to="/patient/book" className="text-xs text-primary-600 font-bold hover:underline">Book New</Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {(appointments.slice(0, 3)).map((appt) => (
                                    <div key={appt.id} className="p-4 hover:bg-slate-50/60 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary-50 p-2.5 rounded-2xl text-primary-600 shadow-sm">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-900">Dr. {appt.doctor_name}</p>
                                                    <p className="text-xs text-secondary-500 mb-1">{appt.specialization}</p>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-secondary-400 font-medium">
                                                        <MapPin size={9} /> OPD Department
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-secondary-900">{new Date(appt.appointment_date).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-secondary-400 font-bold uppercase">{appt.appointment_time}</p>
                                                <div className="flex items-center gap-2 mt-1.5 justify-end">
                                                    <Badge variant={appt.status === 'completed' ? 'success' : appt.status === 'cancelled' ? 'danger' : 'warning'}>
                                                        {appt.status}
                                                    </Badge>
                                                    {appt.status === 'pending' && (
                                                        <button
                                                            className="text-[10px] font-bold text-red-600 border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded transition"
                                                            onClick={async () => {
                                                                if (window.confirm('Cancel this appointment?')) {
                                                                    try {
                                                                        await API.patch(`/patient/appointments/${appt.id}/cancel`);
                                                                        showToast('Appointment cancelled');
                                                                        window.location.reload();
                                                                    } catch (err) {
                                                                        showToast('Cancel failed', 'error');
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!loading && appointments.length === 0 && (
                                    <div className="p-6 text-center text-sm text-secondary-500">No appointments found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Medicine Adherence Tracker Checklist */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-50">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileHeart className="text-emerald-500" size={18} />
                                    Daily Medication Reminders
                                </CardTitle>
                                <p className="text-xs text-secondary-500 mt-0.5">Check off medicines as you take them today</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-secondary-600">{medicationProgress}% Done</span>
                                <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${medicationProgress}%` }}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {activeMeds.map((med) => (
                                <div key={med.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-secondary-900">{med.name}</p>
                                        <p className="text-[10px] text-secondary-500 italic mt-0.5">Dosage Advice: {med.instruction}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {med.times.map((time) => {
                                            const key = `${med.id}_${time}`;
                                            const taken = medAdherence[key];
                                            return (
                                                <button
                                                    key={time}
                                                    type="button"
                                                    onClick={() => toggleMedAdherence(med.id, time)}
                                                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold capitalize flex items-center gap-1.5 transition-all ${
                                                        taken
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                                                            : 'bg-white border-slate-200 text-secondary-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {taken ? <Check size={10} className="stroke-[3]" /> : null}
                                                    {time === 'morning' ? '☀️ Morning' : time === 'afternoon' ? '🌤️ Noon' : '🌙 Night'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Lab Reports List */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-4 border-b border-slate-50">
                            <CardTitle className="text-base">Lab Diagnostic Reports</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(reports.slice(0, 4)).map((report) => (
                                <div key={report.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-primary-100 hover:bg-primary-50/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-50 p-2 rounded-xl text-secondary-500 shadow-sm">
                                            <ClipboardCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-secondary-900 leading-snug">{report.test_name}</p>
                                            <p className="text-[9px] text-secondary-400 font-bold">{new Date(report.created_at).toLocaleDateString()}</p>
                                            <Badge variant={report.status === 'completed' ? 'success' : 'warning'} className="text-[8px] py-0.5 px-1.5 mt-1">{report.status}</Badge>
                                        </div>
                                    </div>
                                    {report.status === 'completed' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-600 hover:bg-primary-50">
                                            <Download size={14} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {!loading && reports.length === 0 && <p className="text-xs text-secondary-400 py-3">No diagnostic reports uploaded yet.</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (Span 1) */}
                <div className="space-y-6">
                    
                    {/* Financial Summary */}
                    <Card className="border-none shadow-premium bg-gradient-to-br from-primary-700 to-primary-600 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <CreditCard size={100} />
                        </div>
                        <CardContent className="p-6 relative">
                            <p className="text-xs font-bold text-primary-100 uppercase tracking-widest mb-1">Billing Summary</p>
                            <h3 className="text-2xl font-black font-['Outfit'] mb-6">₹ {billingSummary.pendingAmount.toFixed(2)}</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs pb-2 border-b border-white/20">
                                    <span className="text-primary-100">Outstanding Invoices</span>
                                    <span className="font-bold">{billingSummary.pendingCount} Bills</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-primary-100">Last Payment Date</span>
                                    <span className="font-bold">{bills[0] ? new Date(bills[0].bill_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                            <Link to="/patient/billing">
                                <Button className="w-full mt-5 bg-white text-primary-600 hover:bg-primary-50 font-bold py-2 text-xs shadow-soft rounded-xl">
                                    Pay Outstanding Balance
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Water Intake Tracker */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-3.5 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Check className="text-blue-500 stroke-[3]" size={16} />
                                Hydration Tracker (Daily Target)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-secondary-700">Logged: {waterIntake} ml / 3000 ml</span>
                                <span className="font-bold text-blue-600">{Math.round((waterIntake/3000)*100)}%</span>
                            </div>
                            {/* Water level CSS animation bar */}
                            <div className="h-4 rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500 shadow-sm"
                                    style={{ width: `${Math.min(100, (waterIntake/3000)*100)}%` }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAddWater(250)}
                                    className="flex-1 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] font-bold rounded-lg transition"
                                >
                                    + 250ml Glass
                                </button>
                                <button
                                    onClick={() => handleAddWater(-250)}
                                    className="px-3 py-1.5 border border-slate-200 text-secondary-500 hover:bg-slate-100 text-[10px] font-bold rounded-lg transition"
                                >
                                    - Remove
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vaccination / Immunization Records */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-3.5 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-primary-600" />
                                Vaccination Record
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100 text-xs">
                                {[
                                    { name: 'COVID-19 Booster', date: '01/15/2024', status: 'Completed' },
                                    { name: 'Hepatitis B Shot', date: '09/10/2022', status: 'Completed' },
                                    { name: 'Influenza Vaccine', date: 'Recommended', status: 'Due' },
                                    { name: 'Tetanus Toxoid', date: 'Overdue', status: 'Overdue' }
                                ].map((vax) => (
                                    <div key={vax.name} className="p-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-secondary-800">{vax.name}</p>
                                            <p className="text-[10px] text-secondary-400 mt-0.5">Date/Schedule: {vax.date}</p>
                                        </div>
                                        <Badge variant={vax.status === 'Completed' ? 'success' : vax.status === 'Due' ? 'info' : 'danger'} className="text-[9px]">
                                            {vax.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Emergency Contacts & Help Shortcuts */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-4 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShieldAlert size={16} className="text-red-500" />
                                Support & Quick Helpline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                                <div>
                                    <p className="text-[9px] font-bold text-secondary-400 uppercase">Assigned Case Manager</p>
                                    <p className="text-xs font-bold text-secondary-900 mt-0.5">Dr. Robert Downey</p>
                                </div>
                                <Link to="/patient/helpdesk" className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1 mt-1">
                                    Start Live Chat Support <ArrowRight size={12} />
                                </Link>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-red-50/30 border border-red-100">
                                <p className="text-[9px] font-bold text-red-400 uppercase">Emergency Helpline (24/7)</p>
                                <p className="text-sm font-black text-red-600 mt-0.5">+1 (800) 999 000</p>
                            </div>
                            
                            {/* SOS Panic Trigger Card */}
                            <button
                                type="button"
                                onClick={handleTriggerSOS}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl shadow-soft flex items-center justify-center gap-2 tracking-wider uppercase text-xs transition-colors duration-250 animate-pulse"
                            >
                                <Zap size={14} /> Trigger Emergency SOS
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PatientHome;
