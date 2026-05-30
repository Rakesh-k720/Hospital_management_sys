import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Building2,
    Search,
    RefreshCw,
    Plus,
    X,
    Pencil,
    Trash2,
    Users,
    Calendar,
    ClipboardList,
    Download,
    Stethoscope
} from 'lucide-react';

const DepartmentManagement = () => {
    const { t } = useTranslation();

    const [list, setList] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/departments');
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setList(payload);
                setStats({});
            } else {
                setList(payload?.departments || []);
                setStats(payload?.stats || {});
            }
        } catch (err) {
            showToast(err.response?.data?.message || t('adminDept.loadError'), 'error');
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const loadDetail = async (dept) => {
        setSelected(dept);
        setDetail(null);
        setDetailLoading(true);
        try {
            const res = await API.get(`/departments/${dept.id}`);
            setDetail(res.data.data);
        } catch (err) {
            showToast(err.response?.data?.message || t('adminDept.loadError'), 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (d) =>
                (d.name || '').toLowerCase().includes(q) ||
                (d.description || '').toLowerCase().includes(q)
        );
    }, [list, searchQuery]);

    const openAdd = () => {
        setEditingId(null);
        setForm({ name: '', description: '' });
        setModalOpen(true);
    };

    const openEdit = (dept) => {
        setEditingId(dept.id);
        setForm({ name: dept.name, description: dept.description || '' });
        setModalOpen(true);
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await API.put(`/departments/${editingId}`, form);
                showToast(t('adminDept.updated'));
            } else {
                await API.post('/departments', form);
                showToast(t('adminDept.added'));
            }
            setModalOpen(false);
            load();
            if (selected?.id === editingId) {
                loadDetail({ ...selected, ...form, id: editingId });
            }
        } catch (err) {
            const msg =
                err.response?.status === 409
                    ? t('adminDept.duplicate')
                    : err.response?.data?.message || 'Failed';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this department?')) return;
        try {
            await API.delete(`/departments/${id}`);
            showToast(t('adminDept.deleted'));
            if (selected?.id === id) {
                setSelected(null);
                setDetail(null);
            }
            load();
        } catch (err) {
            showToast(err.response?.data?.message || t('adminDept.deleteBlocked'), 'error');
        }
    };

    const exportCsv = () => {
        const rows = [
            ['ID', 'Name', 'Description', 'Doctors', 'Appointments30d', 'OPDWaitingToday'],
            ...filtered.map((d) => [
                d.id,
                d.name,
                d.description || '',
                d.doctor_count ?? 0,
                d.appointments_30d ?? 0,
                d.opd_waiting_today ?? 0
            ])
        ];
        const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `departments-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('adminDept.exported'));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Building2 className="text-cyan-600" size={28} />
                        {t('adminDept.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminDept.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={!filtered.length}>
                        <Download size={16} />
                        {t('adminDept.exportCsv')}
                    </Button>
                    <Button variant="outline" onClick={load} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminDept.refresh')}
                    </Button>
                    <Button onClick={openAdd} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                        <Plus size={16} />
                        {t('adminDept.addDept')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: t('adminDept.totalDepts'), value: stats.total_departments ?? list.length, icon: Building2, color: 'text-cyan-600' },
                    { label: t('adminDept.totalDoctors'), value: stats.total_doctors ?? 0, icon: Users, color: 'text-violet-600' },
                    { label: t('adminDept.appts30d'), value: stats.appointments_30d ?? 0, icon: Calendar, color: 'text-amber-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-50">
                                <s.icon size={20} className={s.color} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                                <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col xl:flex-row gap-4">
                <Card className="flex-1 border-none shadow-premium">
                    <CardHeader className="border-b border-slate-50">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('adminDept.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <p className="p-8 text-center text-sm text-secondary-400">{t('common.loading')}</p>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <Building2 size={40} className="mx-auto text-secondary-300 mb-3" />
                                <p className="font-semibold text-secondary-600">{t('adminDept.empty')}</p>
                                <p className="text-xs text-secondary-400 mt-1">{t('adminDept.emptyHint')}</p>
                                <Button className="mt-4 gap-2" onClick={openAdd}>
                                    <Plus size={16} /> {t('adminDept.addDept')}
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('adminDept.colName')}</TableHead>
                                        <TableHead>{t('adminDept.colDoctors')}</TableHead>
                                        <TableHead>{t('adminDept.colAppts')}</TableHead>
                                        <TableHead>{t('adminDept.colOpd')}</TableHead>
                                        <TableHead className="text-right">{t('adminDept.colActions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((d) => (
                                        <TableRow
                                            key={d.id}
                                            className={`cursor-pointer hover:bg-slate-50/80 ${
                                                selected?.id === d.id ? 'bg-cyan-50/50' : ''
                                            }`}
                                            onClick={() => loadDetail(d)}
                                        >
                                            <TableCell>
                                                <p className="font-bold text-secondary-900">{d.name}</p>
                                                <p className="text-xs text-secondary-500 max-w-xs truncate">
                                                    {d.description || '—'}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="gap-1">
                                                    <Users size={12} /> {d.doctor_count ?? 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{d.appointments_30d ?? 0}</TableCell>
                                            <TableCell>
                                                {(d.opd_waiting_today ?? 0) > 0 ? (
                                                    <Badge variant="warning">{d.opd_waiting_today}</Badge>
                                                ) : (
                                                    '0'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => remove(d.id)}
                                                        disabled={Number(d.doctor_count) > 0}
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
                    <Card className="w-full xl:w-96 shrink-0 border-none shadow-premium sticky top-4">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">{t('adminDept.details')}</CardTitle>
                            <button type="button" onClick={() => { setSelected(null); setDetail(null); }}>
                                <X size={18} />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {detailLoading ? (
                                <p className="text-secondary-400">{t('common.loading')}</p>
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl bg-cyan-50 text-center">
                                        <p className="text-xl font-bold text-cyan-900">{selected.name}</p>
                                        <p className="text-xs text-secondary-600 mt-2">{selected.description || '—'}</p>
                                        {detail?.department?.created_at && (
                                            <p className="text-[10px] text-secondary-400 mt-2">
                                                {t('adminDept.created')}: {new Date(detail.department.created_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="p-2 rounded-lg bg-slate-50">
                                            <p className="font-bold">{detail?.department?.doctor_count ?? selected.doctor_count ?? 0}</p>
                                            <p className="text-[9px] uppercase text-secondary-500">{t('adminDept.colDoctors')}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-50">
                                            <p className="font-bold">{detail?.department?.appointments_30d ?? selected.appointments_30d ?? 0}</p>
                                            <p className="text-[9px] uppercase text-secondary-500">{t('adminDept.colAppts')}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-50">
                                            <p className="font-bold">{detail?.department?.opd_waiting_today ?? selected.opd_waiting_today ?? 0}</p>
                                            <p className="text-[9px] uppercase text-secondary-500">OPD</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link to="/admin/doctors">
                                            <Button size="sm" variant="outline" className="gap-1">
                                                <Stethoscope size={14} /> {t('adminDept.goDoctors')}
                                            </Button>
                                        </Link>
                                        <Link to="/admin/opd">
                                            <Button size="sm" variant="outline" className="gap-1">
                                                <ClipboardList size={14} /> {t('adminDept.goOpd')}
                                            </Button>
                                        </Link>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-secondary-500 mb-2">
                                            {t('adminDept.doctorsInDept')}
                                        </p>
                                        {(detail?.doctors || []).length === 0 ? (
                                            <p className="text-xs text-secondary-400">{t('adminDept.noDoctors')}</p>
                                        ) : (
                                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                                {detail.doctors.map((doc) => (
                                                    <li key={doc.id} className="p-2 rounded-lg bg-slate-50 text-xs">
                                                        <p className="font-medium">{doc.name}</p>
                                                        <p className="text-secondary-500">{doc.specialization} · ₹{doc.consultation_fee}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-secondary-500 mb-2">
                                            {t('adminDept.recentAppts')}
                                        </p>
                                        {(detail?.recentAppointments || []).length === 0 ? (
                                            <p className="text-xs text-secondary-400">{t('adminDept.noAppts')}</p>
                                        ) : (
                                            <ul className="space-y-1 max-h-32 overflow-y-auto">
                                                {detail.recentAppointments.map((a) => (
                                                    <li key={a.id} className="flex justify-between text-xs p-1.5 rounded bg-slate-50">
                                                        <span>{a.patient_name}</span>
                                                        <Badge variant="secondary" className="text-[9px]">{a.status}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(selected)}>
                                            {t('adminDept.edit')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600"
                                            disabled={Number(selected.doctor_count) > 0}
                                            onClick={() => remove(selected.id)}
                                        >
                                            {t('adminDept.delete')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-md border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{editingId ? t('adminDept.editDept') : t('adminDept.addDept')}</CardTitle>
                            <button type="button" onClick={() => setModalOpen(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={submitForm}>
                            <CardContent className="space-y-4">
                                <Input
                                    label={t('adminDept.name')}
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminDept.description')}</label>
                                    <textarea
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? t('common.loading') : t('adminDept.save')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagement;
