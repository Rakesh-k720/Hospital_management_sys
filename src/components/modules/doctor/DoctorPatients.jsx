import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Users, Search, Phone, Mail, Droplets, MapPin, AlertCircle,
    Stethoscope, FlaskConical, FileText, Grid, List, ArrowRight,
    Calendar, Activity, Pill, X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';

const DoctorPatients = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [genderFilter, setGenderFilter] = useState('all');
    const [sortBy, setSortBy] = useState('last_visit');
    const [viewMode, setViewMode] = useState('grid');
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await API.get('/doctor/patients');
                setPatients(res.data.data || []);
            } catch (err) {
                console.error(err);
                showToast(t('doctorPatients.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [t]);

    const stats = useMemo(() => ({
        total: patients.length,
        withPendingLabs: patients.filter((p) => Number(p.pending_labs) > 0).length,
        totalVisits: patients.reduce((s, p) => s + Number(p.visit_count || 0), 0),
        recent: patients.filter((p) => {
            if (!p.last_visit) return false;
            const diff = (Date.now() - new Date(p.last_visit).getTime()) / (1000 * 60 * 60 * 24);
            return diff <= 30;
        }).length
    }), [patients]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        let list = patients.filter((p) => {
            const matchSearch =
                !q ||
                p.name?.toLowerCase().includes(q) ||
                p.phone?.includes(q) ||
                p.email?.toLowerCase().includes(q) ||
                (p.blood_group || '').toLowerCase().includes(q);
            const matchGender = genderFilter === 'all' || p.gender === genderFilter;
            return matchSearch && matchGender;
        });
        list = [...list].sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'visits') return Number(b.visit_count) - Number(a.visit_count);
            const da = a.last_visit ? new Date(a.last_visit).getTime() : 0;
            const db = b.last_visit ? new Date(b.last_visit).getTime() : 0;
            return db - da;
        });
        return list;
    }, [patients, search, genderFilter, sortBy]);

    const openQueue = (p) => {
        navigate('/doctor/queue', {
            state: {
                patient: {
                    patient_id: p.patient_id,
                    patient_name: p.name,
                    age: p.age,
                    gender: p.gender,
                    blood_group: p.blood_group,
                    patient_phone: p.phone
                }
            }
        });
    };

    const openLabs = (p) => {
        navigate('/doctor/labs', { state: { patient_id: p.patient_id, patient_name: p.name } });
    };

    const initials = (name) =>
        (name || 'P').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Users className="text-primary-600" size={28} />
                        {t('doctorPatients.title')}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">{t('doctorPatients.subtitle')}</p>
                </div>
                <Button onClick={() => navigate('/doctor/queue')} className="shadow-soft gap-2">
                    <Stethoscope size={18} />
                    {t('doctorDash.openQueue')}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('doctorPatients.statTotal'), value: stats.total, icon: Users, color: 'from-primary-500 to-primary-700' },
                    { label: t('doctorPatients.statRecent'), value: stats.recent, icon: Calendar, color: 'from-emerald-500 to-green-700' },
                    { label: t('doctorPatients.statVisits'), value: stats.totalVisits, icon: Activity, color: 'from-sky-500 to-blue-700' },
                    { label: t('doctorPatients.statPendingLabs'), value: stats.withPendingLabs, icon: FlaskConical, color: 'from-violet-500 to-purple-700' },
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium overflow-hidden">
                        <CardContent className={`p-4 bg-gradient-to-br ${s.color} text-white`}>
                            <div className="flex items-center justify-between">
                                <s.icon size={22} className="opacity-90" />
                                <span className="text-2xl font-bold font-['Outfit']">{loading ? '—' : s.value}</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase mt-2 opacity-90">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Toolbar */}
            <Card className="border-none shadow-premium">
                <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('doctorPatients.searchPh')}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30"
                        />
                    </div>
                    <select
                        className="border border-slate-200 rounded-xl h-10 px-3 text-sm"
                        value={genderFilter}
                        onChange={(e) => setGenderFilter(e.target.value)}
                    >
                        <option value="all">{t('doctorPatients.allGenders')}</option>
                        <option value="male">{t('profile.male')}</option>
                        <option value="female">{t('profile.female')}</option>
                        <option value="other">{t('profile.other')}</option>
                    </select>
                    <select
                        className="border border-slate-200 rounded-xl h-10 px-3 text-sm"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="last_visit">{t('doctorPatients.sortLastVisit')}</option>
                        <option value="name">{t('doctorPatients.sortName')}</option>
                        <option value="visits">{t('doctorPatients.sortVisits')}</option>
                    </select>
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600'}`}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-2 ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            {loading ? (
                <p className="text-center text-secondary-400 py-12 animate-pulse">{t('doctorPatients.loading')}</p>
            ) : filtered.length === 0 ? (
                <Card className="border-none shadow-premium">
                    <CardContent className="py-16 text-center">
                        <Users size={48} className="mx-auto text-secondary-300 mb-3" />
                        <p className="font-semibold text-secondary-600">{t('doctorPatients.empty')}</p>
                        <p className="text-xs text-secondary-400 mt-1">{t('doctorPatients.emptyHint')}</p>
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((p) => (
                        <Card key={p.patient_id} className="border-none shadow-premium hover:shadow-lg transition-shadow group">
                            <CardContent className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
                                        {initials(p.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-secondary-900 truncate">{p.name}</p>
                                        <p className="text-xs text-secondary-500">
                                            P-{String(p.patient_id).padStart(4, '0')} · {p.age} {t('doctorDash.yrs')} · {p.gender}
                                        </p>
                                        {p.blood_group && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mt-1">
                                                <Droplets size={11} /> {p.blood_group}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    <Badge variant="secondary" className="text-[10px]">
                                        {p.visit_count} {t('doctorPatients.visits')}
                                    </Badge>
                                    {Number(p.pending_labs) > 0 && (
                                        <Badge variant="warning" className="text-[10px]">
                                            {p.pending_labs} {t('doctorPatients.labsPending')}
                                        </Badge>
                                    )}
                                    {Number(p.prescription_count) > 0 && (
                                        <Badge variant="success" className="text-[10px]">
                                            {p.prescription_count} Rx
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-[10px] text-secondary-500 mt-2 flex items-center gap-1">
                                    <Calendar size={11} />
                                    {t('doctorPatients.lastVisit')}:{' '}
                                    {p.last_visit ? new Date(p.last_visit).toLocaleDateString() : '—'}
                                </p>
                                {p.phone && (
                                    <p className="text-[10px] text-secondary-500 flex items-center gap-1 mt-0.5">
                                        <Phone size={11} /> {p.phone}
                                    </p>
                                )}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <Button size="sm" className="flex-1 text-xs h-8" onClick={() => openQueue(p)}>
                                        <Stethoscope size={14} className="mr-1" /> Rx
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => openLabs(p)}>
                                        <FlaskConical size={14} className="mr-1" /> Lab
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSelected(p)}>
                                        <FileText size={14} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-none shadow-premium overflow-x-auto">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('doctorPatients.colPatient')}</TableHead>
                                    <TableHead>{t('doctorPatients.colContact')}</TableHead>
                                    <TableHead>{t('doctorPatients.colDemographics')}</TableHead>
                                    <TableHead>{t('doctorPatients.colStats')}</TableHead>
                                    <TableHead>{t('doctorPatients.colLastVisit')}</TableHead>
                                    <TableHead className="text-right">{t('doctorAppts.colAction')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((p) => (
                                    <TableRow key={p.patient_id} className="hover:bg-slate-50/80">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold">
                                                    {initials(p.name)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{p.name}</p>
                                                    <p className="text-[10px] text-secondary-500">P-{String(p.patient_id).padStart(4, '0')}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {p.phone && <p className="flex items-center gap-1"><Phone size={11} />{p.phone}</p>}
                                            {p.email && <p className="flex items-center gap-1 text-secondary-500 mt-0.5"><Mail size={11} />{p.email}</p>}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {p.age} / {p.gender}
                                            {p.blood_group && <span className="text-red-600 font-semibold ml-1">· {p.blood_group}</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="secondary" className="text-[9px]">{p.visit_count} visits</Badge>
                                                {Number(p.pending_labs) > 0 && (
                                                    <Badge variant="warning" className="text-[9px]">{p.pending_labs} lab</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {p.last_visit ? new Date(p.last_visit).toLocaleDateString() : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" onClick={() => openQueue(p)} className="text-xs h-8">
                                                    Rx <ArrowRight size={12} />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setSelected(p)} className="h-8 px-2">
                                                    <FileText size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Detail panel */}
            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <button type="button" className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm" onClick={() => setSelected(null)} aria-label="Close" />
                    <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right">
                        <div className="sticky top-0 bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6">
                            <button type="button" onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20">
                                <X size={20} />
                            </button>
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold mb-3">
                                {initials(selected.name)}
                            </div>
                            <h3 className="text-xl font-bold">{selected.name}</h3>
                            <p className="text-primary-100 text-sm mt-1">
                                P-{String(selected.patient_id).padStart(4, '0')} · {selected.age} {t('doctorDash.yrs')} · {selected.gender}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 text-center">
                                    <p className="text-lg font-bold text-secondary-900">{selected.visit_count}</p>
                                    <p className="text-[10px] uppercase font-bold text-secondary-500">{t('doctorPatients.visits')}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 text-center">
                                    <p className="text-lg font-bold text-secondary-900">{selected.prescription_count}</p>
                                    <p className="text-[10px] uppercase font-bold text-secondary-500">Rx</p>
                                </div>
                            </div>
                            {selected.phone && (
                                <p className="flex items-center gap-2 text-sm"><Phone size={16} className="text-primary-600" /> {selected.phone}</p>
                            )}
                            {selected.email && (
                                <p className="flex items-center gap-2 text-sm"><Mail size={16} className="text-primary-600" /> {selected.email}</p>
                            )}
                            {selected.address && (
                                <p className="flex items-start gap-2 text-sm"><MapPin size={16} className="text-primary-600 shrink-0 mt-0.5" /> {selected.address}</p>
                            )}
                            {selected.emergency_contact && (
                                <p className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-xl">
                                    <AlertCircle size={16} /> {t('profile.emergency')}: {selected.emergency_contact}
                                </p>
                            )}
                            {selected.allergies && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                                    <p className="text-xs font-bold text-amber-900 uppercase">{t('profile.allergies')}</p>
                                    <p className="text-sm text-amber-800 mt-1">{selected.allergies}</p>
                                </div>
                            )}
                            {selected.medical_notes && (
                                <div className="p-3 rounded-xl bg-slate-50">
                                    <p className="text-xs font-bold text-secondary-600 uppercase">{t('profile.medicalNotes')}</p>
                                    <p className="text-sm text-secondary-700 mt-1">{selected.medical_notes}</p>
                                </div>
                            )}
                            <div className="flex flex-col gap-2 pt-4">
                                <Button onClick={() => { openQueue(selected); setSelected(null); }} className="w-full gap-2">
                                    <Stethoscope size={18} /> {t('doctorPatients.writeRx')}
                                </Button>
                                <Button variant="outline" onClick={() => { openLabs(selected); setSelected(null); }} className="w-full gap-2">
                                    <FlaskConical size={18} /> {t('doctorPatients.orderLab')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorPatients;
