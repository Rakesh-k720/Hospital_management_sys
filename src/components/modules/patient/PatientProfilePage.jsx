import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Phone, Mail, Droplets, MapPin, Shield, Calendar, CreditCard,
    FileText, Pill, Ticket, Download, Copy, Check, Activity, ClipboardList,
    AlertCircle, Heart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { downloadPatientHealthCard } from '../../../utils/pdfExport';

const TABS = ['overview', 'edit', 'records', 'security'];

const PatientProfilePage = () => {
    const { t } = useTranslation();
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [bills, setBills] = useState([]);
    const [reports, setReports] = useState([]);
    const [form, setForm] = useState({
        name: '', phone: '', email: '', age: '', gender: 'other',
        blood_group: '', address: '', emergency_contact: '',
        allergies: '', medical_notes: '',
        current_password: '', new_password: ''
    });
    const [patientMeta, setPatientMeta] = useState(null);
    const [userMeta, setUserMeta] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [profileRes, dashRes, apptRes, prescRes, billRes, reportRes] = await Promise.all([
                    API.get('/profile'),
                    API.get('/patient/dashboard'),
                    API.get('/patient/appointments'),
                    API.get('/patient/prescriptions'),
                    API.get('/patient/bills'),
                    API.get('/lab/my-reports')
                ]);
                const { user, patient } = profileRes.data.data;
                setUserMeta(user);
                setPatientMeta(patient);
                setStats(dashRes.data.data);
                setAppointments(apptRes.data.data || []);
                setPrescriptions(prescRes.data.data || []);
                setBills(billRes.data.data || []);
                setReports(reportRes.data.data || []);
                setForm({
                    name: user.name || '',
                    phone: user.phone || '',
                    email: user.email || '',
                    age: patient?.age ?? '',
                    gender: patient?.gender || 'other',
                    blood_group: patient?.blood_group || '',
                    address: patient?.address || '',
                    emergency_contact: patient?.emergency_contact || '',
                    allergies: patient?.allergies || '',
                    medical_notes: patient?.medical_notes || '',
                    current_password: '',
                    new_password: ''
                });
            } catch (err) {
                console.error(err);
                showToast(t('profile.loadError'), 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [t]);

    const patientIdLabel = patientMeta?.id
        ? `P-${String(patientMeta.id).padStart(4, '0')}`
        : '—';

    const pendingBills = useMemo(
        () => bills.filter((b) => b.payment_status !== 'paid'),
        [bills]
    );

    const recentAppointments = appointments.slice(0, 5);
    const recentPrescriptions = prescriptions.slice(0, 3);

    const initials = (form.name || 'P')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.put('/profile', form);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user && form.name) {
                user.name = form.name;
                localStorage.setItem('user', JSON.stringify(user));
            }
            showToast(t('profile.saved'));
        } catch (err) {
            showToast(err.response?.data?.message || t('profile.saveError'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyPatientId = () => {
        navigator.clipboard.writeText(patientIdLabel);
        setCopied(true);
        showToast(t('profile.idCopied'));
        setTimeout(() => setCopied(false), 2000);
    };

    const statusColor = (status) => {
        if (status === 'completed') return 'success';
        if (status === 'cancelled') return 'danger';
        if (status === 'pending') return 'warning';
        return 'secondary';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <p className="text-secondary-400 animate-pulse">{t('profile.loading')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <Card className="border-none shadow-premium overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 text-white">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl md:text-3xl font-bold font-['Outfit']">{form.name}</h2>
                            <p className="text-primary-100 text-sm mt-1 flex items-center gap-2 flex-wrap">
                                <Mail size={14} /> {form.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                                    {t('profile.patientId')}: {patientIdLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={copyPatientId}
                                    className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/25 px-2 py-1 rounded-full text-xs"
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                    {copied ? t('profile.copied') : t('profile.copyId')}
                                </button>
                                {form.blood_group && (
                                    <span className="bg-red-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                        <Droplets size={12} /> {form.blood_group}
                                    </span>
                                )}
                            </div>
                            {userMeta?.created_at && (
                                <p className="text-primary-200 text-xs mt-2">
                                    {t('profile.memberSince')}{' '}
                                    {new Date(userMeta.created_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-white/40 text-white hover:bg-white/10"
                                onClick={() => downloadPatientHealthCard({ user: userMeta, patient: patientMeta })}
                            >
                                <Download size={16} className="mr-2" />
                                {t('profile.downloadCard')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('profile.statUpcoming'), value: stats?.upcomingAppointments ?? 0, icon: Calendar, color: 'text-primary-600 bg-primary-50' },
                    { label: t('profile.statVisits'), value: stats?.totalVisits ?? 0, icon: Activity, color: 'text-amber-600 bg-amber-50' },
                    { label: t('profile.statBills'), value: stats?.pendingBills ?? 0, icon: CreditCard, color: 'text-red-600 bg-red-50' },
                    { label: t('profile.statReports'), value: reports.length, icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${s.color}`}>
                                <s.icon size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-secondary-900">{s.value}</p>
                                <p className="text-xs text-secondary-500">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                    { to: '/patient/book', label: t('nav.bookAppointment'), icon: Calendar },
                    { to: '/patient/token', label: t('nav.opdToken'), icon: Ticket },
                    { to: '/patient/prescriptions', label: t('nav.prescriptions'), icon: Pill },
                    { to: '/patient/billing', label: t('nav.bills'), icon: CreditCard },
                ].map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white shadow-premium border border-slate-100 hover:border-primary-200 hover:bg-primary-50/50 transition text-center"
                    >
                        <link.icon size={22} className="text-primary-600" />
                        <span className="text-xs font-semibold text-secondary-700">{link.label}</span>
                    </Link>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
                {TABS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition ${
                            tab === key
                                ? 'bg-primary-600 text-white'
                                : 'text-secondary-500 hover:bg-slate-100'
                        }`}
                    >
                        {t(`profile.tab.${key}`)}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Heart size={18} className="text-red-500" />
                                {t('profile.healthSummary')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-secondary-500">{t('profile.ageGender')}</span>
                                <span className="font-medium">{form.age || '—'} / {form.gender}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-500">{t('profile.bloodGroup')}</span>
                                <span className="font-medium">{form.blood_group || '—'}</span>
                            </div>
                            <div>
                                <span className="text-secondary-500 block mb-1">{t('profile.allergies')}</span>
                                <p className="font-medium text-secondary-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
                                    {form.allergies || t('profile.noneRecorded')}
                                </p>
                            </div>
                            <div>
                                <span className="text-secondary-500 block mb-1">{t('profile.medicalNotes')}</span>
                                <p className="text-secondary-700 bg-slate-50 rounded-lg p-2 text-xs leading-relaxed">
                                    {form.medical_notes || t('profile.noneRecorded')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertCircle size={18} className="text-orange-500" />
                                {t('profile.emergency')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="flex items-center gap-2 text-lg font-semibold text-secondary-900">
                                <Phone size={18} className="text-primary-600" />
                                {form.emergency_contact || t('profile.emergencyNotSet')}
                            </p>
                            <p className="flex items-start gap-2 text-sm text-secondary-600">
                                <MapPin size={16} className="shrink-0 mt-0.5" />
                                {form.address || t('profile.addressNotSet')}
                            </p>
                            {pendingBills.length > 0 && (
                                <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-sm font-semibold text-red-700">
                                        {t('profile.pendingBillsAlert', { count: pendingBills.length })}
                                    </p>
                                    <Link to="/patient/billing" className="text-xs text-red-600 underline mt-1 inline-block">
                                        {t('profile.payBills')}
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === 'edit' && (
                <form onSubmit={handleSave}>
                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle>{t('profile.editTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <Input label={t('profile.fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            <Input label={t('profile.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            <p className="md:col-span-2 text-xs text-secondary-500 flex items-center gap-1">
                                <Mail size={12} /> {t('profile.emailReadonly')}: {form.email}
                            </p>
                            <Input label={t('profile.age')} type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                            <div>
                                <label className="text-xs font-semibold text-secondary-600 mb-1 block">{t('profile.gender')}</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg h-10 px-3 text-sm"
                                    value={form.gender}
                                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                >
                                    <option value="male">{t('profile.male')}</option>
                                    <option value="female">{t('profile.female')}</option>
                                    <option value="other">{t('profile.other')}</option>
                                </select>
                            </div>
                            <Input label={t('profile.bloodGroup')} value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="e.g. B+" />
                            <Input label={t('profile.emergencyContact')} value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                            <Input label={t('profile.address')} className="md:col-span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-secondary-600 mb-1 block">{t('profile.allergies')}</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[72px]"
                                    value={form.allergies}
                                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                                    placeholder={t('profile.allergiesPlaceholder')}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-secondary-600 mb-1 block">{t('profile.medicalNotes')}</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[88px]"
                                    value={form.medical_notes}
                                    onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
                                    placeholder={t('profile.notesPlaceholder')}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={saving}>
                                {saving ? t('profile.saving') : t('profile.save')}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            )}

            {tab === 'records' && (
                <div className="space-y-4">
                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ClipboardList size={18} />
                                {t('profile.recentAppointments')}
                            </CardTitle>
                            <Link to="/patient/book" className="text-xs text-primary-600 font-semibold">{t('profile.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {recentAppointments.length === 0 ? (
                                <p className="text-sm text-secondary-400">{t('profile.noAppointments')}</p>
                            ) : (
                                recentAppointments.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div>
                                            <p className="font-semibold text-sm text-secondary-900">Dr. {a.doctor_name}</p>
                                            <p className="text-xs text-secondary-500">
                                                {new Date(a.appointment_date).toLocaleDateString()} · {a.appointment_time?.slice(0, 5)}
                                            </p>
                                        </div>
                                        <Badge variant={statusColor(a.status)}>{a.status}</Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Pill size={18} />
                                {t('profile.recentPrescriptions')}
                            </CardTitle>
                            <Link to="/patient/prescriptions" className="text-xs text-primary-600 font-semibold">{t('profile.viewAll')}</Link>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {recentPrescriptions.length === 0 ? (
                                <p className="text-sm text-secondary-400">{t('profile.noPrescriptions')}</p>
                            ) : (
                                recentPrescriptions.map((p) => (
                                    <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="font-semibold text-sm">Dr. {p.doctor_name}</p>
                                        <p className="text-xs text-secondary-500 mt-1">
                                            {new Date(p.created_at).toLocaleDateString()} · {(p.medicines?.length || 0)} {t('profile.medicines')}
                                        </p>
                                        {p.diagnosis && (
                                            <p className="text-xs text-secondary-600 mt-1 line-clamp-2">{p.diagnosis}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText size={18} />
                                {t('profile.labReports')}
                            </CardTitle>
                            <Link to="/patient/reports" className="text-xs text-primary-600 font-semibold">{t('profile.viewAll')}</Link>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-secondary-600">
                                {reports.length} {t('profile.reportsAvailable')}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === 'security' && (
                <form onSubmit={handleSave}>
                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield size={18} />
                                {t('profile.securityTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-md">
                            <p className="text-sm text-secondary-500">{t('profile.passwordHint')}</p>
                            <Input
                                label={t('profile.currentPassword')}
                                type="password"
                                value={form.current_password}
                                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                            />
                            <Input
                                label={t('profile.newPassword')}
                                type="password"
                                value={form.new_password}
                                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={saving}>
                                {saving ? t('profile.saving') : t('profile.updatePassword')}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            )}
        </div>
    );
};

export default PatientProfilePage;
