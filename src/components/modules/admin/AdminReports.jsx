import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { downloadDischargeSummaryPdf } from '../../../utils/pdfExport';
import {
    FileText,
    RefreshCw,
    Search,
    Printer,
    Download,
    BarChart3,
    Shield,
    CreditCard,
    BedDouble,
    ClipboardList
} from 'lucide-react';

const stayDays = (admissionDate, dischargeDate) => {
    const end = dischargeDate ? new Date(dischargeDate).getTime() : Date.now();
    const start = new Date(admissionDate).getTime();
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
};

const AdminReports = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [tab, setTab] = useState('discharge');
    const [admitted, setAdmitted] = useState([]);
    const [discharged, setDischarged] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    const [searchAdmitted, setSearchAdmitted] = useState('');
    const [selectedId, setSelectedId] = useState(location.state?.admissionId || null);
    const [admission, setAdmission] = useState(null);
    const [summary, setSummary] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);

    const [historyFrom, setHistoryFrom] = useState('');
    const [historyTo, setHistoryTo] = useState('');
    const [historyView, setHistoryView] = useState(null);

    const loadAdmitted = useCallback(async () => {
        const res = await API.get('/admin/admissions');
        setAdmitted(res.data.data || []);
    }, []);

    const loadDischarged = useCallback(async () => {
        const params = {};
        if (historyFrom) params.from = historyFrom;
        if (historyTo) params.to = historyTo;
        const res = await API.get('/admin/admissions/discharged/list', { params });
        const payload = res.data.data;
        setDischarged(payload?.admissions || []);
        setStats(payload?.stats || {});
    }, [historyFrom, historyTo]);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([loadAdmitted(), loadDischarged()]);
        } catch (err) {
            showToast(t('adminReports.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    }, [loadAdmitted, loadDischarged, t]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        if (tab === 'history') loadDischarged();
    }, [historyFrom, historyTo, tab, loadDischarged]);

    useEffect(() => {
        if (location.state?.admissionId) {
            setSelectedId(location.state.admissionId);
            setTab('discharge');
        }
    }, [location.state?.admissionId]);

    const loadAdmissionDetail = useCallback(async (id) => {
        if (!id) {
            setAdmission(null);
            return;
        }
        setDetailLoading(true);
        try {
            const res = await API.get(`/admin/admissions/${id}`);
            setAdmission(res.data.data);
        } catch (err) {
            showToast(t('adminReports.loadError'), 'error');
            setAdmission(null);
        } finally {
            setDetailLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadAdmissionDetail(selectedId);
    }, [selectedId, loadAdmissionDetail]);

    const filteredAdmitted = useMemo(() => {
        const q = searchAdmitted.trim().toLowerCase();
        if (!q) return admitted;
        return admitted.filter(
            (a) =>
                (a.patient_name || '').toLowerCase().includes(q) ||
                (a.ward_name || '').toLowerCase().includes(q) ||
                (a.doctor_name || '').toLowerCase().includes(q) ||
                String(a.bed_number || '').includes(q)
        );
    }, [admitted, searchAdmitted]);

    const handleDischarge = async () => {
        if (!selectedId) return;
        try {
            await API.post('/admin/discharge', {
                admission_id: selectedId,
                discharge_summary: summary
            });
            showToast(t('adminReports.dischargedSuccess'));
            setSummary('');
            setSelectedId(null);
            setAdmission(null);
            loadAll();
            setTab('history');
        } catch (err) {
            showToast(t('adminReports.dischargeFailed'), 'error');
        }
    };

    const printTarget = admission || historyView;

    const DischargeDocument = ({ data, notes, showForm }) => (
        <Card className="border-none shadow-premium print-area print:shadow-none">
            <CardHeader className="border-b p-6 md:p-8">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{t('app.name')}</h1>
                        <p className="text-sm text-secondary-500">{t('adminReports.dischargeForm')}</p>
                    </div>
                    <Badge variant={data.status === 'discharged' ? 'secondary' : 'success'}>
                        {data.status === 'discharged' ? t('adminReports.statusDischarged') : t('adminReports.statusAdmitted')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-[10px] font-bold text-secondary-400 uppercase">Patient</p>
                        <p className="font-bold">{data.patient_name}</p>
                        <p className="text-xs text-secondary-500">
                            {data.age}Y / {data.gender} | {data.blood_group || '—'}
                        </p>
                        {data.patient_phone && <p className="text-xs">{data.patient_phone}</p>}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-secondary-400 uppercase">Stay</p>
                        <p className="font-bold">{data.ward_name} — Bed {data.bed_number}</p>
                        <p className="text-xs">Admitted: {new Date(data.admission_date).toLocaleString()}</p>
                        {data.discharge_date && (
                            <p className="text-xs">Discharged: {new Date(data.discharge_date).toLocaleString()}</p>
                        )}
                        <p className="text-xs font-medium mt-1">
                            {t('adminReports.stayDays', { count: stayDays(data.admission_date, data.discharge_date) })}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-secondary-400 uppercase">Doctor</p>
                        <p className="font-bold">{data.doctor_name}</p>
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-secondary-400 uppercase mb-2">{t('adminReports.admissionDiagnosis')}</p>
                    <p className="text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded-xl">{data.diagnosis || '—'}</p>
                </div>
                {showForm ? (
                    <div className="no-print">
                        <label className="text-xs font-bold text-secondary-500">{t('adminReports.dischargeNotes')}</label>
                        <textarea
                            className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm min-h-[120px]"
                            value={notes}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder={t('adminReports.dischargePlaceholder')}
                        />
                    </div>
                ) : (
                    <div>
                        <p className="text-[10px] font-bold text-secondary-400 uppercase mb-2">{t('adminReports.dischargeNotes')}</p>
                        <p className="text-sm whitespace-pre-wrap">{data.diagnosis || '—'}</p>
                    </div>
                )}
            </CardContent>
            {showForm && (
                <CardFooter className="no-print gap-2 flex-wrap">
                    <Button onClick={handleDischarge}>{t('adminReports.confirmDischarge')}</Button>
                    <Button variant="outline" onClick={() => window.print()} className="gap-2">
                        <Printer size={16} /> {t('adminReports.print')}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <FileText className="text-indigo-600" size={28} />
                        {t('adminReports.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminReports.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadAll} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminReports.refresh')}
                    </Button>
                    <Link to="/admin/ipd">
                        <Button variant="outline" className="gap-2">
                            <BedDouble size={16} />
                            {t('adminReports.goIpd')}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 no-print">
                {[
                    { label: t('adminReports.admittedNow'), value: stats.currently_admitted ?? admitted.length, color: 'text-rose-600' },
                    { label: t('adminReports.dischargedTotal'), value: stats.total_discharged ?? discharged.length, color: 'text-secondary-800' },
                    { label: t('adminReports.dischargedMonth'), value: stats.discharged_this_month ?? 0, color: 'text-green-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex gap-1 border-b border-slate-100 no-print">
                {[
                    { id: 'discharge', label: t('adminReports.tabDischarge') },
                    { id: 'history', label: t('adminReports.tabHistory') },
                    { id: 'quick', label: t('adminReports.tabQuick') }
                ].map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
                            tab === item.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-secondary-500'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === 'discharge' && (
                <div className="grid lg:grid-cols-5 gap-4">
                    <Card className="lg:col-span-2 border-none shadow-premium no-print">
                        <CardHeader className="border-b border-slate-50 space-y-3">
                            <CardTitle className="text-sm">{t('adminReports.selectPatient')}</CardTitle>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <input
                                    value={searchAdmitted}
                                    onChange={(e) => setSearchAdmitted(e.target.value)}
                                    placeholder={t('adminReports.searchPatient')}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[420px] overflow-y-auto">
                            {filteredAdmitted.length === 0 ? (
                                <p className="p-6 text-sm text-center text-secondary-400">{t('adminReports.noAdmitted')}</p>
                            ) : (
                                <ul className="divide-y divide-slate-50">
                                    {filteredAdmitted.map((a) => (
                                        <li key={a.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedId(a.id)}
                                                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                                                    selectedId === a.id ? 'bg-indigo-50' : ''
                                                }`}
                                            >
                                                <p className="font-bold text-sm">{a.patient_name}</p>
                                                <p className="text-xs text-secondary-500">
                                                    {a.ward_name} · Bed {a.bed_number}
                                                </p>
                                                <p className="text-[10px] text-secondary-400 mt-1">{a.doctor_name}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-3">
                        {detailLoading ? (
                            <p className="text-secondary-400">{t('common.loading')}</p>
                        ) : admission ? (
                            <>
                                <div className="flex justify-end gap-2 mb-3 no-print">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => downloadDischargeSummaryPdf(admission, summary)}
                                    >
                                        <Download size={14} /> {t('adminReports.downloadPdf')}
                                    </Button>
                                </div>
                                <DischargeDocument data={admission} notes={summary} showForm />
                            </>
                        ) : (
                            <Card className="p-12 text-center border-none shadow-premium no-print">
                                <ClipboardList size={40} className="mx-auto text-secondary-300 mb-3" />
                                <p className="text-secondary-500">{t('adminReports.selectPatient')}</p>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {tab === 'history' && (
                <div className="grid lg:grid-cols-5 gap-4">
                    <Card className="lg:col-span-2 border-none shadow-premium no-print">
                        <CardHeader className="border-b space-y-3">
                            <CardTitle className="text-sm">{t('adminReports.historyTitle')}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                                <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="max-w-[140px]" />
                                <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="max-w-[140px]" />
                                <Button variant="outline" size="sm" onClick={loadDischarged}>{t('adminReports.refresh')}</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[480px] overflow-y-auto">
                            {discharged.length === 0 ? (
                                <p className="p-6 text-sm text-center text-secondary-400">{t('adminReports.noHistory')}</p>
                            ) : (
                                <ul className="divide-y divide-slate-50">
                                    {discharged.map((a) => (
                                        <li key={a.id}>
                                            <button
                                                type="button"
                                                onClick={() => setHistoryView(a)}
                                                className={`w-full text-left p-4 hover:bg-slate-50 ${
                                                    historyView?.id === a.id ? 'bg-indigo-50' : ''
                                                }`}
                                            >
                                                <p className="font-bold text-sm">{a.patient_name}</p>
                                                <p className="text-xs text-secondary-500">
                                                    {new Date(a.discharge_date).toLocaleDateString()} · {a.ward_name}
                                                </p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                    <div className="lg:col-span-3">
                        {historyView ? (
                            <>
                                <div className="flex justify-end gap-2 mb-3 no-print">
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
                                        <Printer size={14} /> {t('adminReports.print')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => downloadDischargeSummaryPdf(historyView)}
                                    >
                                        <Download size={14} /> {t('adminReports.downloadPdf')}
                                    </Button>
                                </div>
                                <DischargeDocument data={historyView} notes="" showForm={false} />
                            </>
                        ) : (
                            <Card className="p-12 text-center border-none shadow-premium no-print">
                                <p className="text-secondary-500">{t('adminReports.viewSummary')}</p>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {tab === 'quick' && (
                <div className="grid md:grid-cols-3 gap-4 no-print">
                    {[
                        { to: '/admin/analytics', icon: BarChart3, title: t('adminReports.quickAnalytics'), desc: t('adminReports.quickAnalyticsDesc'), color: 'bg-indigo-50 text-indigo-700' },
                        { to: '/admin/audit', icon: Shield, title: t('adminReports.quickAudit'), desc: t('adminReports.quickAuditDesc'), color: 'bg-slate-50 text-slate-700' },
                        { to: '/admin/billing', icon: CreditCard, title: t('adminReports.quickBilling'), desc: t('adminReports.quickBillingDesc'), color: 'bg-green-50 text-green-700' }
                    ].map((link) => (
                        <Link key={link.to} to={link.to}>
                            <Card className="border-none shadow-premium hover:shadow-md transition-shadow h-full">
                                <CardContent className="p-6">
                                    <div className={`p-3 rounded-xl w-fit mb-3 ${link.color}`}>
                                        <link.icon size={22} />
                                    </div>
                                    <p className="font-bold">{link.title}</p>
                                    <p className="text-xs text-secondary-500 mt-1">{link.desc}</p>
                                    <span className="text-xs font-bold text-primary-600 mt-3 inline-block">{t('adminReports.open')} →</span>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {printTarget && tab !== 'quick' && (
                <div className="hidden print:block">
                    <DischargeDocument data={printTarget} notes={summary} showForm={false} />
                </div>
            )}
        </div>
    );
};

export default AdminReports;
