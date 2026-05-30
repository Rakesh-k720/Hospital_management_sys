import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../ui/Card';
import Button from '../../ui/Button';
import { ChevronRight, Check, Printer, Calendar, Clock, DollarSign, Activity, Stethoscope, AlertTriangle } from 'lucide-react';
import API from '../../../services/api';
import { useTranslation } from 'react-i18next';

const BookAppointment = () => {
    const { t } = useTranslation();
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
        priority: 'normal',
        reason: ''
    });

    // Preset Time Slots
    const timeSlots = [
        { label: '09:00 AM', value: '09:00:00' },
        { label: '10:00 AM', value: '10:00:00' },
        { label: '11:00 AM', value: '11:00:00' },
        { label: '12:00 PM', value: '12:00:00' },
        { label: '02:00 PM', value: '14:00:00' },
        { label: '03:00 PM', value: '15:00:00' },
        { label: '04:00 PM', value: '16:00:00' },
        { label: '05:00 PM', value: '17:00:00' }
    ];

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

    const selectedDoctorDetails = useMemo(
        () => doctors.find((doc) => String(doc.id) === String(formData.doctor_id)),
        [doctors, formData.doctor_id]
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
            setError('Please select date and time slot.');
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
            priority: 'normal',
            reason: ''
        });
        setSuccessData(null);
        setStep(1);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Book OPD Appointment</h2>
                    <p className="text-xs text-secondary-500">Secure your digital OPD parchi in 4 easy steps</p>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${step >= s ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                    ))}
                </div>
            </div>

            <Card className="border-none shadow-premium bg-white overflow-hidden">
                {loading && (
                    <CardContent className="p-12 text-center text-secondary-400 font-medium text-xs">
                        Loading hospital metadata, departments and active practitioners...
                    </CardContent>
                )}

                {!loading && error && (
                    <div className="mx-8 mt-6">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    </div>
                )}

                {!loading && step === 1 && (
                    <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Step 1 of 4</p>
                            <h3 className="text-xl font-bold text-secondary-900">Select Clinical Speciality</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Medical Specialty Ward</label>
                                <select
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                    value={formData.department_id}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, department_id: e.target.value, doctor_id: '' }))}
                                >
                                    <option value="">Select Medical Unit</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Specialist Clinician</label>
                                <select
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                    value={formData.doctor_id}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, doctor_id: e.target.value }))}
                                    disabled={!formData.department_id}
                                >
                                    <option value="">Choose Consulting Doctor</option>
                                    {doctorsForDepartment.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} ({doc.specialization})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Doctor Summary Card */}
                            {selectedDoctorDetails && (
                                <div className="p-4 rounded-2xl bg-primary-50/20 border border-primary-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-200 mt-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white text-primary-600 flex items-center justify-center font-bold text-sm shadow-sm border border-slate-100 uppercase">
                                        {selectedDoctorDetails.name?.split(' ').map(n => n[0]).join('') || 'DR'}
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Clinician</p>
                                            <p className="font-bold text-secondary-900">{selectedDoctorDetails.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Clinical Fee</p>
                                            <p className="font-bold text-primary-700">₹{selectedDoctorDetails.consultation_fee || 500}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">OPD Room</p>
                                            <p className="font-bold text-secondary-600">OPD Chamber {selectedDoctorDetails.room_number || 'Room 10'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <Button
                                    className="w-full py-4 text-xs font-bold flex items-center justify-center gap-2 group bg-primary-600 hover:bg-primary-700 text-white shadow-soft"
                                    onClick={handleNext}
                                    disabled={!formData.department_id || !formData.doctor_id}
                                >
                                    Proceed to Date & Slot Selection
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}

                {!loading && step === 2 && (
                    <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Step 2 of 4</p>
                            <h3 className="text-xl font-bold text-secondary-900">Choose Appointment Slot</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">OPD Date</label>
                                    <input
                                        type="date"
                                        value={formData.appointment_date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, appointment_date: e.target.value }))}
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">OPD Triage Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="normal">Routine Review</option>
                                        <option value="emergency">Emergency Priority</option>
                                    </select>
                                </div>
                            </div>

                            {/* Interactive Time Slots Grid */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Available Time Slots</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {timeSlots.map((slot) => (
                                        <div
                                            key={slot.value}
                                            onClick={() => setFormData(prev => ({ ...prev, appointment_time: slot.value }))}
                                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${
                                                formData.appointment_time === slot.value
                                                    ? 'border-primary-500 bg-primary-50/20 text-primary-700 font-bold'
                                                    : 'border-slate-100 bg-slate-50 text-secondary-600 hover:bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xs font-semibold">{slot.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Primary Illness Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Brief Medical Complaint / Reason (Optional)</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full h-20 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                    placeholder="Describe your health concern briefly..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                                <Button 
                                    className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-soft" 
                                    onClick={handleConfirm}
                                    disabled={!formData.appointment_date || !formData.appointment_time}
                                >
                                    Confirm Scheduling
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}

                {!loading && step === 3 && (
                    <CardContent className="p-8 text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-4 text-center">
                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Step 3 of 4</p>
                            <h3 className="text-xl font-bold text-secondary-900">Review Booking Details</h3>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-left text-xs space-y-4 max-w-md mx-auto">
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                                <span className="text-secondary-400 font-bold uppercase">Department</span>
                                <span className="font-bold text-secondary-900">{departments.find((d) => String(d.id) === String(formData.department_id))?.name}</span>
                            </div>
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                                <span className="text-secondary-400 font-bold uppercase">Doctor Name</span>
                                <span className="font-bold text-secondary-900">{selectedDoctorDetails?.name}</span>
                            </div>
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                                <span className="text-secondary-400 font-bold uppercase">OPD Date</span>
                                <span className="font-bold text-secondary-900">{formData.appointment_date}</span>
                            </div>
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                                <span className="text-secondary-400 font-bold uppercase">Time Slot</span>
                                <span className="font-bold text-secondary-900">
                                    {timeSlots.find(ts => ts.value === formData.appointment_time)?.label || formData.appointment_time}
                                </span>
                            </div>
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                                <span className="text-secondary-400 font-bold uppercase">Triage Level</span>
                                <span className="font-bold text-secondary-900 uppercase">{formData.priority}</span>
                            </div>
                            {formData.reason && (
                                <div className="pt-2">
                                    <span className="text-secondary-400 font-bold uppercase block mb-1">Patient Comments</span>
                                    <p className="text-secondary-700 italic">"{formData.reason}"</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 max-w-md mx-auto">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                            <Button 
                                className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-soft" 
                                onClick={handleSubmit} 
                                disabled={submitting}
                            >
                                {submitting ? 'Confirming with Chamber...' : 'Book OPD Appointment'}
                            </Button>
                        </div>
                    </CardContent>
                )}

                {!loading && step === 4 && (
                    <CardContent className="p-12 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-bold text-secondary-900 mb-2">Appointment Confirmed!</h3>
                        <p className="text-xs text-secondary-500 mb-2 max-w-sm mx-auto">
                            {t('booking.tokenConfirmed', { token: successData?.tokenNumber })}
                        </p>
                        <p className="text-xs text-green-600 font-medium mb-8 max-w-sm mx-auto">
                            {successData?.notificationSent ? t('booking.smsSent') : t('booking.smsSimulated')}
                        </p>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left mb-8 max-w-md mx-auto relative">
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-r border-slate-200"></div>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-l border-slate-200"></div>
                            
                            <div className="flex justify-between mb-2">
                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Active Token</span>
                                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Confirmed Parchi</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-4xl font-black text-secondary-900 font-mono tracking-tight">{successData?.tokenNumber || 'T-101'}</p>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase">Queue Index</p>
                                    <p className="text-sm font-bold text-secondary-900">#{successData?.queuePosition || '1'} Patient</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 max-w-md mx-auto">
                            <Button 
                                variant="outline" 
                                className="flex-1 border-slate-200" 
                                onClick={() => window.print()}
                            >
                                <Printer size={14} className="mr-1" /> Print Parchi
                            </Button>
                            <Button 
                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-soft" 
                                onClick={resetForm}
                            >
                                Book Another
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default BookAppointment;
