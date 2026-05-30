import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Button from '../../ui/Button';
import { Ticket, Users, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import Badge from '../../ui/Badge';
import API from '../../../services/api';

const OnlineToken = () => {
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        department_id: '',
        doctor_id: '',
        priority: 'normal'
    });

    const [tokenData, setTokenData] = useState(null);
    const [isGenerated, setIsGenerated] = useState(false);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const response = await API.get('/patient/booking-meta');
                setDepartments(response.data.data.departments || []);
                setDoctors(response.data.data.doctors || []);
            } catch (err) {
                console.error('Failed to load booking meta:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeta();
    }, []);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!formData.department_id || !formData.doctor_id) {
            alert('Please select both a department and a doctor.');
            return;
        }

        setSubmitting(true);
        try {
            // OPD Token is generated on-demand for today's date
            const todayStr = new Date().toISOString().split('T')[0];
            const apptTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            const response = await API.post('/patient/appointments', {
                department_id: formData.department_id,
                doctor_id: formData.doctor_id,
                appointment_date: todayStr,
                appointment_time: apptTime,
                priority: formData.priority
            });

            const data = response.data.data;
            // Get selected doctor and department info
            const selectedDoc = doctors.find(d => String(d.id) === String(formData.doctor_id));
            const selectedDept = departments.find(d => String(d.id) === String(formData.department_id));

            setTokenData({
                tokenNumber: data.tokenNumber || 'T-100',
                queuePosition: data.queuePosition || 1,
                doctorName: selectedDoc ? selectedDoc.name : 'Medical Specialist',
                deptName: selectedDept ? selectedDept.name : 'General OPD',
                roomNumber: selectedDoc?.room_number || 'OPD Room 12'
            });

            setIsGenerated(true);
        } catch (err) {
            console.error('Token generation failed:', err);
            alert(err.response?.data?.message || 'Failed to generate token.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsGenerated(false);
        setTokenData(null);
        setFormData({
            department_id: '',
            doctor_id: '',
            priority: 'normal'
        });
    };

    const filteredDoctors = doctors.filter(
        d => String(d.department_id) === String(formData.department_id)
    );

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">OPD Digital Parchi</h2>
                <Badge variant="info" className="animate-pulse">Live Queue Tracking Enabled</Badge>
            </div>

            {loading ? (
                <p className="p-8 text-center text-xs text-secondary-400 font-medium">Loading hospital directory...</p>
            ) : !isGenerated ? (
                <Card className="overflow-hidden border-none shadow-premium bg-white">
                    <div className="bg-primary-600 p-8 text-white text-center">
                        <Ticket size={48} className="mx-auto mb-4 opacity-80" />
                        <h3 className="text-xl font-bold font-['Outfit']">Generate OPD Token</h3>
                        <p className="text-primary-100 text-xs mt-2">Skip the physical queue, get your instant OPD Parchi online.</p>
                    </div>
                    <form onSubmit={handleGenerate}>
                        <CardContent className="p-8 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-secondary-500 block">Department</label>
                                <select 
                                    required
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value, doctor_id: '' })}
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                >
                                    <option value="">Select Speciality Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-secondary-500 block">Specialist Consultant</label>
                                <select 
                                    required
                                    disabled={!formData.department_id}
                                    value={formData.doctor_id}
                                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                >
                                    <option value="">Select On-Duty Practitioner</option>
                                    {filteredDoctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-secondary-500 block">Triage Priority</label>
                                <select 
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                                >
                                    <option value="normal">Routine Visit</option>
                                    <option value="emergency">Emergency Case</option>
                                </select>
                            </div>
                            <Button
                                type="submit"
                                disabled={submitting || !formData.doctor_id}
                                className="w-full py-4 mt-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-soft"
                            >
                                {submitting ? 'Generating Digital Token...' : 'Generate Token'}
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            ) : (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <Card className="border-2 border-primary-500 shadow-premium overflow-hidden bg-primary-50/10 relative">
                        <div className="p-2.5 bg-primary-500 text-white text-[10px] font-bold text-center uppercase tracking-widest">
                            Official Digital Parchi
                        </div>
                        <CardContent className="p-0 bg-white">
                            <div className="p-8 border-b border-dashed border-slate-300 relative">
                                {/* Punched holes effect */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-r border-slate-200"></div>
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-l border-slate-200"></div>

                                <div className="text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Your Live OPD Token</p>
                                    <p className="text-6xl font-black text-secondary-900 font-['Outfit'] font-mono">{tokenData.tokenNumber}</p>
                                    <Badge variant="success" className="mt-4 px-4 py-1">ACTIVE</Badge>
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-2 gap-8 bg-slate-50/50">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Users size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Queue Position</p>
                                            <p className="text-xs font-bold text-secondary-900">#{tokenData.queuePosition} in Queue</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Est. Consult</p>
                                            <p className="text-xs font-bold text-secondary-900">~{tokenData.queuePosition * 10} Mins</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Chamber / OPD</p>
                                            <p className="text-xs font-bold text-secondary-900">{tokenData.roomNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Assigned Unit</p>
                                            <p className="text-xs font-bold text-secondary-900">{tokenData.doctorName} ({tokenData.deptName})</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button onClick={() => window.print()} variant="outline" className="flex-1 border-slate-200">
                            Download Receipt
                        </Button>
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium" onClick={handleCancel}>
                            Cancel Parchi
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnlineToken;
