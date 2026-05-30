import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { downloadRxDraftPdf } from '../../../utils/pdfExport';
import {
    Plus, Pill, Trash2, Save, Printer, ArrowLeft, Users, Clock,
    Phone, Droplets, RefreshCw, CheckCircle2, FlaskConical, Search,
    Stethoscope, Hourglass, UserCheck, Calendar
} from 'lucide-react';

const DOSAGE_PRESETS = ['1-0-1', '0-0-1', '1-1-1', '1-0-0', 'SOS'];
const MED_PRESETS = [
    { name: 'Paracetamol', dosage: '500mg 1-0-1', duration: '3 days', instructions: 'After food' },
    { name: 'Amoxicillin', dosage: '500mg 1-0-1', duration: '5 days', instructions: 'After food' },
    { name: 'Cetirizine', dosage: '10mg 0-0-1', duration: '5 days', instructions: 'At night' },
    { name: 'Omeprazole', dosage: '20mg 1-0-0', duration: '7 days', instructions: 'Before breakfast' },
];

const emptyMed = () => ({ name: '', dosage: '', duration: '', instructions: '' });

const tokenVariant = (status) => {
    if (status === 'in_consultation') return 'warning';
    if (status === 'completed') return 'success';
    if (status === 'waiting') return 'info';
    return 'secondary';
};

const PrescriptionForm = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [doctorId, setDoctorId] = useState(null);
    const [doctorName, setDoctorName] = useState('');
    const [queue, setQueue] = useState([]);
    const [queueStats, setQueueStats] = useState({ waiting: 0, in_consultation: 0, completed: 0, total: 0 });
    const [loadingQueue, setLoadingQueue] = useState(true);
    const [queueFilter, setQueueFilter] = useState('active');
    const [queueSearch, setQueueSearch] = useState('');

    const [selected, setSelected] = useState(location.state?.patient || null);
    const [diagnosis, setDiagnosis] = useState('');
    const [observations, setObservations] = useState('');
    const [labNotes, setLabNotes] = useState('');
    const [medicines, setMedicines] = useState([emptyMed()]);
    const [labCatalog, setLabCatalog] = useState([]);
    const [selectedLabIds, setSelectedLabIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const loadQueue = useCallback(async (docId) => {
        if (!docId) return;
        try {
            const res = await API.get('/queue/opd', {
                params: { doctor_id: docId, date: new Date().toISOString().slice(0, 10) }
            });
            setQueue(res.data.data?.queue || []);
            setQueueStats(res.data.data?.stats || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingQueue(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const [profileRes, catRes] = await Promise.all([
                    API.get('/profile'),
                    API.get('/lab/catalog')
                ]);
                const doc = profileRes.data.data?.doctor;
                setDoctorId(doc?.id);
                setDoctorName(profileRes.data.data?.user?.name || '');
                setLabCatalog(catRes.data.data || []);
                if (doc?.id) await loadQueue(doc.id);
            } catch (err) {
                console.error(err);
                showToast(t('doctorQueue.loadError'), 'error');
            }
        };
        init();
    }, [loadQueue, t]);

    useEffect(() => {
        if (!doctorId) return undefined;
        const id = setInterval(() => loadQueue(doctorId), 20000);
        return () => clearInterval(id);
    }, [doctorId, loadQueue]);

    useEffect(() => {
        const incoming = location.state?.patient;
        if (incoming?.patient_id || incoming?.token_id) {
            selectPatient(incoming);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    const filteredQueue = useMemo(() => {
        const q = queueSearch.toLowerCase();
        return queue.filter((row) => {
            const matchSearch =
                !q ||
                row.patient_name?.toLowerCase().includes(q) ||
                row.token_number?.toLowerCase().includes(q);
            if (!matchSearch) return false;
            if (queueFilter === 'waiting') return row.token_status === 'waiting';
            if (queueFilter === 'in_consultation') return row.token_status === 'in_consultation';
            if (queueFilter === 'completed') return row.token_status === 'completed';
            if (queueFilter === 'active') return row.token_status !== 'completed';
            return true;
        });
    }, [queue, queueFilter, queueSearch]);

    const updateTokenStatus = async (tokenId, status) => {
        await API.patch('/queue/token-status', { token_id: tokenId, status });
        if (doctorId) await loadQueue(doctorId);
    };

    const selectPatient = async (row) => {
        const patient = {
            patient_id: row.patient_id,
            patient_name: row.patient_name,
            age: row.age,
            gender: row.gender,
            blood_group: row.blood_group,
            patient_phone: row.patient_phone,
            token_number: row.token_number,
            token_id: row.token_id,
            token_status: row.token_status,
            appointment_time: row.appointment_time,
            priority: row.priority,
            department_name: row.department_name
        };
        setSelected(patient);
        setDiagnosis('');
        setObservations('');
        setLabNotes('');
        setMedicines([emptyMed()]);
        setSelectedLabIds([]);
        if (row.token_id && row.token_status === 'waiting') {
            try {
                await updateTokenStatus(row.token_id, 'in_consultation');
                setSelected((p) => ({ ...p, token_status: 'in_consultation' }));
            } catch {
                showToast(t('doctorDash.callFailed'), 'error');
            }
        }
    };

    const addMedicine = () => setMedicines([...medicines, emptyMed()]);
    const removeMedicine = (index) => setMedicines(medicines.filter((_, i) => i !== index));
    const handleMedicineChange = (index, field, value) => {
        const updated = [...medicines];
        updated[index][field] = value;
        setMedicines(updated);
    };

    const applyMedPreset = (preset) => {
        setMedicines((prev) => {
            const empty = prev.length === 1 && !prev[0].name;
            if (empty) return [{ ...preset }];
            return [...prev, { ...preset }];
        });
    };

    const toggleLab = (id) => {
        setSelectedLabIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selected?.patient_id) return;
        if (!diagnosis.trim()) {
            showToast(t('doctorQueue.diagnosisRequired'), 'error');
            return;
        }
        const validMeds = medicines.filter((m) => m.name?.trim());
        if (validMeds.length === 0) {
            showToast(t('doctorQueue.medicineRequired'), 'error');
            return;
        }

        setSubmitting(true);
        try {
            const notes = [
                `Diagnosis: ${diagnosis}`,
                observations && `Observations: ${observations}`,
                labNotes && `Lab notes: ${labNotes}`
            ].filter(Boolean).join('. ');

            await API.post('/doctor/prescription', {
                patient_id: selected.patient_id,
                notes,
                medicines: validMeds
            });

            for (const testId of selectedLabIds) {
                await API.post('/doctor/lab-request', {
                    patient_id: selected.patient_id,
                    test_id: testId
                });
            }

            showToast(t('doctorQueue.saved'));
            setSelected(null);
            setDiagnosis('');
            setObservations('');
            setLabNotes('');
            setMedicines([emptyMed()]);
            setSelectedLabIds([]);
            if (doctorId) await loadQueue(doctorId);
        } catch (err) {
            console.error(err);
            showToast(t('doctorQueue.saveFailed'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const printDraft = () => {
        if (!selected) return;
        downloadRxDraftPdf({
            doctorName,
            patient: selected,
            diagnosis,
            observations,
            medicines,
            labNotes: [
                labNotes,
                ...selectedLabIds.map((id) => labCatalog.find((c) => c.id === id)?.test_name).filter(Boolean)
            ].filter(Boolean).join(', ')
        });
    };

    const initials = (name) =>
        (name || 'P').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/doctor')} className="shrink-0">
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                            <Stethoscope className="text-primary-600" size={26} />
                            {t('doctorQueue.title')}
                        </h2>
                        <p className="text-xs text-secondary-500">{t('doctorQueue.subtitle')}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => doctorId && loadQueue(doctorId)}
                    className="gap-2"
                >
                    <RefreshCw size={16} /> {t('doctorQueue.refresh')}
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* —— Queue panel —— */}
                <div className="xl:col-span-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { key: 'waiting', label: t('doctorQueue.waiting'), value: queueStats.waiting, icon: Hourglass, color: 'text-amber-600 bg-amber-50' },
                            { key: 'in_consultation', label: t('doctorQueue.inConsult'), value: queueStats.in_consultation, icon: UserCheck, color: 'text-violet-600 bg-violet-50' },
                            { key: 'completed', label: t('doctorQueue.done'), value: queueStats.completed, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                        ].map((s) => (
                            <Card key={s.key} className="border-none shadow-premium">
                                <CardContent className="p-3 text-center">
                                    <div className={`inline-flex p-1.5 rounded-lg ${s.color} mb-1`}>
                                        <s.icon size={16} />
                                    </div>
                                    <p className="text-lg font-bold text-secondary-900">{loadingQueue ? '—' : s.value ?? 0}</p>
                                    <p className="text-[9px] font-bold uppercase text-secondary-500">{s.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-none shadow-premium flex flex-col max-h-[calc(100vh-220px)]">
                        <CardHeader className="py-3 border-b border-slate-50 shrink-0 space-y-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Users size={16} className="text-primary-600" />
                                {t('doctorQueue.liveQueue')}
                            </CardTitle>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                                <input
                                    type="text"
                                    value={queueSearch}
                                    onChange={(e) => setQueueSearch(e.target.value)}
                                    placeholder={t('doctorDash.searchPlaceholder')}
                                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-100"
                                />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {['active', 'waiting', 'in_consultation', 'completed', 'all'].map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setQueueFilter(f)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize ${
                                            queueFilter === f ? 'bg-primary-600 text-white' : 'bg-slate-100 text-secondary-600'
                                        }`}
                                    >
                                        {t(`doctorQueue.filter.${f}`)}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto flex-1">
                            {loadingQueue ? (
                                <p className="p-6 text-center text-xs text-secondary-400 animate-pulse">{t('doctorQueue.loading')}</p>
                            ) : filteredQueue.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Users size={32} className="mx-auto text-secondary-300 mb-2" />
                                    <p className="text-xs font-semibold text-secondary-500">{t('doctorQueue.empty')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredQueue.map((row) => {
                                        const isActive =
                                            selected?.token_id === row.token_id ||
                                            (selected?.patient_id === row.patient_id && !row.token_id);
                                        return (
                                            <button
                                                key={row.token_id || row.appointment_id}
                                                type="button"
                                                onClick={() => selectPatient(row)}
                                                className={`w-full text-left p-3 transition-all ${
                                                    isActive
                                                        ? 'bg-primary-50 border-l-4 border-l-primary-600'
                                                        : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex gap-2 min-w-0">
                                                        <span className="font-bold text-sm text-primary-800 shrink-0">
                                                            {row.token_number}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-secondary-900 truncate">
                                                                {row.patient_name}
                                                            </p>
                                                            <p className="text-[10px] text-secondary-500">
                                                                {row.age} {t('doctorDash.yrs')} · {row.gender}
                                                                {row.appointment_time ? ` · ${row.appointment_time.slice(0, 5)}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={tokenVariant(row.token_status)} className="shrink-0 text-[9px]">
                                                        {(row.token_status || '').replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                {row.priority === 'emergency' && (
                                                    <Badge variant="danger" className="mt-1 text-[9px]">{t('doctorDash.emergency')}</Badge>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* —— Consultation / Rx —— */}
                <div className="xl:col-span-8">
                    {!selected ? (
                        <Card className="border-none shadow-premium min-h-[400px] flex items-center justify-center">
                            <CardContent className="text-center p-10">
                                <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                                    <Stethoscope size={36} className="text-primary-600" />
                                </div>
                                <h3 className="text-lg font-bold text-secondary-900">{t('doctorQueue.selectPatient')}</h3>
                                <p className="text-sm text-secondary-500 mt-2 max-w-sm mx-auto">{t('doctorQueue.selectHint')}</p>
                                <Button onClick={() => navigate('/doctor/appointments')} variant="outline" className="mt-6">
                                    <Calendar className="mr-2" size={16} />
                                    {t('doctorAppts.title')}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <Card className="border-none shadow-premium">
                                <CardHeader className="border-b border-slate-50 bg-gradient-to-r from-primary-50/80 to-white">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-bold">
                                                {initials(selected.patient_name)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{selected.patient_name}</CardTitle>
                                                <p className="text-xs text-secondary-500 flex flex-wrap items-center gap-2 mt-0.5">
                                                    <span>{selected.age} {t('doctorDash.yrs')} · {selected.gender}</span>
                                                    {selected.blood_group && (
                                                        <span className="flex items-center gap-0.5 text-red-600 font-semibold">
                                                            <Droplets size={12} /> {selected.blood_group}
                                                        </span>
                                                    )}
                                                    {selected.patient_phone && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Phone size={12} /> {selected.patient_phone}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-2xl font-bold text-primary-700">{selected.token_number}</p>
                                            <div className="flex flex-wrap gap-1 mt-1 sm:justify-end">
                                                <Badge variant={tokenVariant(selected.token_status)}>
                                                    {(selected.token_status || '').replace('_', ' ')}
                                                </Badge>
                                                {selected.priority === 'emergency' && (
                                                    <Badge variant="danger">{t('doctorDash.emergency')}</Badge>
                                                )}
                                            </div>
                                            {selected.appointment_time && (
                                                <p className="text-[10px] text-secondary-500 mt-1 flex items-center gap-1 sm:justify-end">
                                                    <Clock size={11} /> {selected.appointment_time.slice(0, 5)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {selected.token_id && selected.token_status !== 'completed' && (
                                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-primary-100">
                                            {selected.token_status === 'in_consultation' && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateTokenStatus(selected.token_id, 'waiting')}
                                                >
                                                    {t('doctorQueue.backToWaiting')}
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="text-green-700 border-green-200"
                                                onClick={async () => {
                                                    try {
                                                        await updateTokenStatus(selected.token_id, 'completed');
                                                        showToast(t('doctorQueue.markedDone'));
                                                        setSelected(null);
                                                    } catch {
                                                        showToast(t('doctorQueue.saveFailed'), 'error');
                                                    }
                                                }}
                                            >
                                                <CheckCircle2 size={14} className="mr-1" />
                                                {t('doctorQueue.completeVisit')}
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">
                                                {t('doctorQueue.diagnosis')} *
                                            </label>
                                            <Input
                                                placeholder={t('doctorQueue.diagnosisPh')}
                                                value={diagnosis}
                                                onChange={(e) => setDiagnosis(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">
                                                {t('doctorQueue.observations')}
                                            </label>
                                            <Input
                                                placeholder={t('doctorQueue.observationsPh')}
                                                value={observations}
                                                onChange={(e) => setObservations(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                                            <h3 className="text-sm font-bold flex items-center gap-2">
                                                <Pill size={16} className="text-primary-600" />
                                                {t('doctorQueue.medicines')}
                                            </h3>
                                            <Button type="button" variant="ghost" size="sm" onClick={addMedicine} className="text-primary-600 h-8">
                                                <Plus size={16} /> {t('doctorQueue.addMed')}
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {MED_PRESETS.map((p) => (
                                                <button
                                                    key={p.name}
                                                    type="button"
                                                    onClick={() => applyMedPreset(p)}
                                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-primary-50 text-[10px] font-bold text-secondary-700"
                                                >
                                                    + {p.name}
                                                </button>
                                            ))}
                                        </div>
                                        {medicines.map((med, index) => (
                                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 mb-2 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="md:col-span-3">
                                                    <label className="text-[10px] font-bold text-secondary-400 uppercase block mb-1">{t('doctorQueue.medName')}</label>
                                                    <Input value={med.name} onChange={(e) => handleMedicineChange(index, 'name', e.target.value)} placeholder="Paracetamol" />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-[10px] font-bold text-secondary-400 uppercase block mb-1">{t('doctorQueue.dosage')}</label>
                                                    <Input value={med.dosage} onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)} placeholder="500mg 1-0-1" />
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {DOSAGE_PRESETS.map((d) => (
                                                            <button
                                                                key={d}
                                                                type="button"
                                                                onClick={() => handleMedicineChange(index, 'dosage', med.dosage ? `${med.dosage.split(' ')[0]} ${d}` : d)}
                                                                className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-secondary-600"
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] font-bold text-secondary-400 uppercase block mb-1">{t('doctorQueue.duration')}</label>
                                                    <Input value={med.duration} onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)} placeholder="5 days" />
                                                </div>
                                                <div className="md:col-span-3 flex gap-1">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-secondary-400 uppercase block mb-1">{t('doctorQueue.instructions')}</label>
                                                        <Input value={med.instructions} onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)} placeholder="After meal" />
                                                    </div>
                                                    {medicines.length > 1 && (
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMedicine(index)} className="text-red-500 shrink-0 mb-0.5">
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-secondary-500 uppercase mb-2 flex items-center gap-1">
                                                <FlaskConical size={14} /> {t('doctorQueue.labCatalog')}
                                            </label>
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50">
                                                {labCatalog.length === 0 ? (
                                                    <p className="text-xs text-secondary-400">{t('doctorQueue.noLabTests')}</p>
                                                ) : (
                                                    labCatalog.map((test) => (
                                                        <label key={test.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded-lg">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLabIds.includes(test.id)}
                                                                onChange={() => toggleLab(test.id)}
                                                                className="rounded border-slate-300 text-primary-600"
                                                            />
                                                            <span className="font-medium flex-1">{test.test_name}</span>
                                                            <span className="text-secondary-400">₹{test.price}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">{t('doctorQueue.labNotes')}</label>
                                            <textarea
                                                value={labNotes}
                                                onChange={(e) => setLabNotes(e.target.value)}
                                                placeholder={t('doctorQueue.labNotesPh')}
                                                className="w-full h-[148px] rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-slate-50">
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                                            {t('common.cancel')}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={printDraft} className="gap-2">
                                            <Printer size={16} /> {t('doctorQueue.printDraft')}
                                        </Button>
                                    </div>
                                    <Button type="submit" disabled={submitting} className="gap-2 shadow-soft">
                                        <Save size={18} />
                                        {submitting ? t('doctorQueue.saving') : t('doctorQueue.finalize')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrescriptionForm;
