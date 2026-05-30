import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Ticket,
    Users,
    Clock,
    RefreshCw,
    Plus,
    Search,
    Monitor,
    X,
    Phone,
    AlertTriangle,
    CheckCircle2,
    Stethoscope
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const statusKeys = {
    waiting: 'adminOpd.waiting',
    in_consultation: 'adminOpd.inConsult',
    completed: 'adminOpd.completed'
};

const OpdManagement = () => {
    const { t } = useTranslation();
    const today = new Date().toISOString().slice(0, 10);

    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, in_consultation: 0, completed: 0 });
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const [visitDate, setVisitDate] = useState(today);
    const [doctorFilter, setDoctorFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusTab, setStatusTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState(null);

    const [walkInOpen, setWalkInOpen] = useState(false);
    const [walkInSubmitting, setWalkInSubmitting] = useState(false);
    const [walkInForm, setWalkInForm] = useState({
        patient_id: '',
        doctor_id: '',
        department_id: '',
        priority: 'normal'
    });

    const fetchMeta = useCallback(async () => {
        try {
            const [docRes, deptRes, patRes] = await Promise.all([
                API.get('/admin/doctors'),
                API.get('/admin/departments'),
                API.get('/admin/patients')
            ]);
            setDoctors(docRes.data.data || []);
            setDepartments(deptRes.data.data || []);
            setPatients(patRes.data.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const params = { date: visitDate };
            if (doctorFilter) params.doctor_id = doctorFilter;
            if (deptFilter) params.department_id = deptFilter;
            const res = await API.get('/queue/opd', { params });
            setQueue(res.data.data.queue || []);
            setStats(res.data.data.stats || {});
        } catch (err) {
            showToast(err.response?.data?.message || t('adminOpd.loadError'), 'error');
            setQueue([]);
        } finally {
            setLoading(false);
        }
    }, [visitDate, doctorFilter, deptFilter, t]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(fetchQueue, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchQueue]);

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('queue:update', fetchQueue);
        return () => socket.disconnect();
    }, [fetchQueue]);

    const updateStatus = async (tokenId, status) => {
        try {
            await API.patch('/queue/token-status', { token_id: tokenId, status });
            showToast(t('adminOpd.updated'));
            fetchQueue();
            if (selected?.token_id === tokenId) {
                setSelected((s) => (s ? { ...s, token_status: status } : null));
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Update failed', 'error');
        }
    };

    const togglePriority = async (item) => {
        const next = item.priority === 'emergency' ? 'normal' : 'emergency';
        try {
            await API.patch('/queue/token-priority', { token_id: item.token_id, priority: next });
            showToast(t('adminOpd.priorityUpdated'));
            fetchQueue();
        } catch (err) {
            showToast(err.response?.data?.message || 'Update failed', 'error');
        }
    };

    const openWalkIn = () => {
        setWalkInForm({
            patient_id: patients[0] ? String(patients[0].id) : '',
            doctor_id: doctors[0] ? String(doctors[0].id) : '',
            department_id: doctors[0] ? String(doctors[0].department_id) : departments[0] ? String(departments[0].id) : '',
            priority: 'normal'
        });
        setWalkInOpen(true);
    };

    const onDoctorPick = (doctorId) => {
        const doc = doctors.find((d) => String(d.id) === String(doctorId));
        setWalkInForm((f) => ({
            ...f,
            doctor_id: doctorId,
            department_id: doc?.department_id ? String(doc.department_id) : f.department_id
        }));
    };

    const submitWalkIn = async (e) => {
        e.preventDefault();
        setWalkInSubmitting(true);
        try {
            const res = await API.post('/queue/walk-in', {
                patient_id: parseInt(walkInForm.patient_id, 10),
                doctor_id: parseInt(walkInForm.doctor_id, 10),
                department_id: parseInt(walkInForm.department_id, 10),
                visit_date: visitDate,
                priority: walkInForm.priority
            });
            const { tokenNumber, queuePosition } = res.data.data;
            showToast(t('adminOpd.tokenIssued', { token: tokenNumber, pos: queuePosition }));
            setWalkInOpen(false);
            fetchQueue();
        } catch (err) {
            const existing = err.response?.data?.data?.token_number;
            if (err.response?.status === 409 && existing) {
                showToast(t('adminOpd.activeToken', { token: existing }), 'error');
            } else {
                showToast(err.response?.data?.message || 'Failed to issue token', 'error');
            }
        } finally {
            setWalkInSubmitting(false);
        }
    };

    const nowServing = useMemo(
        () => queue.find((q) => q.token_status === 'in_consultation'),
        [queue]
    );

    const filteredQueue = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return queue.filter((item) => {
            if (statusTab !== 'all' && item.token_status !== statusTab) return false;
            if (!q) return true;
            return (
                (item.token_number || '').toLowerCase().includes(q) ||
                (item.patient_name || '').toLowerCase().includes(q) ||
                (item.doctor_name || '').toLowerCase().includes(q) ||
                (item.department_name || '').toLowerCase().includes(q) ||
                (item.patient_phone || '').includes(q)
            );
        });
    }, [queue, searchQuery, statusTab]);

    const doctorBreakdown = useMemo(() => {
        const map = {};
        queue.forEach((item) => {
            const key = item.doctor_name || 'Unknown';
            if (!map[key]) map[key] = { waiting: 0, active: 0, done: 0, total: 0 };
            map[key].total += 1;
            if (item.token_status === 'waiting') map[key].waiting += 1;
            else if (item.token_status === 'in_consultation') map[key].active += 1;
            else if (item.token_status === 'completed') map[key].done += 1;
        });
        return Object.entries(map).sort((a, b) => b[1].waiting - a[1].waiting);
    }, [queue]);

    const statusBadge = (status) => {
        const variant =
            status === 'completed' ? 'success' : status === 'in_consultation' ? 'warning' : 'secondary';
        return <Badge variant={variant}>{t(statusKeys[status] || status)}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Ticket className="text-primary-600" size={28} />
                        {t('adminOpd.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminOpd.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-secondary-600 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        {t('adminOpd.autoRefresh')}
                    </label>
                    <Link to="/lobby" target="_blank" rel="noreferrer">
                        <Button variant="outline" className="gap-2">
                            <Monitor size={16} /> {t('adminOpd.lobby')}
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={fetchQueue} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {t('adminOpd.refresh')}
                    </Button>
                    <Button onClick={openWalkIn} className="gap-2 bg-primary-600 hover:bg-primary-700">
                        <Plus size={16} /> {t('adminOpd.walkIn')}
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-premium overflow-hidden">
                <CardContent className="p-0">
                    <div className="grid md:grid-cols-2">
                        <div className="p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                            <p className="text-xs uppercase tracking-widest opacity-80">{t('adminOpd.nowServing')}</p>
                            {nowServing ? (
                                <>
                                    <p className="text-5xl font-bold mt-2 font-mono">{nowServing.token_number}</p>
                                    <p className="mt-2 text-sm opacity-90">{nowServing.patient_name}</p>
                                    <p className="text-xs opacity-75">
                                        {nowServing.doctor_name} · {nowServing.department_name}
                                    </p>
                                </>
                            ) : (
                                <p className="text-lg mt-4 opacity-80">{t('adminOpd.noneServing')}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
                            {[
                                { label: t('adminOpd.totalToday'), value: stats.total || 0, icon: Ticket, color: 'text-secondary-900' },
                                { label: t('adminOpd.waiting'), value: stats.waiting || 0, icon: Users, color: 'text-amber-600' },
                                { label: t('adminOpd.inConsult'), value: stats.in_consultation || 0, icon: Clock, color: 'text-violet-600' },
                                { label: t('adminOpd.completed'), value: stats.completed || 0, icon: CheckCircle2, color: 'text-green-600' }
                            ].map((s) => (
                                <div key={s.label} className="bg-white p-4 flex flex-col justify-center">
                                    <s.icon size={18} className={`${s.color} mb-1`} />
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col xl:flex-row gap-4">
                <Card className="flex-1 border-none shadow-premium">
                    <CardHeader className="border-b border-slate-50 space-y-3">
                        <div className="flex flex-wrap gap-2 items-center">
                            <Input
                                type="date"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className="max-w-[160px]"
                            />
                            <select
                                value={doctorFilter}
                                onChange={(e) => setDoctorFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white"
                            >
                                <option value="">{t('adminOpd.allDoctors')}</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white"
                            >
                                <option value="">{t('adminOpd.allDepts')}</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {[
                                { id: 'all', label: t('adminOpd.allStatus') },
                                { id: 'waiting', label: t('adminOpd.tabWaiting') },
                                { id: 'in_consultation', label: t('adminOpd.tabActive') },
                                { id: 'completed', label: t('adminOpd.tabDone') }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setStatusTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        statusTab === tab.id
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-100 text-secondary-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('adminOpd.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <p className="p-8 text-center text-sm text-secondary-400 animate-pulse">{t('common.loading')}</p>
                        ) : filteredQueue.length === 0 ? (
                            <div className="p-12 text-center">
                                <Ticket size={40} className="mx-auto text-secondary-300 mb-3" />
                                <p className="font-semibold text-secondary-600">{t('adminOpd.empty')}</p>
                                <Button className="mt-4 gap-2" onClick={openWalkIn}>
                                    <Plus size={16} /> {t('adminOpd.walkIn')}
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Token</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Dept</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQueue.map((item) => (
                                        <TableRow
                                            key={item.token_id}
                                            className={`cursor-pointer hover:bg-slate-50/80 ${
                                                selected?.token_id === item.token_id ? 'bg-primary-50/50' : ''
                                            } ${item.token_status === 'in_consultation' ? 'ring-1 ring-inset ring-violet-200' : ''}`}
                                            onClick={() => setSelected(item)}
                                        >
                                            <TableCell className="font-mono font-bold text-primary-700">
                                                {item.token_number}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{item.patient_name}</p>
                                                {item.patient_phone && (
                                                    <p className="text-[10px] text-secondary-400 flex items-center gap-1">
                                                        <Phone size={10} /> {item.patient_phone}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.doctor_name}</TableCell>
                                            <TableCell>{item.department_name}</TableCell>
                                            <TableCell>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePriority(item);
                                                    }}
                                                    className="inline-block"
                                                >
                                                    <Badge variant={item.priority === 'emergency' ? 'danger' : 'secondary'}>
                                                        {item.priority === 'emergency' ? t('adminOpd.emergency') : t('adminOpd.normal')}
                                                    </Badge>
                                                </button>
                                            </TableCell>
                                            <TableCell>{statusBadge(item.token_status)}</TableCell>
                                            <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                                                {item.token_status === 'waiting' && (
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.token_id, 'in_consultation')}>
                                                        {t('adminOpd.call')}
                                                    </Button>
                                                )}
                                                {item.token_status === 'in_consultation' && (
                                                    <>
                                                        <Button size="sm" variant="outline" onClick={() => updateStatus(item.token_id, 'waiting')}>
                                                            {t('adminOpd.requeue')}
                                                        </Button>
                                                        <Button size="sm" onClick={() => updateStatus(item.token_id, 'completed')}>
                                                            {t('adminOpd.complete')}
                                                        </Button>
                                                    </>
                                                )}
                                                {item.token_status === 'completed' && (
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.token_id, 'waiting')}>
                                                        {t('adminOpd.requeue')}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <div className="w-full xl:w-80 space-y-4 shrink-0">
                    {selected && (
                        <Card className="border-none shadow-premium">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">{t('adminOpd.details')}</CardTitle>
                                <button type="button" onClick={() => setSelected(null)} className="text-secondary-400 hover:text-secondary-600">
                                    <X size={18} />
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="text-center p-4 rounded-xl bg-primary-50">
                                    <p className="text-3xl font-mono font-bold text-primary-700">{selected.token_number}</p>
                                    <p className="font-semibold mt-1">{selected.patient_name}</p>
                                    {statusBadge(selected.token_status)}
                                </div>
                                <dl className="space-y-2 text-secondary-600">
                                    <div className="flex justify-between"><dt>{t('adminOpd.phone')}</dt><dd className="font-medium">{selected.patient_phone || '—'}</dd></div>
                                    <div className="flex justify-between"><dt>{t('adminOpd.age')}</dt><dd>{selected.age ?? '—'}</dd></div>
                                    <div className="flex justify-between"><dt>{t('adminOpd.gender')}</dt><dd>{selected.gender || '—'}</dd></div>
                                    <div className="flex justify-between"><dt>{t('adminOpd.blood')}</dt><dd>{selected.blood_group || '—'}</dd></div>
                                    <div className="flex justify-between"><dt>Doctor</dt><dd>{selected.doctor_name}</dd></div>
                                    <div className="flex justify-between"><dt>{t('adminOpd.apptTime')}</dt><dd>{selected.appointment_time?.slice(0, 5) || '—'}</dd></div>
                                </dl>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {selected.token_status === 'waiting' && (
                                        <Button size="sm" className="flex-1" onClick={() => updateStatus(selected.token_id, 'in_consultation')}>
                                            {t('adminOpd.call')}
                                        </Button>
                                    )}
                                    {selected.token_status === 'in_consultation' && (
                                        <Button size="sm" className="flex-1" onClick={() => updateStatus(selected.token_id, 'completed')}>
                                            {t('adminOpd.complete')}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 gap-1"
                                        onClick={() => togglePriority(selected)}
                                    >
                                        <AlertTriangle size={14} />
                                        {selected.priority === 'emergency' ? t('adminOpd.normal') : t('adminOpd.emergency')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Stethoscope size={16} /> {t('adminOpd.byDoctor')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                            {doctorBreakdown.length === 0 ? (
                                <p className="text-xs text-secondary-400">—</p>
                            ) : (
                                doctorBreakdown.map(([name, counts]) => (
                                    <div key={name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                                        <span className="font-medium text-secondary-800 truncate pr-2">{name}</span>
                                        <span className="shrink-0 text-amber-600 font-bold">{counts.waiting}W</span>
                                        <span className="shrink-0 text-violet-600 font-bold ml-1">{counts.active}A</span>
                                        <span className="shrink-0 text-green-600 font-bold ml-1">{counts.done}D</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {walkInOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-md border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('adminOpd.walkIn')}</CardTitle>
                            <button type="button" onClick={() => setWalkInOpen(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={submitWalkIn}>
                            <CardContent className="space-y-4">
                                <p className="text-xs text-secondary-500">Date: {visitDate}</p>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">{t('adminOpd.selectPatient')}</label>
                                    <select
                                        required
                                        value={walkInForm.patient_id}
                                        onChange={(e) => setWalkInForm((f) => ({ ...f, patient_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="">—</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.phone || p.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">{t('adminOpd.selectDoctor')}</label>
                                    <select
                                        required
                                        value={walkInForm.doctor_id}
                                        onChange={(e) => onDoctorPick(e.target.value)}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Department</label>
                                    <select
                                        required
                                        value={walkInForm.department_id}
                                        onChange={(e) => setWalkInForm((f) => ({ ...f, department_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">{t('adminOpd.priority')}</label>
                                    <select
                                        value={walkInForm.priority}
                                        onChange={(e) => setWalkInForm((f) => ({ ...f, priority: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="normal">{t('adminOpd.normal')}</option>
                                        <option value="emergency">{t('adminOpd.emergency')}</option>
                                    </select>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t border-slate-50">
                                <Button type="button" variant="outline" onClick={() => setWalkInOpen(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={walkInSubmitting || !patients.length}>
                                    {walkInSubmitting ? t('common.loading') : t('adminOpd.issueToken')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default OpdManagement;
