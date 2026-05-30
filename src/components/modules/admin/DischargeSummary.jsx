import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { Printer, ArrowLeft } from 'lucide-react';
import Badge from '../../ui/Badge';

const DischargeSummary = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const admissionId = location.state?.admissionId;
    const [admission, setAdmission] = useState(null);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(!!admissionId);

    useEffect(() => {
        if (!admissionId) return;
        API.get(`/admin/admissions/${admissionId}`)
            .then((res) => setAdmission(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [admissionId]);

    const handleDischarge = async () => {
        try {
            await API.post('/admin/discharge', { admission_id: admissionId, discharge_summary: summary });
            showToast('Patient discharged');
            navigate('/admin/ipd');
        } catch (err) {
            showToast('Discharge failed', 'error');
        }
    };

    if (!admissionId) {
        return (
            <div className="max-w-lg mx-auto text-center space-y-4 mt-12">
                <p className="text-secondary-500">Select a patient from IPD / Admission to discharge.</p>
                <Button onClick={() => navigate('/admin/ipd')}>Go to IPD</Button>
            </div>
        );
    }

    if (loading) return <p className="text-secondary-400">Loading admission...</p>;
    if (!admission) return <p className="text-red-500">Admission not found</p>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 print-area">
            <div className="flex justify-between no-print">
                <Button variant="ghost" onClick={() => navigate('/admin/ipd')} className="gap-2"><ArrowLeft size={16} /> Back</Button>
                <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer size={16} /> Print</Button>
            </div>

            <Card className="border-none shadow-premium print:shadow-none">
                <CardHeader className="border-b p-8">
                    <div className="flex justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">LifeLine Hospital</h1>
                            <p className="text-sm text-secondary-500">Discharge Summary</p>
                        </div>
                        <Badge variant="success">ADMITTED</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Patient</p>
                            <p className="font-bold">{admission.patient_name}</p>
                            <p className="text-xs">{admission.age}Y / {admission.gender} | {admission.blood_group}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Stay</p>
                            <p className="font-bold">{admission.ward_name} — Bed {admission.bed_number}</p>
                            <p className="text-xs">Admitted: {new Date(admission.admission_date).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Doctor</p>
                            <p className="font-bold">{admission.doctor_name}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-secondary-400 uppercase mb-2">Admission Diagnosis</p>
                        <p className="text-sm whitespace-pre-wrap">{admission.diagnosis}</p>
                    </div>
                    <div className="no-print">
                        <label className="text-xs font-bold text-secondary-500">Discharge Summary & Instructions</label>
                        <textarea
                            className="w-full mt-2 border rounded-lg p-3 text-sm min-h-[120px]"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Treatment given, medications at discharge, follow-up..."
                        />
                    </div>
                </CardContent>
                <CardFooter className="no-print gap-2">
                    <Button onClick={handleDischarge}>Confirm Discharge</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default DischargeSummary;
