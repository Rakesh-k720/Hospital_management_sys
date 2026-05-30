import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { resolveReportUrl } from '../../../utils/fileUrl';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    FlaskConical,
    Search,
    RefreshCw,
    Plus,
    X,
    Upload,
    Eye,
    Download,
    Phone,
    IndianRupee,
    Trash2,
    Pencil
} from 'lucide-react';

const statusVariant = (status) => (status === 'completed' ? 'success' : 'warning');

const LabManagement = () => {
    const { t } = useTranslation();

    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState({});
    const [catalog, setCatalog] = useState([]);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [activeTab, setActiveTab] = useState('requests');

    const [statusFilter, setStatusFilter] = useState('all');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState(null);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState(null);
    const [uploadForm, setUploadForm] = useState({ result_notes: '', file: null });
    const [uploading, setUploading] = useState(false);

    const [requestOpen, setRequestOpen] = useState(false);
    const [requestForm, setRequestForm] = useState({ patient_id: '', doctor_id: '', test_id: '' });
    const [requestSubmitting, setRequestSubmitting] = useState(false);

    const [testOpen, setTestOpen] = useState(false);
    const [editingTestId, setEditingTestId] = useState(null);
    const [testForm, setTestForm] = useState({ test_name: '', description: '', price: '' });
    const [testSubmitting, setTestSubmitting] = useState(false);

    const todayStr = new Date().toISOString().slice(0, 10);

    const fetchMeta = useCallback(async () => {
        try {
            const [catRes, patRes, docRes] = await Promise.all([
                API.get('/lab/catalog'),
                API.get('/admin/patients'),
                API.get('/admin/doctors')
            ]);
            setCatalog(catRes.data.data || []);
            const patPayload = patRes.data.data;
            setPatients(Array.isArray(patPayload) ? patPayload : patPayload?.patients || []);
            const docPayload = docRes.data.data;
            setDoctors(Array.isArray(docPayload) ? docPayload : docPayload?.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (doctorFilter) params.doctor_id = doctorFilter;
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;

            const res = await API.get('/lab/reports', { params });
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setReports(payload);
                setStats({});
            } else {
                setReports(payload?.reports || []);
                setStats(payload?.stats || {});
            }
        } catch (err) {
            showToast(err.response?.data?.message || t('adminLab.loadError'), 'error');
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, doctorFilter, fromDate, toDate, t]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(fetchReports, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchReports]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return reports;
        return reports.filter(
            (r) =>
                (r.patient_name || '').toLowerCase().includes(q) ||
                (r.test_name || '').toLowerCase().includes(q) ||
                (r.doctor_name || '').toLowerCase().includes(q) ||
                String(r.id).includes(q) ||
                (r.patient_phone || '').includes(q)
        );
    }, [reports, searchQuery]);

    const counts = useMemo(
        () => ({
            total: Number(stats.total) || reports.length,
            pending: Number(stats.pending) || reports.filter((r) => r.status === 'pending').length,
            completed: Number(stats.completed) || reports.filter((r) => r.status === 'completed').length,
            pendingValue: Number(stats.pending_value) || reports
                .filter((r) => r.status === 'pending')
                .reduce((s, r) => s + Number(r.price || 0), 0)
        }),
        [stats, reports]
    );

    const openUpload = (report) => {
        setUploadTarget(report);
        setUploadForm({ result_notes: report.result_notes || '', file: null });
        setUploadOpen(true);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadTarget || !uploadForm.file) {
            showToast(t('adminLab.uploadFailed'), 'error');
            return;
        }
        setUploading(true);
        const form = new FormData();
        form.append('report', uploadForm.file);
        form.append('report_id', uploadTarget.id);
        form.append('result_notes', uploadForm.result_notes);
        try {
            await API.post('/lab/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            showToast(t('adminLab.uploaded'));
            setUploadOpen(false);
            setUploadTarget(null);
            fetchReports();
        } catch (err) {
            showToast(err.response?.data?.message || t('adminLab.uploadFailed'), 'error');
        } finally {
            setUploading(false);
        }
    };

    const openRequestModal = () => {
        const doc = doctors[0];
        setRequestForm({
            patient_id: patients[0] ? String(patients[0].id) : '',
            doctor_id: doc ? String(doc.id) : '',
            test_id: catalog[0] ? String(catalog[0].id) : ''
        });
        setRequestOpen(true);
    };

    const submitRequest = async (e) => {
        e.preventDefault();
        setRequestSubmitting(true);
        try {
            await API.post('/lab/request', {
                patient_id: parseInt(requestForm.patient_id, 10),
                doctor_id: parseInt(requestForm.doctor_id, 10),
                test_id: parseInt(requestForm.test_id, 10)
            });
            showToast(t('adminLab.requestCreated'));
            setRequestOpen(false);
            fetchReports();
        } catch (err) {
            const msg = err.response?.status === 409
                ? t('adminLab.duplicateRequest')
                : err.response?.data?.message || 'Request failed';
            showToast(msg, 'error');
        } finally {
            setRequestSubmitting(false);
        }
    };

    const submitTest = async (e) => {
        e.preventDefault();
        setTestSubmitting(true);
        try {
            const payload = {
                test_name: testForm.test_name,
                description: testForm.description,
                price: Number(testForm.price)
            };
            if (editingTestId) {
                await API.patch(`/lab/tests/${editingTestId}`, payload);
                showToast(t('adminLab.testUpdated'));
            } else {
                await API.post('/lab/tests', payload);
                showToast(t('adminLab.testAdded'));
            }
            setTestOpen(false);
            setEditingTestId(null);
            setTestForm({ test_name: '', description: '', price: '' });
            fetchMeta();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed', 'error');
        } finally {
            setTestSubmitting(false);
        }
    };

    const openEditTest = (test) => {
        setEditingTestId(test.id);
        setTestForm({
            test_name: test.test_name,
            description: test.description || '',
            price: String(test.price)
        });
        setTestOpen(true);
    };

    const cancelReport = async (id) => {
        if (!window.confirm('Cancel this pending lab request?')) return;
        try {
            await API.delete(`/lab/reports/${id}`);
            showToast(t('adminLab.cancelled'));
            setSelected(null);
            fetchReports();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed', 'error');
        }
    };

    const downloadCsv = (filename, rows) => {
        if (rows.length <= 1) {
            showToast(t('adminLab.exportEmpty'), 'error');
            return;
        }
        const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('adminLab.exported'));
    };

    const exportCsv = () => {
        const rows = [
            ['ID', 'Patient', 'Phone', 'Test', 'Doctor', 'Price', 'Status', 'Requested'],
            ...filtered.map((r) => [
                r.id,
                r.patient_name,
                r.patient_phone || '',
                r.test_name,
                r.doctor_name,
                r.price,
                r.status,
                new Date(r.created_at).toISOString()
            ])
        ];
        downloadCsv(`lab-requests-${todayStr}.csv`, rows);
    };

    const exportCatalogCsv = () => {
        const rows = [
            ['ID', 'Test', 'Description', 'Price'],
            ...catalog.map((test) => [test.id, test.test_name, test.description || '', test.price])
        ];
        downloadCsv(`lab-catalog-${todayStr}.csv`, rows);
    };

    const labChartData = useMemo(() => {
        const map = {};
        reports.forEach((r) => {
            const d = new Date(r.created_at).toISOString().slice(0, 10);
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-14)
            .map(([date, count]) => ({ date: date.slice(5), count }));
    }, [reports]);

    const filterToday = () => {
        setFromDate(todayStr);
        setToDate(todayStr);
    };

    const viewReport = (filePath) => {
        const url = resolveReportUrl(filePath);
        if (!url) {
            showToast(t('adminLab.noFile'), 'error');
            return;
        }
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-5 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <FlaskConical className="text-violet-600 shrink-0" size={28} />
                        {t('adminLab.title')}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-0.5">{t('adminLab.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant="outline" onClick={() => { fetchReports(); fetchMeta(); }} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminLab.refresh')}
                    </Button>
                    <Button onClick={openRequestModal} className="gap-2 bg-violet-600 hover:bg-violet-700">
                        <Plus size={16} />
                        {t('adminLab.newRequest')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('adminLab.total'), value: counts.total, color: 'text-secondary-900' },
                    { label: t('adminLab.pending'), value: counts.pending, color: 'text-amber-600' },
                    { label: t('adminLab.completed'), value: counts.completed, color: 'text-green-600' },
                    { label: t('adminLab.pendingValue'), value: `₹${Math.round(counts.pendingValue)}`, color: 'text-violet-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-premium overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex gap-1 overflow-x-auto">
                            {[
                                { id: 'requests', label: t('adminLab.requests') },
                                { id: 'catalog', label: t('adminLab.catalog') }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-slate-100 text-secondary-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {activeTab === 'requests' ? (
                                <Button
                                    variant="outline"
                                    onClick={exportCsv}
                                    className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                                >
                                    <Download size={16} />
                                    {t('adminLab.exportCsv')}
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={exportCatalogCsv}
                                    className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                                >
                                    <Download size={16} />
                                    {t('adminLab.exportCatalogCsv')}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingTestId(null);
                                    setTestForm({ test_name: '', description: '', price: '' });
                                    setTestOpen(true);
                                }}
                                className="gap-2"
                            >
                                <Plus size={16} />
                                {t('adminLab.addTest')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

            {activeTab === 'catalog' ? (
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('adminLab.testName')}</TableHead>
                                    <TableHead>{t('adminLab.testDesc')}</TableHead>
                                    <TableHead className="text-right">{t('adminLab.testPrice')}</TableHead>
                                    <TableHead className="text-right">{t('adminLab.colActions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {catalog.map((test) => (
                                    <TableRow key={test.id}>
                                        <TableCell className="font-medium">{test.test_name}</TableCell>
                                        <TableCell className="text-sm text-secondary-600 max-w-md truncate">
                                            {test.description || '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">₹{test.price}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" onClick={() => openEditTest(test)}>
                                                <Pencil size={14} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
            ) : (
                <>
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white w-full"
                            >
                                <option value="all">{t('adminLab.allStatus')}</option>
                                <option value="pending">{t('adminLab.statusPending')}</option>
                                <option value="completed">{t('adminLab.statusDone')}</option>
                            </select>
                            <select
                                value={doctorFilter}
                                onChange={(e) => setDoctorFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white w-full"
                            >
                                <option value="">{t('adminLab.allDoctors')}</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white w-full"
                                aria-label={t('adminLab.fromDate')}
                            />
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white w-full"
                                aria-label={t('adminLab.toDate')}
                            />
                            <Button variant="outline" size="sm" onClick={filterToday} className="w-full">
                                {t('adminLab.todayOnly')}
                            </Button>
                            <div className="flex gap-2">
                                {(fromDate || toDate) && (
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setFromDate(''); setToDate(''); }}>
                                        {t('adminLab.clearDates')}
                                    </Button>
                                )}
                                <label className="flex items-center gap-2 text-xs font-medium text-secondary-600 px-2 py-1.5 rounded-xl bg-white border border-slate-200 flex-1 justify-center">
                                    <input
                                        type="checkbox"
                                        checked={autoRefresh}
                                        onChange={(e) => setAutoRefresh(e.target.checked)}
                                        className="rounded"
                                    />
                                    {t('adminLab.autoRefresh')}
                                </label>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('adminLab.searchPlaceholder')}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={exportCsv}
                                className="gap-2 shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50 sm:min-w-[160px]"
                            >
                                <Download size={16} />
                                {t('adminLab.exportCsv')}
                            </Button>
                        </div>
                    </div>

                    {labChartData.length > 0 && (
                        <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-xs font-bold uppercase text-secondary-500 mb-2">{t('adminLab.requestsChart')}</p>
                            <div className="h-36 w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={labChartData}>
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col xl:flex-row gap-0 xl:gap-0 min-w-0">
                        <div className="flex-1 min-w-0 overflow-x-auto">
                            {loading ? (
                                <p className="p-8 text-center text-sm text-secondary-400">{t('common.loading')}</p>
                            ) : filtered.length === 0 ? (
                                <div className="p-12 text-center">
                                    <FlaskConical size={40} className="mx-auto text-secondary-300 mb-3" />
                                    <p className="font-semibold text-secondary-600">{t('adminLab.empty')}</p>
                                    <p className="text-xs text-secondary-400 mt-1">{t('adminLab.emptyHint')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="hidden sm:table-cell">{t('adminLab.colId')}</TableHead>
                                            <TableHead>{t('adminLab.colPatient')}</TableHead>
                                            <TableHead>{t('adminLab.colTest')}</TableHead>
                                            <TableHead className="hidden lg:table-cell">{t('adminLab.colDoctor')}</TableHead>
                                            <TableHead>{t('adminLab.colPrice')}</TableHead>
                                            <TableHead className="hidden md:table-cell">{t('adminLab.colRequested')}</TableHead>
                                            <TableHead>{t('adminLab.colStatus')}</TableHead>
                                            <TableHead className="text-right">{t('adminLab.colActions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((r) => (
                                            <TableRow
                                                key={r.id}
                                                className={`cursor-pointer hover:bg-slate-50/80 ${
                                                    selected?.id === r.id ? 'bg-violet-50/50' : ''
                                                }`}
                                                onClick={() => setSelected(r)}
                                            >
                                                <TableCell className="font-mono text-xs hidden sm:table-cell">#{r.id}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{r.patient_name}</p>
                                                    {r.patient_phone && (
                                                        <p className="text-[10px] text-secondary-400 flex items-center gap-1">
                                                            <Phone size={10} /> {r.patient_phone}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-secondary-400 lg:hidden">{r.doctor_name}</p>
                                                </TableCell>
                                                <TableCell>{r.test_name}</TableCell>
                                                <TableCell className="text-sm hidden lg:table-cell">{r.doctor_name}</TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">₹{r.price}</TableCell>
                                                <TableCell className="text-xs hidden md:table-cell whitespace-nowrap">
                                                    {new Date(r.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex flex-wrap justify-end gap-1">
                                                        {r.status === 'pending' && (
                                                            <>
                                                                <Button size="sm" className="bg-violet-600 gap-1" onClick={() => openUpload(r)}>
                                                                    <Upload size={14} />
                                                                    <span className="hidden sm:inline">{t('adminLab.upload')}</span>
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => cancelReport(r.id)}>
                                                                    <Trash2 size={14} className="text-red-500" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {r.status === 'completed' && r.report_file && (
                                                            <>
                                                                <Button size="sm" variant="outline" onClick={() => viewReport(r.report_file)}>
                                                                    <Eye size={14} />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const link = document.createElement('a');
                                                                        link.href = resolveReportUrl(r.report_file);
                                                                        link.download = `${r.test_name}_report`;
                                                                        link.click();
                                                                    }}
                                                                >
                                                                    <Download size={14} />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {selected && (
                            <aside className="w-full xl:w-80 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-100 bg-slate-50/40 p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
                                <div className="flex flex-row items-center justify-between mb-3">
                                    <h3 className="font-bold text-base">{t('adminLab.details')}</h3>
                                    <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="space-y-3 text-sm">
                                <div className="p-4 rounded-xl bg-violet-50 text-center">
                                    <p className="font-bold">{selected.test_name}</p>
                                    <p className="text-xs text-secondary-600 mt-1">{selected.patient_name}</p>
                                    <Badge variant={statusVariant(selected.status)} className="mt-2">{selected.status}</Badge>
                                </div>
                                <dl className="space-y-2 text-secondary-600">
                                    <div className="flex justify-between"><dt>{t('adminLab.phone')}</dt><dd>{selected.patient_phone || '—'}</dd></div>
                                    <div className="flex justify-between"><dt>{t('adminLab.colDoctor')}</dt><dd>{selected.doctor_name}</dd></div>
                                    <div className="flex justify-between">
                                        <dt>{t('adminLab.colPrice')}</dt>
                                        <dd className="font-bold flex items-center gap-0.5"><IndianRupee size={14} />{selected.price}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt>{t('adminLab.colRequested')}</dt>
                                        <dd>{new Date(selected.created_at).toLocaleString()}</dd>
                                    </div>
                                </dl>
                                {selected.result_notes && (
                                    <p className="text-xs border-t pt-2">
                                        <span className="font-bold">{t('adminLab.notes')}:</span> {selected.result_notes}
                                    </p>
                                )}
                                <div className="flex flex-col gap-2 pt-2">
                                    {selected.status === 'pending' ? (
                                        <>
                                            <Button className="gap-2 bg-violet-600" onClick={() => openUpload(selected)}>
                                                <Upload size={16} /> {t('adminLab.upload')}
                                            </Button>
                                            <Button variant="outline" className="gap-2 text-red-600" onClick={() => cancelReport(selected.id)}>
                                                <Trash2 size={16} /> {t('adminLab.cancelRequest')}
                                            </Button>
                                        </>
                                    ) : selected.report_file ? (
                                        <>
                                            <Button variant="outline" className="gap-2" onClick={() => viewReport(selected.report_file)}>
                                                <Eye size={16} /> {t('adminLab.viewReport')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = resolveReportUrl(selected.report_file);
                                                    link.download = `${selected.test_name}_report`;
                                                    link.click();
                                                }}
                                            >
                                                <Download size={16} /> {t('adminLab.download')}
                                            </Button>
                                        </>
                                    ) : (
                                        <p className="text-xs text-secondary-400">{t('adminLab.noFile')}</p>
                                    )}
                                </div>
                                </div>
                            </aside>
                        )}
                    </div>
                </>
            )}
            </Card>

            {uploadOpen && uploadTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-md border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">{t('adminLab.uploadTitle')}</CardTitle>
                            <button type="button" onClick={() => setUploadOpen(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={handleUpload}>
                            <CardContent className="space-y-4">
                                <div className="p-3 rounded-xl bg-violet-50 text-sm">
                                    <p className="font-bold">{uploadTarget.patient_name}</p>
                                    <p className="text-secondary-600">{uploadTarget.test_name} · #{uploadTarget.id}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminLab.notes')}</label>
                                    <textarea
                                        rows={3}
                                        value={uploadForm.result_notes}
                                        onChange={(e) => setUploadForm((f) => ({ ...f, result_notes: e.target.value }))}
                                        placeholder={t('adminLab.resultNotesPlaceholder')}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminLab.reportFile')}</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required
                                        onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                                        className="w-full mt-1 text-sm"
                                    />
                                    <p className="text-[10px] text-secondary-400 mt-1">{t('adminLab.uploadHint')}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t">
                                <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={uploading} className="gap-2 bg-violet-600">
                                    <Upload size={16} />
                                    {uploading ? t('common.loading') : t('adminLab.submitUpload')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {requestOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-md border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('adminLab.newRequestTitle')}</CardTitle>
                            <button type="button" onClick={() => setRequestOpen(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={submitRequest}>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminLab.selectPatient')}</label>
                                    <select
                                        required
                                        value={requestForm.patient_id}
                                        onChange={(e) => setRequestForm((f) => ({ ...f, patient_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminLab.selectDoctor')}</label>
                                    <select
                                        required
                                        value={requestForm.doctor_id}
                                        onChange={(e) => setRequestForm((f) => ({ ...f, doctor_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminLab.selectTest')}</label>
                                    <select
                                        required
                                        value={requestForm.test_id}
                                        onChange={(e) => setRequestForm((f) => ({ ...f, test_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {catalog.map((test) => (
                                            <option key={test.id} value={test.id}>
                                                {test.test_name} (₹{test.price})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t">
                                <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={requestSubmitting}>{t('adminLab.submitRequest')}</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {testOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-md border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{editingTestId ? t('adminLab.editTest') : t('adminLab.addTestTitle')}</CardTitle>
                            <button type="button" onClick={() => { setTestOpen(false); setEditingTestId(null); }}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={submitTest}>
                            <CardContent className="space-y-4">
                                <Input
                                    label={t('adminLab.testName')}
                                    required
                                    value={testForm.test_name}
                                    onChange={(e) => setTestForm((f) => ({ ...f, test_name: e.target.value }))}
                                />
                                <Input
                                    label={t('adminLab.testDesc')}
                                    value={testForm.description}
                                    onChange={(e) => setTestForm((f) => ({ ...f, description: e.target.value }))}
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    label={t('adminLab.testPrice')}
                                    required
                                    value={testForm.price}
                                    onChange={(e) => setTestForm((f) => ({ ...f, price: e.target.value }))}
                                />
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t">
                                <Button type="button" variant="outline" onClick={() => setTestOpen(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={testSubmitting}>
                                    {editingTestId ? t('adminLab.editTest') : t('adminLab.addTest')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default LabManagement;
