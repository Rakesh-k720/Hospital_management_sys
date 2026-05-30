import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { Plus, Search, Trash2, X, Stethoscope, Users, RefreshCw } from 'lucide-react';

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    password: '',
    department_id: '',
    specialization: '',
    experience_years: '',
    room_number: '',
    consultation_fee: ''
};

const DoctorManagement = () => {
    const [doctorsList, setDoctorsList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyForm);

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const [docRes, deptRes] = await Promise.all([
                API.get('/admin/doctors'),
                API.get('/admin/departments')
            ]);
            setDoctorsList(docRes.data.data || []);
            const depts = deptRes.data.data || [];
            setDepartments(depts);
            if (depts.length && !formData.department_id) {
                setFormData((f) => ({ ...f, department_id: String(depts[0].id) }));
            }
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
            showToast(err.response?.data?.message || 'Failed to load doctors', 'error');
            setDoctorsList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async (userId) => {
        if (!window.confirm('Remove this doctor and their login account permanently?')) return;
        try {
            await API.delete(`/admin/users/${userId}`);
            showToast('Doctor removed');
            fetchDoctors();
        } catch (err) {
            showToast(err.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post('/admin/doctors', {
                ...formData,
                department_id: parseInt(formData.department_id, 10) || 1,
                experience_years: parseInt(formData.experience_years, 10) || 0,
                consultation_fee: parseFloat(formData.consultation_fee) || 500
            });
            showToast('Doctor registered successfully');
            setModalOpen(false);
            setFormData({
                ...emptyForm,
                department_id: departments[0] ? String(departments[0].id) : ''
            });
            fetchDoctors();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add doctor', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDoctors = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return (doctorsList || []).filter((doc) =>
            (doc.name || '').toLowerCase().includes(query) ||
            (doc.specialization || '').toLowerCase().includes(query) ||
            (doc.email || '').toLowerCase().includes(query)
        );
    }, [doctorsList, searchQuery]);

    const stats = useMemo(() => ({
        total: doctorsList.length,
        avgFee: doctorsList.length
            ? Math.round(
                  doctorsList.reduce((s, d) => s + Number(d.consultation_fee || 0), 0) / doctorsList.length
              )
            : 0,
        withRoom: doctorsList.filter((d) => d.room_number).length
    }), [doctorsList]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Stethoscope className="text-primary-600" size={28} />
                        Doctors Management
                    </h2>
                    <p className="text-sm text-secondary-500">Register and manage hospital medical staff</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchDoctors} className="gap-2">
                        <RefreshCw size={16} /> Refresh
                    </Button>
                    <Button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 shadow-soft"
                    >
                        <Plus size={18} />
                        Add Doctor
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total doctors', value: stats.total, icon: Users },
                    { label: 'With OPD room', value: stats.withRoom, icon: Stethoscope },
                    { label: 'Avg consultation fee', value: `₹${stats.avgFee}`, icon: Plus },
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                                <s.icon size={18} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-secondary-900">{loading ? '—' : s.value}</p>
                                <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-premium bg-white">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, specialty or email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30"
                        />
                    </div>
                    <Badge variant="secondary">{filteredDoctors.length} shown</Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <p className="p-8 text-center text-sm text-secondary-400 animate-pulse">Loading doctors...</p>
                    ) : filteredDoctors.length === 0 ? (
                        <div className="p-12 text-center">
                            <Stethoscope size={40} className="mx-auto text-secondary-300 mb-3" />
                            <p className="font-semibold text-secondary-600">No doctors found</p>
                            <p className="text-xs text-secondary-400 mt-1">Add a doctor to get started.</p>
                            <Button className="mt-4" onClick={() => setModalOpen(true)}>
                                <Plus size={16} className="mr-1" /> Add Doctor
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Doctor</TableHead>
                                    <TableHead>Specialization</TableHead>
                                    <TableHead>Experience</TableHead>
                                    <TableHead>Fee</TableHead>
                                    <TableHead>Room</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDoctors.map((doctor) => (
                                    <TableRow key={doctor.id} className="hover:bg-slate-50/80">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                                                    {(doctor.name || 'D')
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .join('')
                                                        .slice(0, 2)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-secondary-900 block text-sm">
                                                        {doctor.name}
                                                    </span>
                                                    <span className="text-[10px] text-secondary-400">{doctor.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{doctor.specialization || '—'}</TableCell>
                                        <TableCell>{doctor.experience_years ?? 0} yrs</TableCell>
                                        <TableCell className="font-bold">₹{doctor.consultation_fee}</TableCell>
                                        <TableCell className="text-xs">{doctor.room_number || '—'}</TableCell>
                                        <TableCell className="text-xs">{doctor.phone}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doctor.user_id)}
                                                className="text-red-500 hover:bg-red-50"
                                                title="Delete doctor"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {modalOpen && (
                <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-premium border-none relative max-h-[90vh] flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 shrink-0">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Stethoscope className="text-primary-600" size={20} />
                                Register New Doctor
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
                                <X size={20} />
                            </Button>
                        </CardHeader>
                        <form onSubmit={handleFormSubmit} className="flex flex-col min-h-0 flex-1">
                            <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Full Name"
                                        required
                                        placeholder="Dr. John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                    <Input
                                        label="Email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                    <Input
                                        label="Phone"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <Input
                                        label="Password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <div>
                                        <label className="text-xs font-bold text-secondary-600 mb-1 block">Department</label>
                                        <select
                                            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
                                            value={formData.department_id}
                                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                            required
                                        >
                                            {departments.length === 0 ? (
                                                <option value="">Loading...</option>
                                            ) : (
                                                departments.map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                    <Input
                                        label="Specialization"
                                        required
                                        value={formData.specialization}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                    />
                                    <Input
                                        label="Experience (years)"
                                        type="number"
                                        value={formData.experience_years}
                                        onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                                    />
                                    <Input
                                        label="Room / OPD"
                                        value={formData.room_number}
                                        onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                    />
                                    <Input
                                        label="Consultation fee (₹)"
                                        type="number"
                                        required
                                        value={formData.consultation_fee}
                                        onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-3 border-t border-slate-100 shrink-0">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Register Doctor'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default DoctorManagement;
