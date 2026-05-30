import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Calendar,
    Search,
    RefreshCw,
    Plus,
    X,
    Phone,
    ClipboardList,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';

const statusVariant = (status) => {
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    if (status === 'confirmed') return 'info';
    if (status === 'pending') return 'warning';
    return 'secondary';
};

const AdminAppointments = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const today = new Date().toISOString().slice(0, 10);

    const [appointments, setAppointments] = useState([]);
    const [stats, setStats] = useState({});
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const [viewMode, setViewMode] = useState('today');
    const [date, setDate] = useState(today);
    const [doctorFilter, setDoctorFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState(null);

    const [bookOpen, setBookOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [bookForm, setBookForm] = useState({
        patient_id: '',
        doctor_id: '',
        department_id: '',
        appointment_date: today,
        appointment_time: '10:00',
        priority: 'normal',
        remarks: ''
    });

    const fetchMeta = useCallback(async () => {
        try {
            const [patRes, docRes, deptRes] = await Promise.all([
                API.get('/admin/patients'),
                API.get('/admin/doctors'),
                API.get('/admin/departments')
            ]);
            setPatients(patRes.data.data || []);
            setDoctors(docRes.data.data || []);
            setDepartments(deptRes.data.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (viewMode === 'today') {
                params.date = date || today;
            } else if (viewMode === 'upcoming') {
                params.range = 'upcoming';
            } else if (viewMode === 'week') {
                params.range = 'all';
            } else if (viewMode === 'all') {
                params.range = 'all';
            }
            if (doctorFilter) params.doctor_id = doctorFilter;
            if (deptFilter) params.department_id = deptFilter;
            if (statusFilter !== 'all') params.status = statusFilter;

            const res = await API.get('/admin/appointments', { params });
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setAppointments(payload);
                setStats({});
            } else {
                setAppointments(payload?.appointments || []);
                setStats(payload?.stats || {});
            }
        } catch (err) {
            showToast(err.response?.data?.message || t('adminAppts.loadError'), 'error');
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [viewMode, date, today, doctorFilter, deptFilter, statusFilter, t]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(fetchAppointments, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchAppointments]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return appointments.filter((a) => {
            const matchStatus = statusFilter === 'all' || a.status === statusFilter;
            if (!matchStatus) return false;
            if (!q) return true;
            return (
                (a.patient_name || '').toLowerCase().includes(q) ||
                (a.doctor_name || '').toLowerCase().includes(q) ||
                (a.department_name || '').toLowerCase().includes(q) ||
                (a.token_number || '').toLowerCase().includes(q) ||
                (a.patient_phone || '').includes(q)
            );
        });
    }, [appointments, searchQuery, statusFilter]);

    const counts = useMemo(
        () => ({
            total: Number(stats.total) || appointments.length,
            pending: Number(stats.pending) || appointments.filter((a) => a.status === 'pending').length,
            confirmed: Number(stats.confirmed) || appointments.filter((a) => a.status === 'confirmed').length,
            completed: Number(stats.completed) || appointments.filter((a) => a.status === 'completed').length,
            cancelled: Number(stats.cancelled) || appointments.filter((a) => a.status === 'cancelled').length
        }),
        [stats, appointments]
    );

    const updateStatus = async (id, status) => {
        try {
            await API.patch(`/admin/appointments/${id}/status`, { status });
            showToast(t('adminAppts.statusUpdated'));
            fetchAppointments();
            if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : null));
        } catch (err) {
            showToast(err.response?.data?.message || 'Update failed', 'error');
        }
    };

    const callInOpd = async (appt) => {
        try {
            if (appt.token_id) {
                await API.patch('/queue/token-status', {
                    token_id: appt.token_id,
                    status: 'in_consultation'
                });
            }
            if (appt.status === 'pending') {
                await API.patch(`/admin/appointments/${appt.id}/status`, { status: 'confirmed' });
            }
            navigate('/admin/opd');
        } catch {
            showToast('Failed to update OPD', 'error');
        }
    };

    const openBookModal = () => {
        const doc = doctors[0];
        setBookForm({
            patient_id: patients[0] ? String(patients[0].id) : '',
            doctor_id: doc ? String(doc.id) : '',
            department_id: doc ? String(doc.department_id) : departments[0] ? String(departments[0].id) : '',
            appointment_date: viewMode === 'today' ? date : today,
            appointment_time: '10:00',
            priority: 'normal',
            remarks: ''
        });
        setBookOpen(true);
    };

    const onDoctorPick = (doctorId) => {
        const doc = doctors.find((d) => String(d.id) === String(doctorId));
        setBookForm((f) => ({
            ...f,
            doctor_id: doctorId,
            department_id: doc?.department_id ? String(doc.department_id) : f.department_id
        }));
    };

    const submitBook = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await API.post('/admin/appointments', {
                ...bookForm,
                patient_id: parseInt(bookForm.patient_id, 10),
                doctor_id: parseInt(bookForm.doctor_id, 10),
                department_id: parseInt(bookForm.department_id, 10),
                appointment_time: bookForm.appointment_time.length === 5
                    ? `${bookForm.appointment_time}:00`
                    : bookForm.appointment_time
            });
            showToast(t('adminAppts.booked', { token: res.data.data.tokenNumber }));
            setBookOpen(false);
            fetchAppointments();
        } catch (err) {
            const msg = err.response?.status === 409
                ? t('adminAppts.duplicate')
                : err.response?.data?.message || 'Booking failed';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
    const formatTime = (tm) => (tm ? String(tm).slice(0, 5) : '—');

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Calendar className="text-amber-600" size={28} />
                        {t('adminAppts.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminAppts.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-secondary-600 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        {t('adminAppts.autoRefresh')}
                    </label>
                    <Link to="/admin/opd">
                        <Button variant="outline" className="gap-2">
                            <ClipboardList size={16} />
                            {t('adminAppts.openOpd')}
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={fetchAppointments} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminAppts.refresh')}
                    </Button>
                    <Button onClick={openBookModal} className="gap-2 bg-amber-600 hover:bg-amber-700">
                        <Plus size={16} />
                        {t('adminAppts.bookNew')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: t('adminAppts.total'), value: counts.total, color: 'text-secondary-900' },
                    { label: t('adminAppts.pending'), value: counts.pending, color: 'text-amber-600' },
                    { label: t('adminAppts.confirmed'), value: counts.confirmed, color: 'text-blue-600' },
                    { label: t('adminAppts.completed'), value: counts.completed, color: 'text-green-600' },
                    { label: t('adminAppts.cancelled'), value: counts.cancelled, color: 'text-red-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-premium">
                <CardHeader className="border-b border-slate-50 space-y-3">
                    <div className="flex flex-wrap gap-1">
                        {[
                            { id: 'today', label: t('adminAppts.today') },
                            { id: 'upcoming', label: t('adminAppts.upcoming') },
                            { id: 'week', label: t('adminAppts.last7Days') },
                            { id: 'all', label: t('adminAppts.allHistory') }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setViewMode(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    viewMode === tab.id
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-100 text-secondary-600 hover:bg-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {viewMode === 'today' && (
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="max-w-[160px]"
                            />
                        )}
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                        >
                            <option value="">{t('adminAppts.allDoctors')}</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                        >
                            <option value="">{t('adminAppts.allDepts')}</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                        >
                            <option value="all">{t('adminAppts.allStatuses')}</option>
                            <option value="pending">{t('adminAppts.pending')}</option>
                            <option value="confirmed">{t('adminAppts.confirmed')}</option>
                            <option value="completed">{t('adminAppts.completed')}</option>
                            <option value="cancelled">{t('adminAppts.cancelled')}</option>
                        </select>
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('adminAppts.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <p className="p-8 text-center text-sm text-secondary-400 animate-pulse">{t('common.loading')}</p>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <Calendar size={40} className="mx-auto text-secondary-300 mb-3" />
                            <p className="font-semibold text-secondary-600">{t('adminAppts.empty')}</p>
                            <p className="text-xs text-secondary-400 mt-1">{t('adminAppts.emptyHint')}</p>
                            <Button className="mt-4 gap-2" onClick={openBookModal}>
                                <Plus size={16} /> {t('adminAppts.bookNew')}
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('adminAppts.colDate')}</TableHead>
                                    <TableHead>{t('adminAppts.colTime')}</TableHead>
                                    <TableHead>{t('adminAppts.colPatient')}</TableHead>
                                    <TableHead>{t('adminAppts.colDoctor')}</TableHead>
                                    <TableHead>{t('adminAppts.colDept')}</TableHead>
                                    <TableHead>{t('adminAppts.colToken')}</TableHead>
                                    <TableHead>{t('adminAppts.colStatus')}</TableHead>
                                    <TableHead className="text-right">{t('adminAppts.colActions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((a) => (
                                    <TableRow
                                        key={a.id}
                                        className={`cursor-pointer hover:bg-slate-50/80 ${
                                            selected?.id === a.id ? 'bg-amber-50/50' : ''
                                        }`}
                                        onClick={() => setSelected(a)}
                                    >
                                        <TableCell className="text-xs">{formatDate(a.appointment_date)}</TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1 text-sm font-mono">
                                                <Clock size={12} className="text-secondary-400" />
                                                {formatTime(a.appointment_time)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{a.patient_name}</p>
                                            {a.patient_phone && (
                                                <p className="text-[10px] text-secondary-400 flex items-center gap-1">
                                                    <Phone size={10} /> {a.patient_phone}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>{a.doctor_name}</TableCell>
                                        <TableCell>{a.department_name}</TableCell>
                                        <TableCell>
                                            {a.token_number ? (
                                                <span className="font-mono font-bold text-primary-700">{a.token_number}</span>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-wrap justify-end gap-1">
                                                {a.status === 'pending' && (
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'confirmed')}>
                                                        {t('adminAppts.confirm')}
                                                    </Button>
                                                )}
                                                {['pending', 'confirmed'].includes(a.status) && (
                                                    <>
                                                        <Button size="sm" className="bg-primary-600" onClick={() => callInOpd(a)}>
                                                            {t('adminAppts.callOpd')}
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'completed')}>
                                                            <CheckCircle2 size={14} />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'cancelled')}>
                                                            <XCircle size={14} className="text-red-500" />
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
                </CardContent>
            </Card>

            {selected && (
                <Card className="border-none shadow-premium max-w-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">{t('adminAppts.details')}</CardTitle>
                        <button type="button" onClick={() => setSelected(null)} className="text-secondary-400">
                            <X size={18} />
                        </button>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="p-4 rounded-xl bg-amber-50 text-center">
                            <p className="font-bold text-lg">{selected.patient_name}</p>
                            <p className="text-xs text-secondary-600 mt-1">
                                {formatDate(selected.appointment_date)} · {formatTime(selected.appointment_time)}
                            </p>
                            <Badge variant={statusVariant(selected.status)} className="mt-2">{selected.status}</Badge>
                        </div>
                        <dl className="space-y-2 text-secondary-600">
                            <div className="flex justify-between"><dt>{t('adminAppts.phone')}</dt><dd>{selected.patient_phone || '—'}</dd></div>
                            <div className="flex justify-between"><dt>{t('adminAppts.colDoctor')}</dt><dd className="font-medium">{selected.doctor_name}</dd></div>
                            <div className="flex justify-between"><dt>{t('adminAppts.colDept')}</dt><dd>{selected.department_name}</dd></div>
                            <div className="flex justify-between"><dt>{t('adminAppts.colToken')}</dt><dd className="font-mono font-bold">{selected.token_number || '—'}</dd></div>
                            <div className="flex justify-between"><dt>{t('adminAppts.tokenStatus')}</dt><dd>{selected.token_status || '—'}</dd></div>
                            {selected.remarks && (
                                <div><dt className="font-bold">{t('adminAppts.remarks')}</dt><dd className="mt-1 text-xs">{selected.remarks}</dd></div>
                            )}
                        </dl>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {selected.status === 'pending' && (
                                <Button size="sm" onClick={() => updateStatus(selected.id, 'confirmed')}>{t('adminAppts.confirm')}</Button>
                            )}
                            {['pending', 'confirmed'].includes(selected.status) && (
                                <>
                                    <Button size="sm" className="bg-primary-600" onClick={() => callInOpd(selected)}>{t('adminAppts.callOpd')}</Button>
                                    <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, 'completed')}>{t('adminAppts.markDone')}</Button>
                                    <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, 'cancelled')}>{t('adminAppts.cancel')}</Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {bookOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-lg border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('adminAppts.newBooking')}</CardTitle>
                            <button type="button" onClick={() => setBookOpen(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={submitBook}>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.selectPatient')}</label>
                                    <select
                                        required
                                        value={bookForm.patient_id}
                                        onChange={(e) => setBookForm((f) => ({ ...f, patient_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.selectDoctor')}</label>
                                    <select
                                        required
                                        value={bookForm.doctor_id}
                                        onChange={(e) => onDoctorPick(e.target.value)}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.selectDept')}</label>
                                    <select
                                        required
                                        value={bookForm.department_id}
                                        onChange={(e) => setBookForm((f) => ({ ...f, department_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.dateLabel')}</label>
                                        <Input
                                            type="date"
                                            required
                                            value={bookForm.appointment_date}
                                            onChange={(e) => setBookForm((f) => ({ ...f, appointment_date: e.target.value }))}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.time')}</label>
                                        <Input
                                            type="time"
                                            required
                                            value={bookForm.appointment_time}
                                            onChange={(e) => setBookForm((f) => ({ ...f, appointment_time: e.target.value }))}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.priority')}</label>
                                    <select
                                        value={bookForm.priority}
                                        onChange={(e) => setBookForm((f) => ({ ...f, priority: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="normal">{t('adminAppts.normal')}</option>
                                        <option value="emergency">{t('adminAppts.emergency')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminAppts.notes')}</label>
                                    <textarea
                                        rows={2}
                                        value={bookForm.remarks}
                                        onChange={(e) => setBookForm((f) => ({ ...f, remarks: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t border-slate-50">
                                <Button type="button" variant="outline" onClick={() => setBookOpen(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={submitting || !patients.length}>
                                    {submitting ? t('common.loading') : t('adminAppts.submitBook')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminAppointments;
