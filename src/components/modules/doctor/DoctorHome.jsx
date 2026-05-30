import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Calendar, Users, Clock, AlertCircle, Plus, FileText, Search,
    ClipboardCheck, Activity, Pill, Stethoscope, BedDouble, ArrowRight,
    UserRound, FlaskConical, CheckCircle2, Hourglass, Phone
} from 'lucide-react';
import Button from '../../ui/Button';

const tokenStatusVariant = (status) => {
    if (status === 'in_consultation') return 'warning';
    if (status === 'completed') return 'success';
    if (status === 'waiting') return 'info';
    return 'secondary';
};

const DoctorHome = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [ipdPatients, setIpdPatients] = useState([]);
    const [labRequests, setLabRequests] = useState([]);
    const [recentPatients, setRecentPatients] = useState([]);
    const [doctorProfile, setDoctorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, apptsRes, profileRes, ipdRes, labRes, patientsRes] = await Promise.all([
                    API.get('/doctor/dashboard'),
                    API.get('/doctor/appointments'),
                    API.get('/profile'),
                    API.get('/doctor/ipd'),
                    API.get('/doctor/lab-requests'),
                    API.get('/doctor/patients')
                ]);
                setStats(statsRes.data.data || {});
                setAppointments(apptsRes.data.data || []);
                setDoctorProfile(profileRes.data.data);
                setIpdPatients(ipdRes.data.data || []);
                setLabRequests((labRes.data.data || []).filter((r) => r.status === 'pending'));
                setRecentPatients((patientsRes.data.data || []).slice(0, 5));
            } catch (err) {
                console.error('Error loading doctor dashboard:', err);
                showToast(t('doctorDash.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [t]);

    const doctor = doctorProfile?.doctor;
    const displayName = user.name || doctor?.name || 'Doctor';
    const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
    });

    const filteredQueue = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return appointments.filter(
            (a) =>
                a.patient_name?.toLowerCase().includes(q) ||
                (a.token_number || '').toLowerCase().includes(q)
        );
    }, [appointments, searchQuery]);

    const statCards = [
        { label: t('doctorDash.todayAppts'), value: stats.todayAppointments ?? 0, icon: Calendar, tone: 'from-primary-500 to-primary-700' },
        { label: t('doctorDash.waiting'), value: stats.waitingQueue ?? 0, icon: Hourglass, tone: 'from-amber-500 to-orange-600' },
        { label: t('doctorDash.inConsult'), value: stats.inConsultation ?? 0, icon: Stethoscope, tone: 'from-violet-500 to-purple-700' },
        { label: t('doctorDash.completed'), value: stats.completedToday ?? 0, icon: CheckCircle2, tone: 'from-emerald-500 to-green-700' },
        { label: t('doctorDash.totalPatients'), value: stats.totalPatients ?? 0, icon: Users, tone: 'from-sky-500 to-blue-700' },
        { label: t('doctorDash.ipd'), value: stats.ipdAdmitted ?? 0, icon: BedDouble, tone: 'from-rose-500 to-red-700' },
        { label: t('doctorDash.rxToday'), value: stats.prescriptionsToday ?? 0, icon: Pill, tone: 'from-teal-500 to-cyan-700' },
        { label: t('doctorDash.pendingLabs'), value: stats.pendingReports ?? 0, icon: FlaskConical, tone: 'from-slate-600 to-slate-800' },
    ];

    const quickLinks = [
        { to: '/doctor/queue', label: t('doctorDash.writeRx'), icon: FileText, color: 'bg-primary-50 text-primary-700' },
        { to: '/doctor/patients', label: t('doctorDash.myPatients'), icon: UserRound, color: 'bg-sky-50 text-sky-700' },
        { to: '/doctor/labs', label: t('doctorDash.labOrders'), icon: FlaskConical, color: 'bg-violet-50 text-violet-700' },
        { to: '/doctor/ipd', label: t('doctorDash.ipdWard'), icon: BedDouble, color: 'bg-rose-50 text-rose-700' },
        { to: '/doctor/profile', label: t('nav.profile'), icon: Stethoscope, color: 'bg-slate-50 text-slate-700' },
    ];

    const callPatient = async (appt) => {
        try {
            if (appt.token_id) {
                await API.patch('/queue/token-status', {
                    token_id: appt.token_id,
                    status: 'in_consultation'
                });
            }
            navigate('/doctor/queue', {
                state: { patient: { ...appt, patient_id: appt.patient_id } }
            });
        } catch {
            showToast(t('doctorDash.callFailed'), 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Hero */}
            <Card className="border-none shadow-premium overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800 text-white">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-bold shrink-0 ring-2 ring-white/20">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-primary-200 text-xs font-semibold uppercase tracking-wider">{t('doctorDash.greeting')}</p>
                            <h2 className="text-2xl md:text-3xl font-bold font-['Outfit'] mt-1">Dr. {displayName}</h2>
                            <p className="text-primary-100 text-sm mt-1">
                                {doctor?.specialization || t('doctorDash.specialist')}
                                {doctor?.department_name ? ` · ${doctor.department_name}` : ''}
                                {doctor?.room_number ? ` · ${t('doctorDash.room')} ${doctor.room_number}` : ''}
                            </p>
                            <p className="text-primary-200/80 text-xs mt-2 flex items-center gap-2">
                                <Calendar size={14} /> {todayLabel}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                                onClick={() => navigate('/doctor/queue')}
                                className="bg-white text-primary-800 hover:bg-primary-50 shadow-lg font-bold"
                            >
                                <Stethoscope size={18} className="mr-2" />
                                {t('doctorDash.openQueue')}
                            </Button>
                            <Link to="/doctor/labs">
                                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                                    <FlaskConical size={18} className="mr-2" />
                                    {t('doctorDash.labs')} ({stats.pendingReports ?? 0})
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map((stat) => (
                    <Card key={stat.label} className="border-none shadow-premium overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-0">
                            <div className={`bg-gradient-to-br ${stat.tone} p-4 text-white`}>
                                <div className="flex items-start justify-between">
                                    <stat.icon size={22} className="opacity-90" />
                                    <span className="text-2xl font-bold font-['Outfit']">
                                        {loading ? '—' : stat.value}
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wide mt-3 opacity-90 leading-tight">
                                    {stat.label}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {quickLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white shadow-premium border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all text-center group"
                    >
                        <div className={`p-2.5 rounded-xl ${link.color} group-hover:scale-110 transition-transform`}>
                            <link.icon size={20} />
                        </div>
                        <span className="text-[11px] font-bold text-secondary-700 leading-tight">{link.label}</span>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* OPD Queue */}
                <Card className="lg:col-span-2 border-none shadow-premium bg-white">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-slate-50">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock size={20} className="text-primary-600" />
                                {t('doctorDash.liveQueue')}
                            </CardTitle>
                            <p className="text-xs text-secondary-500 mt-0.5">
                                {t('doctorDash.queueSubtitle', { count: appointments.length })}
                            </p>
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('doctorDash.searchPlaceholder')}
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs w-full sm:w-48 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <p className="p-8 text-center text-sm text-secondary-400 animate-pulse">{t('doctorDash.loadingQueue')}</p>
                        ) : filteredQueue.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <Users size={24} className="text-secondary-400" />
                                </div>
                                <p className="text-sm font-semibold text-secondary-600">{t('doctorDash.emptyQueue')}</p>
                                <p className="text-xs text-secondary-400 mt-1">{t('doctorDash.emptyQueueHint')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                                {filteredQueue.map((appt) => (
                                    <div
                                        key={appt.id}
                                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gradient-to-r hover:from-primary-50/40 hover:to-transparent transition-all"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="bg-gradient-to-br from-primary-100 to-primary-50 px-3 py-2 rounded-xl border border-primary-100 shrink-0">
                                                <p className="text-sm font-bold text-primary-800">{appt.token_number || `T-${appt.id}`}</p>
                                                <p className="text-[9px] text-primary-600 font-semibold text-center">
                                                    {appt.appointment_time?.slice(0, 5) || '—'}
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-bold text-secondary-900 truncate">{appt.patient_name}</p>
                                                    <span className="text-[10px] text-secondary-500 font-medium">
                                                        {appt.age} {t('doctorDash.yrs')} · {appt.gender}
                                                        {appt.blood_group ? ` · ${appt.blood_group}` : ''}
                                                    </span>
                                                </div>
                                                {appt.patient_phone && (
                                                    <p className="text-xs text-secondary-500 flex items-center gap-1 mt-0.5">
                                                        <Phone size={11} /> {appt.patient_phone}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    <Badge variant={appt.priority === 'emergency' ? 'danger' : 'secondary'}>
                                                        {appt.priority === 'emergency' ? t('doctorDash.emergency') : t('doctorDash.regular')}
                                                    </Badge>
                                                    {appt.token_status && (
                                                        <Badge variant={tokenStatusVariant(appt.token_status)}>
                                                            {(appt.token_status || '').replace('_', ' ')}
                                                        </Badge>
                                                    )}
                                                    <Badge variant={appt.status === 'completed' ? 'success' : appt.status === 'pending' ? 'warning' : 'secondary'}>
                                                        {appt.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => callPatient(appt)}
                                            disabled={appt.status === 'completed'}
                                            className="shrink-0 h-9 px-5 text-xs font-bold rounded-xl shadow-sm"
                                        >
                                            {t('doctorDash.callPatient')}
                                            <ArrowRight size={14} className="ml-1" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate('/doctor/queue')}
                            className="w-full text-xs font-bold py-3.5 text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1 border-t border-slate-50"
                        >
                            {t('doctorDash.fullQueue')} <Plus size={14} />
                        </button>
                    </CardContent>
                </Card>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* IPD */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <BedDouble size={16} className="text-rose-600" />
                                {t('doctorDash.ipdToday')}
                            </CardTitle>
                            <Link to="/doctor/ipd" className="text-[10px] font-bold text-primary-600">{t('doctorDash.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            {ipdPatients.length === 0 ? (
                                <p className="text-xs text-secondary-400 text-center py-4">{t('doctorDash.noIpd')}</p>
                            ) : (
                                ipdPatients.slice(0, 4).map((p) => (
                                    <div key={p.id} className="p-3 rounded-xl bg-rose-50/50 border border-rose-100/80">
                                        <p className="text-xs font-bold text-secondary-900">{p.patient_name}</p>
                                        <p className="text-[10px] text-secondary-500 mt-0.5">
                                            {p.ward_name} · {t('doctorDash.bed')} {p.bed_number}
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending labs */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <FlaskConical size={16} className="text-violet-600" />
                                {t('doctorDash.pendingLabsTitle')}
                            </CardTitle>
                            <Link to="/doctor/labs" className="text-[10px] font-bold text-primary-600">{t('doctorDash.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            {labRequests.length === 0 ? (
                                <p className="text-xs text-secondary-400 text-center py-4">{t('doctorDash.noLabs')}</p>
                            ) : (
                                labRequests.slice(0, 4).map((r) => (
                                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-violet-200 transition-colors">
                                        <div>
                                            <p className="text-xs font-bold text-secondary-900">{r.patient_name}</p>
                                            <p className="text-[10px] text-secondary-500">{r.test_name}</p>
                                        </div>
                                        <Badge variant="warning">{r.status}</Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent patients */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Users size={16} className="text-primary-600" />
                                {t('doctorDash.recentPatients')}
                            </CardTitle>
                            <Link to="/doctor/patients" className="text-[10px] font-bold text-primary-600">{t('doctorDash.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            {recentPatients.length === 0 ? (
                                <p className="text-xs text-secondary-400 text-center py-4">{t('doctorDash.noPatients')}</p>
                            ) : (
                                recentPatients.map((p) => (
                                    <button
                                        key={p.patient_id}
                                        type="button"
                                        onClick={() => navigate('/doctor/queue', { state: { patient: p } })}
                                        className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                                    >
                                        <p className="text-xs font-bold text-secondary-900">{p.name}</p>
                                        <p className="text-[10px] text-secondary-500">
                                            {p.last_visit ? new Date(p.last_visit).toLocaleDateString() : '—'}
                                        </p>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Tips */}
                    <Card className="border-none shadow-premium bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                        <CardContent className="p-4 flex gap-3">
                            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-amber-900">{t('doctorDash.tipTitle')}</p>
                                <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed">{t('doctorDash.tipBody')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DoctorHome;
