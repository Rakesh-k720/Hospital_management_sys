import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Users, Calendar, DollarSign, Bed, Activity, Plus, Stethoscope,
    FlaskConical, ClipboardList, AlertCircle, TrendingUp, BarChart3,
    Settings, Package, Building2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

const AdminHome = () => {
    const { t } = useTranslation();
    const today = new Date().toISOString().slice(0, 10);

    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [queue, setQueue] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [statsRes, actRes, apptRes, queueRes, analyticsRes] = await Promise.all([
                    API.get('/admin/dashboard'),
                    API.get('/admin/activity'),
                    API.get('/admin/appointments', { params: { date: today } }),
                    API.get('/queue/opd', { params: { date: today } }),
                    API.get('/analytics/dashboard')
                ]);
                setStats(statsRes.data.data);
                setActivity(actRes.data.data || []);
                const apptPayload = apptRes.data.data;
                const apptList = Array.isArray(apptPayload)
                    ? apptPayload
                    : apptPayload?.appointments || [];
                setAppointments(apptList.slice(0, 6));
                setQueue((queueRes.data.data?.queue || []).slice(0, 6));
                setAnalytics(analyticsRes.data.data);
            } catch (err) {
                console.error(err);
                showToast(t('adminDash.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [today, t]);

    const bedOccupancyPct = useMemo(() => {
        if (!stats?.totalBeds) return 0;
        return Math.round(((stats.occupiedBeds || 0) / stats.totalBeds) * 100);
    }, [stats]);

    const statCards = useMemo(() => {
        if (!stats) return [];
        return [
            { label: t('adminDash.patients'), value: stats.totalPatients, icon: Users, tone: 'from-primary-500 to-primary-700' },
            { label: t('adminDash.doctors'), value: stats.totalDoctors, icon: Stethoscope, tone: 'from-emerald-500 to-green-700' },
            { label: t('adminDash.todayAppts'), value: stats.todayAppointments, icon: Calendar, tone: 'from-amber-500 to-orange-600' },
            { label: t('adminDash.revenue'), value: `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}`, icon: DollarSign, tone: 'from-sky-500 to-blue-700' },
            { label: t('adminDash.beds'), value: `${stats.availableBeds}/${stats.totalBeds}`, icon: Bed, tone: 'from-rose-500 to-red-700' },
            { label: t('adminDash.opdWaiting'), value: stats.waitingPatients, icon: ClipboardList, tone: 'from-violet-500 to-purple-700' },
            { label: t('adminDash.unpaidBills'), value: stats.unpaidBills, icon: AlertCircle, tone: 'from-red-500 to-rose-700' },
            { label: t('adminDash.ipd'), value: stats.ipdAdmitted, icon: Bed, tone: 'from-teal-500 to-cyan-700' },
        ];
    }, [stats, t]);

    const quickLinks = [
        { to: '/admin/opd', label: t('nav.opd'), icon: ClipboardList, color: 'bg-primary-50 text-primary-700' },
        { to: '/admin/ipd', label: t('nav.ipd'), icon: Bed, color: 'bg-rose-50 text-rose-700' },
        { to: '/admin/appointments', label: t('nav.appointments'), icon: Calendar, color: 'bg-amber-50 text-amber-700' },
        { to: '/admin/billing', label: t('nav.billing'), icon: DollarSign, color: 'bg-green-50 text-green-700' },
        { to: '/admin/lab', label: t('nav.laboratory'), icon: FlaskConical, color: 'bg-violet-50 text-violet-700' },
        { to: '/admin/doctors', label: t('nav.doctors'), icon: Stethoscope, color: 'bg-sky-50 text-sky-700' },
        { to: '/admin/patients', label: t('nav.patients'), icon: Users, color: 'bg-slate-50 text-slate-700' },
        { to: '/admin/analytics', label: t('nav.analytics'), icon: BarChart3, color: 'bg-indigo-50 text-indigo-700' },
        { to: '/admin/inventory', label: t('nav.inventory'), icon: Package, color: 'bg-orange-50 text-orange-700' },
        { to: '/admin/departments', label: t('nav.departments'), icon: Building2, color: 'bg-cyan-50 text-cyan-700' },
        { to: '/admin/settings', label: t('nav.settings'), icon: Settings, color: 'bg-slate-50 text-slate-600' },
        { to: '/admin/audit', label: t('nav.audit'), icon: Activity, color: 'bg-slate-50 text-slate-600' },
    ];

    const activityVariant = (status) => {
        if (status === 'paid' || status === 'completed') return 'success';
        if (status === 'cancelled') return 'danger';
        return 'warning';
    };

    return (
        <div className="space-y-6">
            {/* Hero */}
            <Card className="border-none shadow-premium overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800 text-white">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <p className="text-primary-200 text-xs font-semibold uppercase tracking-wider">{t('adminDash.greeting')}</p>
                            <h2 className="text-2xl md:text-3xl font-bold font-['Outfit'] mt-1">{t('adminDash.title')}</h2>
                            <p className="text-primary-100 text-sm mt-2">{t('adminDash.subtitle')}</p>
                            <p className="text-primary-200/80 text-xs mt-2 flex items-center gap-2">
                                <Calendar size={14} />
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link to="/admin/ipd">
                                <Button className="bg-white text-primary-800 hover:bg-primary-50 shadow-lg font-bold gap-2">
                                    <Plus size={18} /> {t('adminDash.newAdmission')}
                                </Button>
                            </Link>
                            <Link to="/admin/billing">
                                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                                    {t('nav.billing')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alerts */}
            {!loading && stats && (stats.unpaidBills > 0 || stats.waitingPatients > 0 || bedOccupancyPct >= 85) && (
                <div className="grid md:grid-cols-3 gap-3">
                    {stats.unpaidBills > 0 && (
                        <Card className="border-amber-200 bg-amber-50 border shadow-sm">
                            <CardContent className="p-4 flex gap-3">
                                <AlertCircle className="text-amber-600 shrink-0" size={22} />
                                <div>
                                    <p className="text-sm font-bold text-amber-900">{t('adminDash.alertUnpaid', { count: stats.unpaidBills })}</p>
                                    <p className="text-xs text-amber-800 mt-0.5">₹{Number(stats.pendingRevenue).toLocaleString('en-IN')} {t('adminDash.pendingAmount')}</p>
                                    <Link to="/admin/billing" className="text-xs font-bold text-amber-700 underline mt-1 inline-block">{t('adminDash.viewBills')}</Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {stats.waitingPatients > 0 && (
                        <Card className="border-violet-200 bg-violet-50 border shadow-sm">
                            <CardContent className="p-4 flex gap-3">
                                <ClipboardList className="text-violet-600 shrink-0" size={22} />
                                <div>
                                    <p className="text-sm font-bold text-violet-900">{t('adminDash.alertOpd', { count: stats.waitingPatients })}</p>
                                    <Link to="/admin/opd" className="text-xs font-bold text-violet-700 underline mt-1 inline-block">{t('adminDash.viewOpd')}</Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {bedOccupancyPct >= 85 && (
                        <Card className="border-rose-200 bg-rose-50 border shadow-sm">
                            <CardContent className="p-4 flex gap-3">
                                <Bed className="text-rose-600 shrink-0" size={22} />
                                <div>
                                    <p className="text-sm font-bold text-rose-900">{t('adminDash.alertBeds', { pct: bedOccupancyPct })}</p>
                                    <Link to="/admin/ipd" className="text-xs font-bold text-rose-700 underline mt-1 inline-block">{t('adminDash.viewBeds')}</Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Stats */}
            {loading ? (
                <p className="text-sm text-secondary-400 animate-pulse py-8 text-center">{t('adminDash.loading')}</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                    {statCards.map((stat) => (
                        <Card key={stat.label} className="border-none shadow-premium overflow-hidden hover:scale-[1.02] transition-transform">
                            <CardContent className={`p-4 bg-gradient-to-br ${stat.tone} text-white`}>
                                <stat.icon size={18} className="opacity-90 mb-2" />
                                <p className="text-lg font-bold font-['Outfit'] leading-tight">{stat.value}</p>
                                <p className="text-[9px] font-bold uppercase mt-1 opacity-90 leading-tight">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Quick links */}
            <Card className="border-none shadow-premium">
                <CardHeader><CardTitle className="text-base">{t('adminDash.quickActions')}</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {quickLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all text-center"
                            >
                                <div className={`p-2 rounded-xl ${link.color}`}>
                                    <link.icon size={18} />
                                </div>
                                <span className="text-[10px] font-bold text-secondary-700 leading-tight">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Charts row */}
            {!loading && analytics && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-sm">{t('adminDash.revenueChart')}</CardTitle>
                            <Link to="/admin/analytics" className="text-xs text-primary-600 font-bold">{t('adminDash.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.revenueByMonth || []}>
                                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 9 }} />
                                    <Tooltip />
                                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-sm">{t('adminDash.apptChart')}</CardTitle>
                            <Link to="/admin/analytics" className="text-xs text-primary-600 font-bold">{t('adminDash.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.appointmentsTrend || []}>
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Today appointments */}
                <Card className="border-none shadow-premium">
                    <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-slate-50">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar size={18} className="text-primary-600" />
                            {t('adminDash.todaySchedule')}
                        </CardTitle>
                        <Link to="/admin/appointments" className="text-xs font-bold text-primary-600">{t('adminDash.viewAll')}</Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {appointments.length === 0 ? (
                            <p className="p-6 text-center text-xs text-secondary-400">{t('adminDash.noAppts')}</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {appointments.map((a) => (
                                    <div key={a.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                        <div>
                                            <p className="text-sm font-bold text-secondary-900">{a.patient_name}</p>
                                            <p className="text-[10px] text-secondary-500">Dr. {a.doctor_name} · {a.department_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold">{a.token_number || a.appointment_time?.slice(0, 5)}</p>
                                            <Badge variant={activityVariant(a.status)} className="mt-1 text-[9px]">{a.status}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* OPD queue */}
                <Card className="border-none shadow-premium">
                    <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-slate-50">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardList size={18} className="text-violet-600" />
                            {t('adminDash.liveOpd')}
                        </CardTitle>
                        <Link to="/admin/opd" className="text-xs font-bold text-primary-600">{t('adminDash.viewAll')}</Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {queue.length === 0 ? (
                            <p className="p-6 text-center text-xs text-secondary-400">{t('adminDash.noQueue')}</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {queue.map((q) => (
                                    <div key={q.token_id} className="p-3 flex items-center justify-between hover:bg-violet-50/30">
                                        <div>
                                            <p className="text-sm font-bold text-primary-800">{q.token_number}</p>
                                            <p className="text-xs text-secondary-700">{q.patient_name}</p>
                                            <p className="text-[10px] text-secondary-500">Dr. {q.doctor_name}</p>
                                        </div>
                                        <Badge variant={q.token_status === 'waiting' ? 'warning' : q.token_status === 'in_consultation' ? 'info' : 'success'}>
                                            {(q.token_status || '').replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Department load + bed stats */}
            {!loading && analytics && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-none shadow-premium">
                        <CardHeader><CardTitle className="text-sm">{t('adminDash.deptLoad')}</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {(analytics.deptLoad || []).slice(0, 5).map((d) => (
                                <div key={d.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                    <span className="text-sm font-medium text-secondary-800">{d.name}</span>
                                    <Badge variant="secondary">{d.appointments} {t('adminDash.appts')}</Badge>
                                </div>
                            ))}
                            {(analytics.deptLoad || []).length === 0 && (
                                <p className="text-xs text-secondary-400">{t('adminDash.noData')}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-premium">
                        <CardHeader><CardTitle className="text-sm">{t('adminDash.bedStatus')}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {(analytics.bedStats || []).map((b) => (
                                <div key={b.status} className="flex items-center justify-between">
                                    <span className="text-sm capitalize text-secondary-700">{b.status}</span>
                                    <span className="font-bold text-secondary-900">{b.count}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-slate-100">
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full bg-rose-500 rounded-full transition-all"
                                        style={{ width: `${bedOccupancyPct}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-secondary-500 mt-1">{bedOccupancyPct}% {t('adminDash.occupied')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Recent activity */}
            <Card className="border-none shadow-premium overflow-x-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-primary-600" />
                        {t('adminDash.recentActivity')}
                    </CardTitle>
                    <Link to="/admin/audit" className="text-xs font-bold text-primary-600">{t('adminDash.auditLogs')}</Link>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('adminDash.colType')}</TableHead>
                                <TableHead>{t('adminDash.colPatient')}</TableHead>
                                <TableHead>{t('adminDash.colDetails')}</TableHead>
                                <TableHead>{t('adminDash.colStatus')}</TableHead>
                                <TableHead className="text-right">{t('adminDash.colTime')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activity.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-secondary-400 py-8">
                                        {t('adminDash.noActivity')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activity.map((a, i) => (
                                    <TableRow key={i} className="hover:bg-slate-50/80">
                                        <TableCell className="capitalize font-medium">{a.type}</TableCell>
                                        <TableCell className="font-bold">{a.patient}</TableCell>
                                        <TableCell>{a.detail}</TableCell>
                                        <TableCell>
                                            <Badge variant={activityVariant(a.status)}>{a.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-secondary-400">
                                            {new Date(a.time).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminHome;
