import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { FlaskConical, Users, Calendar, Search, Filter } from 'lucide-react';

const DoctorLabRequests = () => {
    const location = useLocation();
    const { t } = useTranslation();

    const [requests, setRequests] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [form, setForm] = useState({
        patient_id: location.state?.patient_id ? String(location.state.patient_id) : '',
        test_id: ''
    });
    const [patients, setPatients] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [req, cat, pat] = await Promise.all([
                API.get('/doctor/lab-requests'),
                API.get('/lab/catalog'),
                API.get('/doctor/patients')
            ]);
            setRequests(req.data.data || []);
            setCatalog(cat.data.data || []);
            setPatients(pat.data.data || []);
        } catch (err) {
            console.error(err);
            showToast(t('doctorLabs.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const submitRequest = async (e) => {
        e.preventDefault();
        try {
            await API.post('/doctor/lab-request', form);
            showToast(t('doctorQueue.saved'));
            setForm({
                patient_id: location.state?.patient_id ? String(location.state.patient_id) : '',
                test_id: ''
            });
            load();
        } catch (err) {
            showToast('Request failed', 'error');
        }
    };

    const stats = useMemo(() => ({
        total: requests.length,
        pending: requests.filter((r) => r.status === 'pending').length,
        completed: requests.filter((r) => r.status === 'completed').length,
        patients: new Set(requests.map((r) => r.patient_name)).size
    }), [requests]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return requests.filter((r) => {
            const matchStatus =
                statusFilter === 'all' ? true : r.status === statusFilter;
            const matchSearch =
                !q ||
                r.patient_name?.toLowerCase().includes(q) ||
                r.test_name?.toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [requests, search, statusFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <FlaskConical className="text-violet-600" size={26} />
                        {t('doctorLabs.title')}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">{t('doctorLabs.subtitle')}</p>
                </div>
                <Button variant="outline" onClick={load}>
                    {t('doctorQueue.refresh')}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('doctorLabs.statTotal'), value: stats.total, icon: FlaskConical },
                    { label: t('doctorLabs.statPending'), value: stats.pending, icon: Filter },
                    { label: t('doctorLabs.statCompleted'), value: stats.completed, icon: Calendar },
                    { label: t('doctorLabs.statPatients'), value: stats.patients, icon: Users },
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-100 text-secondary-700">
                                <s.icon size={18} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-secondary-900">{loading ? '—' : s.value}</p>
                                <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* New order */}
            <Card className="border-none shadow-premium">
                <CardHeader>
                    <CardTitle>{t('doctorLabs.newOrder')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submitRequest} className="grid md:grid-cols-3 gap-4">
                        <select
                            className="border rounded-lg h-10 px-3 text-sm"
                            value={form.patient_id}
                            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                            required
                        >
                            <option value="">{t('doctorLabs.selectPatient')}</option>
                            {patients.map((p) => (
                                <option key={p.patient_id} value={p.patient_id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="border rounded-lg h-10 px-3 text-sm"
                            value={form.test_id}
                            onChange={(e) => setForm({ ...form, test_id: e.target.value })}
                            required
                        >
                            <option value="">{t('doctorLabs.selectTest')}</option>
                            {catalog.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.test_name} — ₹{t.price}
                                </option>
                            ))}
                        </select>
                        <Button type="submit">{t('doctorLabs.orderBtn')}</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Orders list */}
            <Card className="border-none shadow-premium overflow-x-auto">
                <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-50">
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical size={18} className="text-violet-600" />
                        {t('doctorLabs.summaryTitle')}
                        <span className="text-sm font-normal text-secondary-400">({filtered.length})</span>
                    </CardTitle>
                    <div className="flex flex-col md:flex-row gap-2 md:items-center">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('doctorLabs.searchPh')}
                                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] text-secondary-500 flex items-center gap-1">
                                <Filter size={12} /> {t('doctorLabs.statusFilter')}
                            </span>
                            <select
                                className="border border-slate-200 rounded-lg h-8 px-2 text-xs"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">{t('doctorLabs.statusAll')}</option>
                                <option value="pending">{t('doctorLabs.statusPending')}</option>
                                <option value="completed">{t('doctorLabs.statusCompleted')}</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="p-8 text-center text-secondary-400 text-sm animate-pulse">
                            {t('doctorLabs.loading')}
                        </p>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <FlaskConical size={40} className="mx-auto text-secondary-300 mb-3" />
                            <p className="font-semibold text-secondary-600">{t('doctorLabs.empty')}</p>
                            <p className="text-xs text-secondary-400 mt-1">{t('doctorLabs.emptyHint')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('doctorLabs.patient')}</TableHead>
                                    <TableHead>{t('doctorLabs.test')}</TableHead>
                                    <TableHead>{t('doctorLabs.status')}</TableHead>
                                    <TableHead>{t('doctorLabs.date')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.patient_name}</TableCell>
                                        <TableCell>{r.test_name}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>
                                                {r.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorLabRequests;
