import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Button from '../../ui/Button';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import {
    BarChart3,
    RefreshCw,
    Download,
    Calendar,
    IndianRupee,
    FlaskConical,
    BedDouble,
    Users
} from 'lucide-react';

const PIE_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444'];

const AdminAnalytics = () => {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/analytics/dashboard');
            setData(res.data.data);
        } catch (err) {
            showToast(t('adminAnalytics.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const exportSummary = () => {
        if (!data?.summary) return;
        const s = data.summary;
        const rows = [
            ['Metric', 'Value'],
            [t('adminAnalytics.todayAppts'), s.today_appointments],
            [t('adminAnalytics.monthRevenue'), s.month_revenue],
            [t('adminAnalytics.unpaidBills'), s.unpaid_bills],
            [t('adminAnalytics.pendingAmount'), s.unpaid_amount],
            [t('adminAnalytics.pendingLabs'), s.pending_labs],
            [t('adminAnalytics.ipdPatients'), s.ipd_patients],
            [t('adminAnalytics.opdToday'), s.today_opd_tokens],
            [t('adminAnalytics.bedOccupancy'), `${s.bed_occupancy_pct}%`],
            [t('adminAnalytics.patients'), s.total_patients],
            [t('adminAnalytics.doctors'), s.total_doctors]
        ];
        const csv = rows.map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hospital-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <p className="text-secondary-400 animate-pulse p-8">{t('adminAnalytics.loading')}</p>;
    }

    if (!data) {
        return (
            <div className="text-center p-12">
                <p className="text-secondary-500">{t('adminAnalytics.loadError')}</p>
                <Button className="mt-4" onClick={load}>{t('adminAnalytics.refresh')}</Button>
            </div>
        );
    }

    const summary = data.summary || {};
    const kpiCards = [
        { label: t('adminAnalytics.todayAppts'), value: summary.today_appointments ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: t('adminAnalytics.monthRevenue'), value: `₹${Math.round(Number(summary.month_revenue) || 0)}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
        { label: t('adminAnalytics.unpaidBills'), value: summary.unpaid_bills ?? 0, icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50', sub: `₹${Math.round(Number(summary.unpaid_amount) || 0)}` },
        { label: t('adminAnalytics.pendingLabs'), value: summary.pending_labs ?? 0, icon: FlaskConical, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: t('adminAnalytics.ipdPatients'), value: summary.ipd_patients ?? 0, icon: BedDouble, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: t('adminAnalytics.opdToday'), value: summary.today_opd_tokens ?? 0, icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' },
        { label: t('adminAnalytics.bedOccupancy'), value: `${summary.bed_occupancy_pct ?? 0}%`, icon: BedDouble, color: 'text-secondary-800', bg: 'bg-slate-50' },
        { label: t('adminAnalytics.patients'), value: summary.total_patients ?? 0, icon: Users, color: 'text-secondary-700', bg: 'bg-slate-50', sub: `${summary.total_doctors ?? 0} ${t('adminAnalytics.doctors')}` }
    ];

    const bedPie = (data.bedStats || []).map((b) => ({
        name: b.status,
        value: Number(b.count)
    }));

    const paymentPie = (data.paymentBreakdown || []).map((p) => ({
        name: p.status,
        value: Number(p.amount) || Number(p.count)
    }));

    const ChartEmpty = () => (
        <p className="flex items-center justify-center h-full text-sm text-secondary-400">{t('adminAnalytics.noData')}</p>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <BarChart3 className="text-indigo-600" size={28} />
                        {t('adminAnalytics.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminAnalytics.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportSummary} className="gap-2">
                        <Download size={16} />
                        {t('adminAnalytics.exportSummary')}
                    </Button>
                    <Button variant="outline" onClick={load} className="gap-2">
                        <RefreshCw size={16} />
                        {t('adminAnalytics.refresh')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                {kpiCards.map((k) => (
                    <Card key={k.label} className={`border-none shadow-premium ${k.bg}`}>
                        <CardContent className="p-4">
                            <k.icon size={18} className={`${k.color} mb-1`} />
                            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                            {k.sub && <p className="text-[10px] text-secondary-500">{k.sub}</p>}
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{k.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.revenueChart')}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        {(data.revenueByMonth || []).length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.revenueByMonth}>
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmpty />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.apptChart')}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        {(data.appointmentsTrend || []).length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.appointmentsTrend}>
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmpty />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.deptChart')}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        {(data.deptLoad || []).length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.deptLoad} layout="vertical" margin={{ left: 8 }}>
                                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
                                    <Tooltip />
                                    <Bar dataKey="appointments" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmpty />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.bedChart')}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        {bedPie.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={bedPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {bedPie.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmpty />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.paymentChart')}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        {paymentPie.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={paymentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {paymentPie.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `₹${v}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmpty />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.labChart')}</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        {(data.labTrend || []).length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.labTrend}>
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmpty />
                        )}
                    </CardContent>
                </Card>
            </div>

            {(data.topTests || []).length > 0 && (
                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle className="text-sm">{t('adminAnalytics.topTests')}</CardTitle></CardHeader>
                    <CardContent className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topTests}>
                                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdminAnalytics;
