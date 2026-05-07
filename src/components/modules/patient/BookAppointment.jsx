import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../ui/Card';
import Button from '../../ui/Button';
import { ChevronRight, Check } from 'lucide-react';
import API from '../../../services/api';

const BookAppointment = () => {
    const [step, setStep] = useState(1);
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);
    const [formData, setFormData] = useState({
        department_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        priority: 'normal'
    });

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const response = await API.get('/patient/booking-meta');
                setDepartments(response.data.data.departments || []);
                setDoctors(response.data.data.doctors || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load booking data.');
            } finally {
                setLoading(false);
            }
        };
        fetchMeta();
    }, []);

    const doctorsForDepartment = useMemo(
        () => doctors.filter((doc) => String(doc.department_id) === String(formData.department_id)),
        [doctors, formData.department_id]
    );

    const handleNext = () => {
        if (!formData.department_id || !formData.doctor_id) {
            setError('Please select both department and doctor.');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleConfirm = () => {
        if (!formData.appointment_date || !formData.appointment_time) {
            setError('Please select date and time.');
            return;
        }
        setError('');
        setStep(3);
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError('');
            const response = await API.post('/patient/appointments', formData);
            setSuccessData(response.data.data);
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book appointment.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            department_id: '',
            doctor_id: '',
            appointment_date: '',
            appointment_time: '',
            priority: 'normal'
        });
        setSuccessData(null);
        setStep(1);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Book Appointment</h2>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${step >= s ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                    ))}
                </div>
            </div>

            <Card>
                {loading && (
                    <CardContent className="p-8 text-center text-secondary-500">Loading booking options...</CardContent>
                )}

                {!loading && error && (
                    <CardContent className="p-4">
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                    </CardContent>
                )}

                {!loading && step === 1 && (
                    <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-8">
                            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Step 1</p>
                            <h3 className="text-xl font-bold text-secondary-900">Select Department & Doctor</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-secondary-700">Medical Department</label>
                                <select
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    value={formData.department_id}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, department_id: e.target.value, doctor_id: '' }))}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-secondary-700">Specialist Doctor</label>
                                <select
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    value={formData.doctor_id}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, doctor_id: e.target.value }))}
                                    disabled={!formData.department_id}
                                >
                                    <option value="">Select Doctor</option>
                                    {doctorsForDepartment.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} ({doc.specialization})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4">
                                <Button
                                    className="w-full py-6 text-base flex items-center justify-center gap-2 group"
                                    onClick={handleNext}
                                    disabled={!formData.department_id || !formData.doctor_id}
                                >
                                    Next Step
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}

                {!loading && step === 2 && (
                    <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-8">
                            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Step 2</p>
                            <h3 className="text-xl font-bold text-secondary-900">Choose Date & Time</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-secondary-700">Appointment Date</label>
                                <input
                                    type="date"
                                    value={formData.appointment_date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, appointment_date: e.target.value }))}
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-secondary-700">Appointment Time</label>
                                <input
                                    type="time"
                                    value={formData.appointment_time}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, appointment_time: e.target.value }))}
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-secondary-700">Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                            <Button className="flex-[2]" onClick={handleConfirm}>Confirm Selection</Button>
                        </div>
                    </CardContent>
                )}

                {!loading && step === 3 && (
                    <CardContent className="p-8 text-center space-y-6">
                        <h3 className="text-xl font-bold text-secondary-900">Confirm Appointment</h3>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm space-y-2">
                            <p><span className="font-semibold">Department:</span> {departments.find((d) => String(d.id) === String(formData.department_id))?.name}</p>
                            <p><span className="font-semibold">Doctor:</span> {doctors.find((d) => String(d.id) === String(formData.doctor_id))?.name}</p>
                            <p><span className="font-semibold">Date:</span> {formData.appointment_date}</p>
                            <p><span className="font-semibold">Time:</span> {formData.appointment_time}</p>
                            <p><span className="font-semibold">Priority:</span> {formData.priority}</p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Booking...' : 'Book Appointment'}
                            </Button>
                        </div>
                    </CardContent>
                )}

                {!loading && step === 4 && (
                    <CardContent className="p-12 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-bold text-secondary-900 mb-2">Appointment Scheduled!</h3>
                        <p className="text-secondary-500 mb-8 max-w-sm mx-auto">
                            Appointment booked successfully for <span className="text-secondary-900 font-bold">{successData?.appointmentDate}</span>.
                        </p>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left mb-8">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-secondary-400 uppercase">Token Number</span>
                                <span className="text-xs font-bold text-primary-600">CONFIRMED</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-secondary-900 font-mono">{successData?.tokenNumber || '-'}</p>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-secondary-900">Queue Position</p>
                                    <p className="text-[10px] text-secondary-500 uppercase">{successData?.queuePosition || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={resetForm}>Book Another</Button>
                            <Button className="flex-1" onClick={resetForm}>Go to Portal</Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default BookAppointment;
