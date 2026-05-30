import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { downloadPatientHealthCard } from '../../../utils/pdfExport';
import {
    Users,
    Search,
    RefreshCw,
    Plus,
    X,
    Pencil,
    Trash2,
    Download,
    UserPlus,
    Activity,
    Calendar,
    Receipt,
    FlaskConical,
    BedDouble,
    Mail,
    Phone,
    Droplets,
    ExternalLink
} from 'lucide-react';

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    password: '',
    age: 18,
    gender: 'other',
    blood_group: '',
    address: '',
    emergency_contact: '',
    allergies: '',
    medical_notes: ''
};

const PatientManagement = () => {
    const { t } = useTranslation();

    const [patients, setPatients] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [panelTab, setPanelTab] = useState('overview');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { stats: '1' };
            if (statusFilter !== 'all') params.status = statusFilter;
            const res = await API.get('/admin/patients', { params });
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setPatients(payload);
                setStats({});
            } else {
                setPatients(payload?.patients || []);
                setStats(payload?.stats || {});
            }
        } catch (err) {
            showToast(err.response?.data?.message || t('adminPatients.loadError'), 'error');
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, t]);

    useEffect(() => {
        load();
    }, [load]);

    const loadDetail = async (patient) => {
        setSelected(patient);
        setDetail(null);
        setDetailLoading(true);
        setPanelTab('overview');
        try {
            const res = await API.get(`/admin/patients/${patient.id}`);
            setDetail(res.data.data);
        } catch (err) {
            showToast(err.response?.data?.message || t('adminPatients.loadError'), 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return patients;
        return patients.filter(
            (p) =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.email || '').toLowerCase().includes(q) ||
                (p.phone || '').toLowerCase().includes(q) ||
                `p-${p.id}`.includes(q)
        );
    }, [patients, search]);

    const openRegister = () => {
        setEditingId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (p) => {
        setEditingId(p.id);
        setForm({
            name: p.name || '',
            email: p.email || '',
            phone: p.phone || '',
            password: '',
            age: p.age ?? 18,
            gender: p.gender || 'other',
            blood_group: p.blood_group || '',
            address: p.address || '',
            emergency_contact: p.emergency_contact || '',
            allergies: p.allergies || '',
            medical_notes: p.medical_notes || '',
            user_status: p.user_status
        });
        setModalOpen(true);
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                const { password, email, ...body } = form;
                await API.put(`/admin/patients/${editingId}`, body);
                showToast(t('adminPatients.saved'));
            } else {
                await API.post('/admin/patients', form);
                showToast(t('adminPatients.registered'));
            }
            setModalOpen(false);
            load();
            if (selected?.id === editingId) {
                loadDetail({ ...selected, ...form, id: editingId });
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (userId, currentStatus, e) => {
        e?.stopPropagation();
        const next = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await API.patch(`/admin/users/${userId}/status`, { status: next });
            showToast(t('adminPatients.statusUpdated'));
            load();
            if (selected?.user_id === userId) {
                setSelected((s) => ({ ...s, user_status: next }));
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed', 'error');
        }
    };

    const removePatient = async (userId, e) => {
        e?.stopPropagation();
        if (!window.confirm(t('adminPatients.deleteConfirm'))) return;
        try {
            await API.delete(`/admin/users/${userId}`);
            showToast(t('adminPatients.deleted'));
            if (selected?.user_id === userId) {
                setSelected(null);
                setDetail(null);
            }
            load();
        } catch (err) {
            showToast(err.response?.data?.message || t('adminPatients.deleteBlocked'), 'error');
        }
    };

    const exportCsv = () => {
        const rows = [
            ['ID', 'Name', 'Email', 'Phone', 'Age', 'Gender', 'Blood', 'Status', 'Visits', 'UnpaidBills', 'IPD'],
            ...filtered.map((p) => [
                p.id,
                p.name,
                p.email,
                p.phone || '',
                p.age,
                p.gender,
                p.blood_group || '',
                p.user_status,
                p.completed_visits ?? 0,
                p.unpaid_bills ?? 0,
                p.ipd_active ?? 0
            ])
        ];
        const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('adminPatients.exported'));
    };

    const patientIdLabel = (id) => `P-${String(id).padStart(4, '0')}`;

    const statusVariant = (s) => (s === 'active' ? 'success' : 'danger');

    const apptVariant = (s) => {
        if (s === 'completed') return 'success';
        if (s === 'cancelled') return 'danger';
        if (s === 'pending') return 'warning';
        return 'secondary';
    };

    const detailPatient = detail?.patient || selected;
    const detailStats = detail?.stats;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Users className="text-emerald-600" size={28} />
                        {t('adminPatients.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminPatients.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={!filtered.length}>
                        <Download size={16} />
                        {t('adminPatients.exportCsv')}
                    </Button>
                    <Button variant="outline" onClick={load} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminPatients.refresh')}
                    </Button>
                    <Button onClick={openRegister} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <UserPlus size={16} />
                        {t('adminPatients.registerPatient')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('adminPatients.totalPatients'), value: stats.total ?? patients.length, color: 'text-emerald-600' },
                    { label: t('adminPatients.activePatients'), value: stats.active ?? 0, color: 'text-blue-600' },
                    { label: t('adminPatients.inactivePatients'), value: stats.inactive ?? 0, color: 'text-slate-600' },
                    { label: t('adminPatients.ipdAdmitted'), value: stats.ipd_patients ?? 0, color: 'text-violet-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col xl:flex-row gap-4">
                <Card className="flex-1 border-none shadow-premium">
                    <CardHeader className="border-b border-slate-50 space-y-3">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('adminPatients.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'active', 'inactive'].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                        statusFilter === s
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-secondary-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {s === 'all'
                                        ? t('adminPatients.allStatus')
                                        : s === 'active'
                                          ? t('adminPatients.activeOnly')
                                          : t('adminPatients.inactiveOnly')}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <p className="p-8 text-center text-sm text-secondary-400">{t('common.loading')}</p>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users size={40} className="mx-auto text-secondary-300 mb-3" />
                                <p className="font-semibold text-secondary-600">{t('adminPatients.empty')}</p>
                                <p className="text-xs text-secondary-400 mt-1">{t('adminPatients.emptyHint')}</p>
                                <Button className="mt-4 gap-2" onClick={openRegister}>
                                    <Plus size={16} /> {t('adminPatients.registerPatient')}
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('adminPatients.colPatient')}</TableHead>
                                        <TableHead>{t('adminPatients.colContact')}</TableHead>
                                        <TableHead>{t('adminPatients.colDemographics')}</TableHead>
                                        <TableHead>{t('adminPatients.colBlood')}</TableHead>
                                        <TableHead>{t('adminPatients.colVisits')}</TableHead>
                                        <TableHead>{t('adminPatients.colStatus')}</TableHead>
                                        <TableHead className="text-right">{t('adminPatients.colActions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((p) => (
                                        <TableRow
                                            key={p.id}
                                            className={`cursor-pointer hover:bg-slate-50/80 ${
                                                selected?.id === p.id ? 'bg-emerald-50/50' : ''
                                            }`}
                                            onClick={() => loadDetail(p)}
                                        >
                                            <TableCell>
                                                <p className="font-bold text-secondary-900">{p.name}</p>
                                                <p className="text-xs text-secondary-500">{patientIdLabel(p.id)}</p>
                                                {Number(p.ipd_active) > 0 && (
                                                    <Badge variant="warning" className="mt-1 text-[10px]">
                                                        {t('adminPatients.ipdBadge')}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <span className="flex items-center gap-1 text-secondary-700">
                                                    <Mail size={12} /> {p.email}
                                                </span>
                                                {p.phone && (
                                                    <span className="flex items-center gap-1 text-xs text-secondary-500 mt-0.5">
                                                        <Phone size={12} /> {p.phone}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {p.age} / {p.gender}
                                            </TableCell>
                                            <TableCell>
                                                {p.blood_group ? (
                                                    <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                                                        <Droplets size={12} /> {p.blood_group}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{p.completed_visits ?? 0}</span>
                                                {(p.unpaid_bills ?? 0) > 0 && (
                                                    <Badge variant="danger" className="ml-1 text-[10px]">
                                                        {p.unpaid_bills}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant(p.user_status)}>{p.user_status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 flex-wrap">
                                                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => toggleStatus(p.user_id, p.user_status, e)}
                                                    >
                                                        {p.user_status === 'active'
                                                            ? t('adminPatients.deactivate')
                                                            : t('adminPatients.activate')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => removePatient(p.user_id, e)}
                                                    >
                                                        <Trash2 size={14} className="text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {selected && (
                    <Card className="w-full xl:w-[420px] shrink-0 border-none shadow-premium sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div>
                                <CardTitle className="text-base">{selected.name}</CardTitle>
                                <p className="text-xs text-secondary-500">{patientIdLabel(selected.id)}</p>
                            </div>
                            <button type="button" onClick={() => { setSelected(null); setDetail(null); }}>
                                <X size={18} />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex gap-1 border-b border-slate-100 pb-2">
                                {['overview', 'records'].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setPanelTab(tab)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                            panelTab === tab ? 'bg-emerald-600 text-white' : 'text-secondary-500'
                                        }`}
                                    >
                                        {tab === 'overview'
                                            ? t('adminPatients.tabOverview')
                                            : t('adminPatients.tabRecords')}
                                    </button>
                                ))}
                            </div>

                            {detailLoading ? (
                                <p className="text-secondary-400">{t('common.loading')}</p>
                            ) : panelTab === 'overview' ? (
                                <>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            {
                                                label: t('adminPatients.upcomingAppts'),
                                                value: detailStats?.upcomingAppointments ?? 0,
                                                icon: Calendar
                                            },
                                            {
                                                label: t('adminPatients.completedVisits'),
                                                value: detailStats?.totalVisits ?? selected.completed_visits ?? 0,
                                                icon: Activity
                                            },
                                            {
                                                label: t('adminPatients.pendingBills'),
                                                value: detailStats?.pendingBills ?? selected.unpaid_bills ?? 0,
                                                icon: Receipt
                                            }
                                        ].map((s) => (
                                            <div key={s.label} className="p-2 rounded-xl bg-slate-50 text-center">
                                                <s.icon size={14} className="mx-auto text-emerald-600 mb-1" />
                                                <p className="font-bold text-secondary-900">{s.value}</p>
                                                <p className="text-[9px] uppercase text-secondary-500">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-1 text-secondary-700">
                                        <p className="flex items-center gap-2">
                                            <Mail size={14} /> {detailPatient?.email}
                                        </p>
                                        {detailPatient?.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone size={14} /> {detailPatient.phone}
                                            </p>
                                        )}
                                        {detailPatient?.user_created_at && (
                                            <p className="text-xs text-secondary-400">
                                                {t('adminPatients.memberSince')}{' '}
                                                {new Date(detailPatient.user_created_at).toLocaleDateString()}
                                            </p>
                                        )}
                                        {detailPatient?.allergies && (
                                            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                                                {t('adminPatients.allergies')}: {detailPatient.allergies}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1"
                                            onClick={() =>
                                                downloadPatientHealthCard({
                                                    user: {
                                                        name: detailPatient?.name,
                                                        phone: detailPatient?.phone,
                                                        created_at: detailPatient?.user_created_at
                                                    },
                                                    patient: detailPatient
                                                })
                                            }
                                        >
                                            <Download size={14} />
                                            {t('adminPatients.downloadCard')}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                                            <Pencil size={14} className="mr-1" />
                                            {t('adminPatients.editPatient')}
                                        </Button>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold uppercase text-secondary-500 mb-2">
                                            {t('adminPatients.quickLinks')}
                                        </p>
                                        <div className="flex flex-col gap-1">
                                            <Link
                                                to="/admin/appointments"
                                                className="flex items-center gap-2 text-emerald-700 hover:underline text-sm"
                                            >
                                                <Calendar size={14} /> {t('adminPatients.bookAppt')}
                                                <ExternalLink size={12} />
                                            </Link>
                                            <Link
                                                to="/admin/billing"
                                                className="flex items-center gap-2 text-emerald-700 hover:underline text-sm"
                                            >
                                                <Receipt size={14} /> {t('adminPatients.generateBill')}
                                                <ExternalLink size={12} />
                                            </Link>
                                            <Link
                                                to="/admin/lab"
                                                className="flex items-center gap-2 text-emerald-700 hover:underline text-sm"
                                            >
                                                <FlaskConical size={14} /> {t('adminPatients.labRequest')}
                                                <ExternalLink size={12} />
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                                    {[
                                        { title: t('adminPatients.appointments'), items: detail?.appointments, type: 'appt' },
                                        { title: t('adminPatients.prescriptions'), items: detail?.prescriptions, type: 'rx' },
                                        { title: t('adminPatients.bills'), items: detail?.bills, type: 'bill' },
                                        { title: t('adminPatients.labReports'), items: detail?.reports, type: 'lab' },
                                        { title: t('adminPatients.admissions'), items: detail?.admissions, type: 'adm' }
                                    ].map((section) => (
                                        <div key={section.type}>
                                            <p className="text-xs font-bold uppercase text-secondary-500 mb-1 flex items-center gap-1">
                                                {section.type === 'adm' && <BedDouble size={12} />}
                                                {section.title}
                                            </p>
                                            {!section.items?.length ? (
                                                <p className="text-xs text-secondary-400">{t('adminPatients.noRecords')}</p>
                                            ) : (
                                                <ul className="space-y-1">
                                                    {section.items.slice(0, 5).map((item) => (
                                                        <li
                                                            key={item.id}
                                                            className="p-2 rounded-lg bg-slate-50 text-xs"
                                                        >
                                                            {section.type === 'appt' && (
                                                                <>
                                                                    <span className="font-semibold">{item.doctor_name}</span>
                                                                    <br />
                                                                    {item.appointment_date} ·{' '}
                                                                    <Badge variant={apptVariant(item.status)} className="text-[9px]">
                                                                        {item.status}
                                                                    </Badge>
                                                                </>
                                                            )}
                                                            {section.type === 'rx' && (
                                                                <>
                                                                    {item.doctor_name} ·{' '}
                                                                    {new Date(item.created_at).toLocaleDateString()}
                                                                </>
                                                            )}
                                                            {section.type === 'bill' && (
                                                                <>
                                                                    ₹{item.total_amount} · {item.payment_status}
                                                                </>
                                                            )}
                                                            {section.type === 'lab' && (
                                                                <>
                                                                    {item.test_name} · {item.status}
                                                                </>
                                                            )}
                                                            {section.type === 'adm' && (
                                                                <>
                                                                    {item.ward_name} / {item.bed_number} · {item.status}
                                                                </>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border-none shadow-2xl">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>
                                {editingId ? t('adminPatients.editPatient') : t('adminPatients.registerPatient')}
                            </CardTitle>
                            <button type="button" onClick={() => setModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitForm} className="space-y-3">
                                <Input
                                    label={t('adminPatients.name')}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label={t('adminPatients.email')}
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                    disabled={!!editingId}
                                />
                                {!editingId && (
                                    <Input
                                        label={t('adminPatients.password')}
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                )}
                                <Input
                                    label={t('adminPatients.phone')}
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label={t('adminPatients.age')}
                                        type="number"
                                        min={0}
                                        value={form.age}
                                        onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                                    />
                                    <div>
                                        <label className="text-xs font-semibold text-secondary-600">
                                            {t('adminPatients.gender')}
                                        </label>
                                        <select
                                            className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                            value={form.gender}
                                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                        >
                                            <option value="male">{t('adminPatients.male')}</option>
                                            <option value="female">{t('adminPatients.female')}</option>
                                            <option value="other">{t('adminPatients.other')}</option>
                                        </select>
                                    </div>
                                </div>
                                <Input
                                    label={t('adminPatients.colBlood')}
                                    value={form.blood_group}
                                    onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                                />
                                <Input
                                    label={t('adminPatients.address')}
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                                <Input
                                    label={t('adminPatients.emergency')}
                                    value={form.emergency_contact}
                                    onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                                />
                                <Input
                                    label={t('adminPatients.allergies')}
                                    value={form.allergies}
                                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                                />
                                <div>
                                    <label className="text-xs font-semibold text-secondary-600">
                                        {t('adminPatients.medicalNotes')}
                                    </label>
                                    <textarea
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
                                        value={form.medical_notes}
                                        onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
                                    />
                                </div>
                                {editingId && (
                                    <div>
                                        <label className="text-xs font-semibold text-secondary-600">
                                            {t('adminPatients.colStatus')}
                                        </label>
                                        <select
                                            className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                            value={form.user_status || 'active'}
                                            onChange={(e) => setForm({ ...form, user_status: e.target.value })}
                                        >
                                            <option value="active">{t('adminPatients.activeOnly')}</option>
                                            <option value="inactive">{t('adminPatients.inactiveOnly')}</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                                        {t('common.cancel')}
                                    </Button>
                                    <Button type="submit" className="flex-1 bg-emerald-600" disabled={submitting}>
                                        {t('adminPatients.save')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PatientManagement;
