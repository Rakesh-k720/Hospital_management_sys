import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import Badge from '../../ui/Badge';

const ProfilePage = ({ role }) => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        age: '',
        gender: 'other',
        blood_group: '',
        address: '',
        emergency_contact: '',
        specialization: '',
        department_name: '',
        experience_years: '',
        room_number: '',
        consultation_fee: '',
        current_password: '',
        new_password: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('overview');
    const [doctorStats, setDoctorStats] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loadError, setLoadError] = useState('');

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const scheduleByDay = useMemo(() => {
        const map = new Map();
        for (const s of schedule || []) {
            const key = Number(s.day_of_week);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(s);
        }
        return map;
    }, [schedule]);

    useEffect(() => {
        const load = async () => {
            try {
                setLoadError('');
                const res = await API.get('/profile');
                const { user, patient, doctor } = res.data.data;
                setForm({
                    name: user.name || '',
                    phone: user.phone || '',
                    email: user.email || '',
                    age: patient?.age ?? '',
                    gender: patient?.gender || 'other',
                    blood_group: patient?.blood_group || '',
                    address: patient?.address || '',
                    emergency_contact: patient?.emergency_contact || '',
                    specialization: doctor?.specialization || '',
                    department_name: doctor?.department_name || '',
                    experience_years: doctor?.experience_years ?? '',
                    room_number: doctor?.room_number || '',
                    consultation_fee: doctor?.consultation_fee || '',
                    current_password: '',
                    new_password: ''
                });

                if (role === 'doctor' && doctor?.id) {
                    const [statsRes, schedRes] = await Promise.all([
                        API.get('/doctor/dashboard'),
                        API.get(`/schedules/${doctor.id}`)
                    ]);
                    setDoctorStats(statsRes.data.data || null);
                    setSchedule(schedRes.data.data || []);
                }
            } catch (err) {
                console.error(err);
                setLoadError(err.response?.data?.message || 'Could not load profile');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [role]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.put('/profile', form);
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && form.name) {
                user.name = form.name;
                localStorage.setItem('user', JSON.stringify(user));
            }
            showToast('Profile updated');
        } catch (err) {
            showToast(err.response?.data?.message || 'Update failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-secondary-400">Loading profile...</p>;
    if (loadError) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <Card className="border-none shadow-premium">
                    <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-secondary-600">{loadError}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" type="button" onClick={() => window.location.reload()}>
                                Reload
                            </Button>
                            <Button type="button" onClick={() => navigate('/login')}>
                                Go to login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {role === 'doctor' ? (
                <Card className="border-none shadow-premium bg-gradient-to-br from-slate-900 via-primary-900 to-primary-700 text-white">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
                            {(form.name || 'D')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold font-['Outfit']">Dr. {form.name}</h2>
                            <p className="text-primary-100 text-sm mt-1">
                                {form.specialization || 'Medical Specialist'}
                                {form.department_name ? ` · ${form.department_name}` : ''}
                                {form.room_number ? ` · Room ${form.room_number}` : ''}
                            </p>
                            <p className="text-primary-200 text-xs mt-1">
                                {form.consultation_fee ? `OPD Fee: ₹${form.consultation_fee}` : ''}
                                {form.experience_years ? ` · ${form.experience_years} yrs experience` : ''}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <h2 className="text-2xl font-bold text-secondary-900">My Profile</h2>
            )}

            {role === 'doctor' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Today's appointments", value: doctorStats?.todayAppointments ?? 0 },
                        { label: 'Waiting queue', value: doctorStats?.waitingQueue ?? 0 },
                        { label: 'Pending labs', value: doctorStats?.pendingReports ?? 0 },
                        { label: 'IPD admitted', value: doctorStats?.ipdAdmitted ?? 0 },
                    ].map((s) => (
                        <Card key={s.label} className="border-none shadow-premium">
                            <CardContent className="p-4">
                                <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                                <p className="text-2xl font-bold text-secondary-900 font-['Outfit']">{s.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {role === 'doctor' && (
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
                    {[
                        { key: 'overview', label: 'Overview' },
                        { key: 'edit', label: 'Edit profile' },
                        { key: 'schedule', label: 'My schedule' },
                        { key: 'security', label: 'Security' }
                    ].map((x) => (
                        <button
                            key={x.key}
                            type="button"
                            onClick={() => setTab(x.key)}
                            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition ${tab === x.key ? 'bg-primary-600 text-white' : 'text-secondary-500 hover:bg-slate-100'}`}
                        >
                            {x.label}
                        </button>
                    ))}
                </div>
            )}

            {role === 'doctor' && tab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-none shadow-premium">
                        <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                            <Button type="button" onClick={() => navigate('/doctor/queue')}>Open OPD queue</Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/doctor/appointments')}>Appointments</Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/doctor/labs')}>Labs</Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/doctor/ipd')}>IPD</Button>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-premium">
                        <CardHeader><CardTitle>Practice details</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-secondary-500">Department:</span> <span className="font-semibold text-secondary-900">{form.department_name || '—'}</span></p>
                            <p><span className="text-secondary-500">Room:</span> <span className="font-semibold text-secondary-900">{form.room_number || '—'}</span></p>
                            <p><span className="text-secondary-500">OPD fee:</span> <span className="font-semibold text-secondary-900">{form.consultation_fee ? `₹${form.consultation_fee}` : '—'}</span></p>
                            <p><span className="text-secondary-500">Experience:</span> <span className="font-semibold text-secondary-900">{form.experience_years ? `${form.experience_years} yrs` : '—'}</span></p>
                        </CardContent>
                    </Card>
                </div>
            )}
            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {role === 'doctor' && tab !== 'edit' && (
                            <p className="text-xs text-secondary-500">
                                Tip: switch to <b>Edit profile</b> tab to update details.
                            </p>
                        )}
                        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <p className="text-xs text-secondary-500">Email: {form.email}</p>
                        {role === 'patient' && (
                            <>
                                <Input label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                                <select className="w-full border rounded-lg h-10 px-3 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                <Input label="Blood Group" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
                                <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                                <Input label="Emergency Contact" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                            </>
                        )}
                        {role === 'doctor' && (
                            <>
                                <Input label="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                                <Input label="Department" value={form.department_name} disabled />
                                <Input label="Years of Experience" type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
                                <Input label="Room Number" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
                                <Input label="Consultation Fee (₹)" type="number" value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} />
                            </>
                        )}
                        <hr />
                        <Input label="Current Password" type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
                        <Input label="New Password" type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                    </CardFooter>
                </Card>
            </form>

            {role === 'doctor' && tab === 'schedule' && (
                <Card className="border-none shadow-premium">
                    <CardHeader>
                        <CardTitle>Weekly schedule (view only)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 7 }).map((_, idx) => {
                            const slots = scheduleByDay.get(idx) || [];
                            return (
                                <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                                    <div className="font-bold text-secondary-900 w-14">{dayLabels[idx]}</div>
                                    <div className="flex-1 text-sm text-secondary-700">
                                        {slots.length === 0 ? (
                                            <span className="text-secondary-400">No slots</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {slots.map((s) => (
                                                    <Badge key={s.id} variant={s.is_available ? 'success' : 'secondary'}>
                                                        {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-secondary-400">{slots.length} slot(s)</div>
                                </div>
                            );
                        })}
                        <p className="text-xs text-secondary-500">
                            Schedule editing is admin-only right now. If you want, I can add a request workflow.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ProfilePage;
