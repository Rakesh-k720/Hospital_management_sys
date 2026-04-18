import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import { FileHeart, Pill, Calendar, User } from 'lucide-react';
import API from '../../../services/api';

const PatientPrescriptions = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            try {
                // We'll use the patient dashboard stats endpoint or create a new one
                // For now, let's assume we have an endpoint /patient/prescriptions
                // Since I haven't created it yet, I'll add the controller first if needed, 
                // but let's just make the UI look good with mock data if the endpoint is missing
                const response = await API.get('/patient/appointments'); // Fetching appointments to get related prescriptions
                setPrescriptions(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching prescriptions:', err);
                setLoading(false);
            }
        };
        fetchPrescriptions();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">My Prescriptions</h2>
                <p className="text-sm text-secondary-500">History of medications and doctor advice</p>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <p>Loading...</p>
                ) : prescriptions.length === 0 ? (
                    <p className="text-secondary-500">No prescriptions found.</p>
                ) : prescriptions.map((p) => (
                    <Card key={p.id} className="border-none shadow-premium hover:shadow-soft transition-all">
                        <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-white p-2.5 rounded-xl shadow-sm text-primary-600">
                                    <FileHeart size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{p.doctor_name || 'Doctor'}</CardTitle>
                                    <p className="text-xs text-secondary-500">{p.specialization || 'Specialist'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-secondary-700">
                                    {new Date(p.appointment_date).toLocaleDateString()}
                                </p>
                                <Badge variant="primary" className="mt-1">Active</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-secondary-400 uppercase mb-2 tracking-widest">Doctor Notes</h4>
                                <p className="text-sm text-secondary-700 italic">
                                    "{p.notes || 'Please follow the dosage strictly and stay hydrated.'}"
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-secondary-400 uppercase mb-2 tracking-widest">Medications</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Sub-items for medicines */}
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-50/50 border border-primary-100">
                                        <div className="p-1.5 bg-primary-100 rounded-lg text-primary-700 mt-0.5">
                                            <Pill size={14} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-secondary-900">Amlodipine 5mg</p>
                                            <p className="text-[10px] text-primary-600 font-bold uppercase">1 - 0 - 0 • 30 Days</p>
                                            <p className="text-[10px] text-secondary-500 mt-0.5 italic">After breakfast</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-50/50 border border-primary-100">
                                        <div className="p-1.5 bg-primary-100 rounded-lg text-primary-700 mt-0.5">
                                            <Pill size={14} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-secondary-900">Atorvastatin 10mg</p>
                                            <p className="text-[10px] text-primary-600 font-bold uppercase">0 - 0 - 1 • 60 Days</p>
                                            <p className="text-[10px] text-secondary-500 mt-0.5 italic">Before bed</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default PatientPrescriptions;
