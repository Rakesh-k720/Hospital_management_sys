import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Bed,
    BedDouble,
    RefreshCw,
    UserPlus,
    Search,
    Grid,
    X,
    Phone,
    Stethoscope,
    LogOut,
    Sparkles,
    MapPin
} from 'lucide-react';

const bedStatusVariant = {
    available: 'success',
    occupied: 'danger',
    cleaning: 'warning'
};

const stayDays = (date) => {
    if (!date) return 0;
    return Math.max(0, Math.ceil((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)));
};

const BedManagement = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [bedsList, setBedsList] = useState([]);
    const [admissions, setAdmissions] = useState([]);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const [selectedWard, setSelectedWard] = useState('');
    const [wardFilter, setWardFilter] = useState('all');
    const [bedStatusFilter, setBedStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [selectedBed, setSelectedBed] = useState(null);

    const [showAdmit, setShowAdmit] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [admitForm, setAdmitForm] = useState({ patient_id: '', doctor_id: '', bed_id: '', diagnosis: '' });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [bedsRes, admRes, patRes, docRes] = await Promise.all([
                API.get('/admin/beds'),
                API.get('/admin/admissions'),
                API.get('/admin/patients'),
                API.get('/admin/doctors')
            ]);
            const beds = bedsRes.data.data || [];
            const adms = admRes.data.data || [];
            setBedsList(beds);
            setAdmissions(adms);
            setPatients(patRes.data.data || []);
            setDoctors(docRes.data.data || []);

            setSelectedWard((prev) => {
                const wards = [...new Set(beds.map((b) => b.ward_name))];
                if (prev && beds.some((b) => b.ward_name === prev)) return prev;
                return wards[0] || '';
            });
        } catch (err) {
            showToast(err.response?.data?.message || t('adminIpd.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(fetchAll, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchAll]);

    const bedStats = useMemo(() => {
        const total = bedsList.length;
        const available = bedsList.filter((b) => b.status === 'available').length;
        const occupied = bedsList.filter((b) => b.status === 'occupied').length;
        const cleaning = bedsList.filter((b) => b.status === 'cleaning').length;
        const occupancy = total ? Math.round((occupied / total) * 100) : 0;
        return { total, available, occupied, cleaning, occupancy, admitted: admissions.length };
    }, [bedsList, admissions]);

    const uniqueWards = useMemo(
        () => [...new Set(bedsList.map((b) => b.ward_name).filter(Boolean))],
        [bedsList]
    );

    const wardsStats = useMemo(
        () =>
            uniqueWards.map((wardName) => {
                const wardBeds = bedsList.filter((b) => b.ward_name === wardName);
                const occupied = wardBeds.filter((b) => b.status === 'occupied').length;
                return {
                    name: wardName,
                    total: wardBeds.length,
                    occupied,
                    available: wardBeds.filter((b) => b.status === 'available').length,
                    cleaning: wardBeds.filter((b) => b.status === 'cleaning').length,
                    type: wardBeds[0]?.bed_type || 'general',
                    pct: wardBeds.length ? Math.round((occupied / wardBeds.length) * 100) : 0
                };
            }),
        [uniqueWards, bedsList]
    );

    const filteredAdmissions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return admissions.filter((a) => {
            const matchWard = wardFilter === 'all' || a.ward_name === wardFilter;
            if (!matchWard) return false;
            if (!q) return true;
            return (
                (a.patient_name || '').toLowerCase().includes(q) ||
                (a.doctor_name || '').toLowerCase().includes(q) ||
                (a.ward_name || '').toLowerCase().includes(q) ||
                String(a.bed_number || '').toLowerCase().includes(q) ||
                (a.diagnosis || '').toLowerCase().includes(q) ||
                (a.patient_phone || '').includes(q)
            );
        });
    }, [admissions, searchQuery, wardFilter]);

    const activeWardBeds = useMemo(() => {
        let beds = bedsList.filter((b) => b.ward_name === selectedWard);
        if (bedStatusFilter !== 'all') {
            beds = beds.filter((b) => b.status === bedStatusFilter);
        }
        return beds;
    }, [bedsList, selectedWard, bedStatusFilter]);

    const availableBeds = useMemo(
        () => bedsList.filter((b) => b.status === 'available'),
        [bedsList]
    );

    const openAdmitModal = (preselectBedId) => {
        const firstBed = preselectBedId || (availableBeds[0]?.id ? String(availableBeds[0].id) : '');
        setAdmitForm({
            patient_id: patients[0] ? String(patients[0].id) : '',
            doctor_id: doctors[0] ? String(doctors[0].id) : '',
            bed_id: firstBed ? String(firstBed) : '',
            diagnosis: ''
        });
        setShowAdmit(true);
    };

    const handleAdmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post('/admin/admit', {
                patient_id: parseInt(admitForm.patient_id, 10),
                doctor_id: parseInt(admitForm.doctor_id, 10),
                bed_id: parseInt(admitForm.bed_id, 10),
                diagnosis: admitForm.diagnosis
            });
            showToast(t('adminIpd.admittedSuccess'));
            setShowAdmit(false);
            fetchAll();
        } catch (err) {
            showToast(err.response?.data?.message || 'Admission failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const markBedAvailable = async (bedId) => {
        try {
            await API.patch(`/admin/beds/${bedId}/status`, { status: 'available' });
            showToast(t('adminIpd.bedUpdated'));
            fetchAll();
            if (selectedBed?.id === bedId) setSelectedBed(null);
        } catch {
            showToast('Failed', 'error');
        }
    };

    const goDischarge = (admissionId) => {
        navigate('/admin/reports', { state: { admissionId } });
    };

    const bedTypeLabel = (type) => {
        if (type === 'ICU') return t('adminIpd.icu');
        if (type === 'private') return t('adminIpd.private');
        return t('adminIpd.general');
    };

    const onBedClick = (bed) => {
        setSelectedBed(bed);
        if (bed.admission_id) {
            const adm = admissions.find((a) => a.id === bed.admission_id);
            if (adm) setSelectedAdmission(adm);
        } else {
            setSelectedAdmission(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <BedDouble className="text-rose-600" size={28} />
                        {t('adminIpd.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminIpd.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-secondary-600 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        {t('adminIpd.autoRefresh')}
                    </label>
                    <Button variant="outline" onClick={fetchAll} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminIpd.refresh')}
                    </Button>
                    <Button onClick={() => openAdmitModal()} className="gap-2 bg-rose-600 hover:bg-rose-700" disabled={!availableBeds.length}>
                        <UserPlus size={16} />
                        {t('adminIpd.admitPatient')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: t('adminIpd.totalBeds'), value: bedStats.total, color: 'text-secondary-900', bg: 'bg-slate-50' },
                    { label: t('adminIpd.available'), value: bedStats.available, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: t('adminIpd.occupied'), value: bedStats.occupied, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: t('adminIpd.cleaning'), value: bedStats.cleaning, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: t('adminIpd.admitted'), value: bedStats.admitted, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: t('adminIpd.occupancy'), value: `${bedStats.occupancy}%`, color: 'text-rose-600', bg: 'bg-rose-50' }
                ].map((s) => (
                    <Card key={s.label} className={`border-none shadow-premium ${s.bg}`}>
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {wardsStats.map((ward) => (
                    <button
                        key={ward.name}
                        type="button"
                        onClick={() => {
                            setSelectedWard(ward.name);
                            setWardFilter(ward.name);
                        }}
                        className={`text-left rounded-2xl border-2 p-4 transition-all ${
                            selectedWard === ward.name
                                ? 'border-rose-500 bg-rose-50/50 shadow-md'
                                : 'border-slate-100 bg-white hover:border-rose-200'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-secondary-900 truncate">{ward.name}</h3>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                                {bedTypeLabel(ward.type)}
                            </Badge>
                        </div>
                        <p className="text-xs text-secondary-500 mt-1">
                            {ward.available} {t('adminIpd.available').toLowerCase()} / {ward.total}
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className="h-full bg-rose-500 rounded-full transition-all"
                                style={{ width: `${ward.pct}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-secondary-400 mt-1">{ward.pct}% {t('adminIpd.occupied').toLowerCase()}</p>
                    </button>
                ))}
            </div>

            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 space-y-4">
                    <Card className="border-none shadow-premium">
                        <CardHeader className="border-b border-slate-50 space-y-3">
                            <CardTitle className="text-base">{t('adminIpd.currentAdmissions')}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={wardFilter}
                                    onChange={(e) => setWardFilter(e.target.value)}
                                    className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                                >
                                    <option value="all">{t('adminIpd.allWards')}</option>
                                    {uniqueWards.map((w) => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('adminIpd.searchPlaceholder')}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {loading ? (
                                <p className="p-8 text-center text-sm text-secondary-400 animate-pulse">{t('common.loading')}</p>
                            ) : filteredAdmissions.length === 0 ? (
                                <div className="p-12 text-center">
                                    <BedDouble size={40} className="mx-auto text-secondary-300 mb-3" />
                                    <p className="font-semibold text-secondary-600">{t('adminIpd.emptyAdmissions')}</p>
                                    {availableBeds.length > 0 && (
                                        <Button className="mt-4 gap-2" onClick={() => openAdmitModal()}>
                                            <UserPlus size={16} /> {t('adminIpd.admitPatient')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('adminIpd.patient')}</TableHead>
                                            <TableHead>{t('adminIpd.wardBed')}</TableHead>
                                            <TableHead>{t('adminIpd.doctor')}</TableHead>
                                            <TableHead>{t('adminIpd.stay')}</TableHead>
                                            <TableHead>{t('adminIpd.diagnosis')}</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAdmissions.map((a) => (
                                            <TableRow
                                                key={a.id}
                                                className={`cursor-pointer hover:bg-slate-50/80 ${
                                                    selectedAdmission?.id === a.id ? 'bg-rose-50/50' : ''
                                                }`}
                                                onClick={() => setSelectedAdmission(a)}
                                            >
                                                <TableCell>
                                                    <p className="font-medium">{a.patient_name}</p>
                                                    {a.patient_phone && (
                                                        <p className="text-[10px] text-secondary-400 flex items-center gap-1">
                                                            <Phone size={10} /> {a.patient_phone}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{a.ward_name}</Badge>
                                                    <span className="ml-1 font-mono text-xs">#{a.bed_number}</span>
                                                </TableCell>
                                                <TableCell>{a.doctor_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="info">{t('adminIpd.days', { count: stayDays(a.admission_date) })}</Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[180px] truncate text-xs text-secondary-600">
                                                    {a.diagnosis || '—'}
                                                </TableCell>
                                                <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="sm" variant="outline" onClick={() => setSelectedAdmission(a)}>
                                                        {t('adminIpd.viewDetails')}
                                                    </Button>
                                                    <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={() => goDischarge(a.id)}>
                                                        <LogOut size={14} className="mr-1" />
                                                        {t('adminIpd.discharge')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {selectedWard && (
                        <Card className="border-none shadow-premium">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Grid size={18} />
                                    {t('adminIpd.wardMap')}: {selectedWard}
                                </CardTitle>
                                <div className="flex gap-1 flex-wrap">
                                    {[
                                        { id: 'all', label: t('adminIpd.allBeds') },
                                        { id: 'available', label: t('adminIpd.bedAvailable') },
                                        { id: 'occupied', label: t('adminIpd.bedOccupied') },
                                        { id: 'cleaning', label: t('adminIpd.bedCleaning') }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setBedStatusFilter(tab.id)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                                bedStatusFilter === tab.id
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-slate-100 text-secondary-600'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {activeWardBeds.length === 0 ? (
                                    <p className="text-sm text-secondary-400 text-center py-6">{t('adminIpd.noBedsInWard')}</p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {activeWardBeds.map((bed) => (
                                            <button
                                                key={bed.id}
                                                type="button"
                                                onClick={() => onBedClick(bed)}
                                                className={`p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                                                    bed.status === 'occupied'
                                                        ? 'border-red-200 bg-red-50'
                                                        : bed.status === 'available'
                                                          ? 'border-green-200 bg-green-50'
                                                          : 'border-amber-200 bg-amber-50'
                                                } ${selectedBed?.id === bed.id ? 'ring-2 ring-rose-500' : ''}`}
                                            >
                                                <Bed size={22} className="mx-auto mb-1 text-secondary-600" />
                                                <p className="text-xs font-bold font-mono">{bed.bed_number}</p>
                                                <Badge variant={bedStatusVariant[bed.status]} className="mt-1 text-[9px]">
                                                    {bed.status}
                                                </Badge>
                                                {bed.patient_name && (
                                                    <p className="text-[9px] font-medium text-secondary-700 mt-1 truncate w-full">
                                                        {bed.patient_name}
                                                    </p>
                                                )}
                                                {bed.status === 'available' && (
                                                    <span
                                                        className="block mt-1 text-[9px] text-green-700 font-bold"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openAdmitModal(bed.id);
                                                        }}
                                                    >
                                                        + Admit
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="w-full xl:w-80 shrink-0 space-y-4">
                    {(selectedAdmission || selectedBed) && (
                        <Card className="border-none shadow-premium sticky top-4">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Stethoscope size={16} />
                                    {t('adminIpd.viewDetails')}
                                </CardTitle>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedAdmission(null);
                                        setSelectedBed(null);
                                    }}
                                    className="text-secondary-400 hover:text-secondary-600"
                                >
                                    <X size={18} />
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {selectedAdmission ? (
                                    <>
                                        <div className="p-4 rounded-xl bg-rose-50 text-center">
                                            <p className="font-bold text-lg">{selectedAdmission.patient_name}</p>
                                            <p className="text-xs text-secondary-600 mt-1">
                                                {selectedAdmission.ward_name} — Bed {selectedAdmission.bed_number}
                                            </p>
                                            <Badge variant="info" className="mt-2">
                                                {t('adminIpd.days', { count: stayDays(selectedAdmission.admission_date) })}
                                            </Badge>
                                        </div>
                                        <dl className="space-y-2 text-secondary-600">
                                            <div className="flex justify-between">
                                                <dt>{t('adminIpd.phone')}</dt>
                                                <dd>{selectedAdmission.patient_phone || '—'}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('adminIpd.age')}</dt>
                                                <dd>{selectedAdmission.age ?? '—'}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('adminIpd.gender')}</dt>
                                                <dd>{selectedAdmission.gender || '—'}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('adminIpd.blood')}</dt>
                                                <dd>{selectedAdmission.blood_group || '—'}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('adminIpd.doctor')}</dt>
                                                <dd className="font-medium">{selectedAdmission.doctor_name}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('adminIpd.admittedOn')}</dt>
                                                <dd>
                                                    {selectedAdmission.admission_date
                                                        ? new Date(selectedAdmission.admission_date).toLocaleString()
                                                        : '—'}
                                                </dd>
                                            </div>
                                        </dl>
                                        <p className="text-xs text-secondary-500 border-t pt-2">
                                            <span className="font-bold">{t('adminIpd.diagnosis')}:</span>{' '}
                                            {selectedAdmission.diagnosis || '—'}
                                        </p>
                                        <Button className="w-full gap-2 bg-rose-600 hover:bg-rose-700" onClick={() => goDischarge(selectedAdmission.id)}>
                                            <LogOut size={16} />
                                            {t('adminIpd.discharge')}
                                        </Button>
                                    </>
                                ) : selectedBed ? (
                                    <>
                                        <div className="p-4 rounded-xl bg-slate-50 text-center">
                                            <MapPin size={20} className="mx-auto text-rose-500 mb-2" />
                                            <p className="font-mono font-bold">{selectedBed.bed_number}</p>
                                            <p className="text-xs text-secondary-500">{selectedBed.ward_name}</p>
                                            <Badge variant={bedStatusVariant[selectedBed.status]} className="mt-2">
                                                {selectedBed.status}
                                            </Badge>
                                        </div>
                                        {selectedBed.status === 'cleaning' && (
                                            <Button variant="outline" className="w-full gap-2" onClick={() => markBedAvailable(selectedBed.id)}>
                                                <Sparkles size={16} />
                                                {t('adminIpd.markAvailable')}
                                            </Button>
                                        )}
                                        {selectedBed.status === 'available' && (
                                            <Button className="w-full gap-2" onClick={() => openAdmitModal(selectedBed.id)}>
                                                <UserPlus size={16} />
                                                {t('adminIpd.admitPatient')}
                                            </Button>
                                        )}
                                        {selectedBed.patient_name && (
                                            <p className="text-xs text-center text-secondary-600">
                                                {selectedBed.patient_name}
                                            </p>
                                        )}
                                    </>
                                ) : null}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {showAdmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-lg border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('adminIpd.newAdmission')}</CardTitle>
                            <button type="button" onClick={() => setShowAdmit(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={handleAdmit}>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminIpd.selectPatient')}</label>
                                    <select
                                        required
                                        value={admitForm.patient_id}
                                        onChange={(e) => setAdmitForm((f) => ({ ...f, patient_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.phone || p.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminIpd.selectDoctor')}</label>
                                    <select
                                        required
                                        value={admitForm.doctor_id}
                                        onChange={(e) => setAdmitForm((f) => ({ ...f, doctor_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminIpd.selectBed')}</label>
                                    <select
                                        required
                                        value={admitForm.bed_id}
                                        onChange={(e) => setAdmitForm((f) => ({ ...f, bed_id: e.target.value }))}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {availableBeds.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.ward_name} — {b.bed_number} ({bedTypeLabel(b.bed_type)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminIpd.diagnosis')}</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={admitForm.diagnosis}
                                        onChange={(e) => setAdmitForm((f) => ({ ...f, diagnosis: e.target.value }))}
                                        placeholder={t('adminIpd.diagnosisPlaceholder')}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t border-slate-50">
                                <Button type="button" variant="outline" onClick={() => setShowAdmit(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={submitting || !availableBeds.length}>
                                    {submitting ? t('common.loading') : t('adminIpd.confirmAdmit')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default BedManagement;
