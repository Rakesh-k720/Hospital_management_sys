import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Calendar, Search, Filter, Phone, Stethoscope, ArrowRight,
    Clock, Users
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';

const statusVariant = (status) => {
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    if (status === 'pending') return 'warning';
    return 'secondary';
};

const DoctorAppointments = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [viewMode, setViewMode] = useState('today');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const params =
                    viewMode === 'all'
                        ? { range: 'all' }
                        : { date: date || today };
                const res = await API.get('/doctor/appointments', { params });
                setAppointments(res.data.data || []);
            } catch (err) {
                console.error(err);
                showToast(t('doctorAppts.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [date, viewMode, today, t]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return appointments.filter((a) => {
            const matchSearch =
                !q ||
                a.patient_name?.toLowerCase().includes(q) ||
                (a.token_number || '').toLowerCase().includes(q) ||
                a.department_name?.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || a.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [appointments, search, statusFilter]);

    const counts = useMemo(() => ({
        total: appointments.length,
        pending: appointments.filter((a) => a.status === 'pending').length,
        completed: appointments.filter((a) => a.status === 'completed').length,
        cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    }), [appointments]);

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Calendar className="text-primary-600" size={28} />
                        {t('doctorAppts.title')}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">{t('doctorAppts.subtitle')}</p>
                </div>
                <Button onClick={() => navigate('/doctor/queue')} className="shadow-soft">
                    <Stethoscope size={18} className="mr-2" />
                    {t('doctorDash.openQueue')}
                </Button>
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: t('doctorAppts.total'), value: counts.total, color: 'bg-primary-50 text-primary-700' },
                    { label: t('doctorAppts.pending'), value: counts.pending, color: 'bg-amber-50 text-amber-700' },
                    { label: t('doctorAppts.completed'), value: counts.completed, color: 'bg-green-50 text-green-700' },
                    { label: t('doctorAppts.cancelled'), value: counts.cancelled, color: 'bg-red-50 text-red-700' },
                ].map((c) => (
                    <Card key={c.label} className="border-none shadow-premium">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${c.color}`}>
                                <Users size={18} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-secondary-900">{loading ? '—' : c.value}</p>
                                <p className="text-[10px] font-bold uppercase text-secondary-500">{c.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-none shadow-premium">
                <CardContent className="p-4 flex flex-col lg:flex-row gap-4 lg:items-end">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => { setViewMode('today'); setDate(today); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                viewMode === 'today' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-secondary-600'
                            }`}
                        >
                            {t('doctorAppts.today')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('date')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                viewMode === 'date' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-secondary-600'
                            }`}
                        >
                            {t('doctorAppts.pickDate')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                viewMode === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-secondary-600'
                            }`}
                        >
                            {t('doctorAppts.allHistory')}
                        </button>
                    </div>
                    {viewMode === 'date' && (
                        <Input
                            type="date"
                            label={t('doctorAppts.dateLabel')}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="max-w-xs"
                        />
                    )}
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold text-secondary-600 mb-1 flex items-center gap-1">
                            <Filter size={12} /> {t('doctorAppts.status')}
                        </label>
                        <select
                            className="w-full border border-slate-200 rounded-lg h-10 px-3 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">{t('doctorAppts.allStatuses')}</option>
                            <option value="pending">pending</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px] relative">
                        <Search size={14} className="absolute left-3 top-[38px] text-secondary-400" />
                        <Input
                            label={t('doctorAppts.search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                            placeholder={t('doctorDash.searchPlaceholder')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-none shadow-premium">
                <CardHeader className="border-b border-slate-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock size={18} className="text-primary-600" />
                        {t('doctorAppts.schedule')}
                        <span className="text-sm font-normal text-secondary-400">({filtered.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <p className="p-8 text-center text-secondary-400 animate-pulse">{t('doctorAppts.loading')}</p>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <Calendar size={40} className="mx-auto text-secondary-300 mb-3" />
                            <p className="font-semibold text-secondary-600">{t('doctorAppts.empty')}</p>
                            <p className="text-xs text-secondary-400 mt-1">{t('doctorAppts.emptyHint')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('doctorAppts.colDate')}</TableHead>
                                    <TableHead>{t('doctorAppts.colTime')}</TableHead>
                                    <TableHead>{t('doctorAppts.colPatient')}</TableHead>
                                    <TableHead>{t('doctorAppts.colDept')}</TableHead>
                                    <TableHead>{t('doctorAppts.colToken')}</TableHead>
                                    <TableHead>{t('doctorAppts.colStatus')}</TableHead>
                                    <TableHead className="text-right">{t('doctorAppts.colAction')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((a) => (
                                    <TableRow key={a.id} className="hover:bg-slate-50/80">
                                        <TableCell className="text-xs font-medium">
                                            {new Date(a.appointment_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{a.appointment_time?.slice(0, 5) || '—'}</TableCell>
                                        <TableCell>
                                            <p className="font-bold text-sm">{a.patient_name}</p>
                                            <p className="text-[10px] text-secondary-500">
                                                {a.age} {t('doctorDash.yrs')} · {a.gender}
                                                {a.blood_group ? ` · ${a.blood_group}` : ''}
                                            </p>
                                            {a.patient_phone && (
                                                <p className="text-[10px] text-secondary-400 flex items-center gap-1 mt-0.5">
                                                    <Phone size={10} /> {a.patient_phone}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">{a.department_name || '—'}</TableCell>
                                        <TableCell>
                                            <span className="font-bold text-primary-700 text-sm">
                                                {a.token_number || '—'}
                                            </span>
                                            {a.priority === 'emergency' && (
                                                <Badge variant="danger" className="ml-1 text-[9px]">
                                                    {t('doctorDash.emergency')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={a.status === 'completed' || a.status === 'cancelled'}
                                                onClick={() => callPatient(a)}
                                                className="text-xs font-bold"
                                            >
                                                {t('doctorDash.callPatient')}
                                                <ArrowRight size={12} className="ml-1" />
                                            </Button>
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

export default DoctorAppointments;
