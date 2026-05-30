import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    BedDouble,
    Calendar,
    Clock,
    FileText,
    FlaskConical,
    MapPin,
    Search,
    Stethoscope,
    UserRound,
    X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';

const DoctorIpd = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [ward, setWard] = useState('all');
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await API.get('/doctor/ipd');
                setAdmissions(res.data.data || []);
            } catch (err) {
                console.error(err);
                showToast(t('doctorIpd.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [t]);

    const wards = useMemo(() => {
        const uniq = new Set((admissions || []).map((a) => a.ward_name).filter(Boolean));
        return ['all', ...Array.from(uniq)];
    }, [admissions]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return (admissions || []).filter((a) => {
            const matchWard = ward === 'all' || a.ward_name === ward;
            const matchSearch =
                !q ||
                a.patient_name?.toLowerCase().includes(q) ||
                (a.diagnosis || '').toLowerCase().includes(q) ||
                (a.ward_name || '').toLowerCase().includes(q) ||
                String(a.bed_number || '').toLowerCase().includes(q);
            return matchWard && matchSearch;
        });
    }, [admissions, search, ward]);

    const stats = useMemo(() => {
        const total = admissions.length;
        const since7 = admissions.filter((a) => {
            const d = a.admission_date ? new Date(a.admission_date).getTime() : 0;
            const days = (Date.now() - d) / (1000 * 60 * 60 * 24);
            return d && days <= 7;
        }).length;
        const wardCount = new Set(admissions.map((a) => a.ward_name).filter(Boolean)).size;
        return { total, since7, wardCount };
    }, [admissions]);

    const openQueue = (a) => {
        navigate('/doctor/queue', {
            state: {
                patient: {
                    patient_id: a.patient_id,
                    patient_name: a.patient_name
                }
            }
        });
    };

    const openLabs = (a) => {
        navigate('/doctor/labs', { state: { patient_id: a.patient_id, patient_name: a.patient_name } });
    };

    const stayDays = (date) => {
        if (!date) return '—';
        const days = Math.max(0, Math.ceil((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)));
        return `${days}d`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <BedDouble className="text-rose-600" size={28} />
                        {t('doctorIpd.title')}
                    </h2>
                    <p className="text-sm text-secondary-500 mt-1">{t('doctorIpd.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/doctor')}>
                        {t('doctorIpd.backToDashboard')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('doctorIpd.statAdmitted'), value: stats.total, icon: BedDouble, tone: 'from-rose-500 to-red-700' },
                    { label: t('doctorIpd.statWards'), value: stats.wardCount, icon: MapPin, tone: 'from-sky-500 to-blue-700' },
                    { label: t('doctorIpd.statNew'), value: stats.since7, icon: Calendar, tone: 'from-emerald-500 to-green-700' },
                    { label: t('doctorIpd.statVisible'), value: filtered.length, icon: UserRound, tone: 'from-slate-600 to-slate-800' },
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium overflow-hidden">
                        <CardContent className={`p-4 bg-gradient-to-br ${s.tone} text-white`}>
                            <div className="flex items-center justify-between">
                                <s.icon size={22} className="opacity-90" />
                                <span className="text-2xl font-bold font-['Outfit']">{loading ? '—' : s.value}</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase mt-2 opacity-90">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-premium">
                <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('doctorIpd.searchPh')}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30"
                        />
                    </div>
                    <select
                        className="border border-slate-200 rounded-xl h-10 px-3 text-sm"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                    >
                        {wards.map((w) => (
                            <option key={w} value={w}>
                                {w === 'all' ? t('doctorIpd.allWards') : w}
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            <Card className="border-none shadow-premium overflow-x-auto">
                <CardHeader className="border-b border-slate-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock size={18} className="text-rose-600" />
                        {t('doctorIpd.tableTitle')}
                        <span className="text-sm font-normal text-secondary-400">({filtered.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="p-8 text-center text-secondary-400 animate-pulse">{t('doctorIpd.loading')}</p>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <BedDouble size={40} className="mx-auto text-secondary-300 mb-3" />
                            <p className="font-semibold text-secondary-600">{t('doctorIpd.empty')}</p>
                            <p className="text-xs text-secondary-400 mt-1">{t('doctorIpd.emptyHint')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('doctorIpd.colPatient')}</TableHead>
                                    <TableHead>{t('doctorIpd.colWardBed')}</TableHead>
                                    <TableHead>{t('doctorIpd.colAdmitted')}</TableHead>
                                    <TableHead>{t('doctorIpd.colStay')}</TableHead>
                                    <TableHead>{t('doctorIpd.colDiagnosis')}</TableHead>
                                    <TableHead>{t('doctorIpd.colStatus')}</TableHead>
                                    <TableHead className="text-right">{t('doctorIpd.colAction')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((a) => (
                                    <TableRow key={a.id} className="hover:bg-slate-50/80">
                                        <TableCell className="font-bold">{a.patient_name}</TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-secondary-800">{a.ward_name}</span>
                                            <span className="text-secondary-400"> · </span>
                                            {t('doctorIpd.bed')} {a.bed_number}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {a.admission_date ? new Date(a.admission_date).toLocaleDateString() : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[10px]">{stayDays(a.admission_date)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm max-w-xs truncate">{a.diagnosis || '—'}</TableCell>
                                        <TableCell><Badge variant="success">{a.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" onClick={() => openQueue(a)} className="text-xs h-8">
                                                    <Stethoscope size={14} className="mr-1" /> Rx
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openLabs(a)} className="text-xs h-8">
                                                    <FlaskConical size={14} className="mr-1" /> Lab
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setSelected(a)} className="h-8 px-2">
                                                    <FileText size={14} />
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
                <div className="fixed inset-0 z-50 flex justify-end">
                    <button
                        type="button"
                        className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm"
                        onClick={() => setSelected(null)}
                        aria-label="Close"
                    />
                    <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-br from-rose-600 to-red-700 text-white p-6">
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20"
                            >
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold">{selected.patient_name}</h3>
                            <p className="text-rose-100 text-sm mt-1">
                                {selected.ward_name} · {t('doctorIpd.bed')} {selected.bed_number}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 text-center">
                                    <p className="text-lg font-bold text-secondary-900">{stayDays(selected.admission_date)}</p>
                                    <p className="text-[10px] uppercase font-bold text-secondary-500">{t('doctorIpd.lengthOfStay')}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 text-center">
                                    <p className="text-lg font-bold text-secondary-900">
                                        {selected.admission_date ? new Date(selected.admission_date).toLocaleDateString() : '—'}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold text-secondary-500">{t('doctorIpd.admittedOn')}</p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50">
                                <p className="text-xs font-bold text-secondary-600 uppercase">{t('doctorIpd.diagnosis')}</p>
                                <p className="text-sm text-secondary-700 mt-1">{selected.diagnosis || '—'}</p>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
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

export default DoctorIpd;
