import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { Activity, Heart, FileText, Pill, FlaskConical, Bed, ArrowLeft, Plus, AlertCircle } from 'lucide-react';

const EHRView = () => {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const [ehr, setEhr] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [vitalForm, setVitalForm] = useState({ height_cm: '', weight_kg: '', bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', spo2: '', notes: '' });
    const [conditionForm, setConditionForm] = useState({ condition_name: '', icd10_code: '', diagnosis_date: '', notes: '' });
    const [showVitalModal, setShowVitalModal] = useState(false);
    const [showConditionModal, setShowConditionModal] = useState(false);

    const fetchEHR = async () => {
        setLoading(true);
        try {
            const { data } = await API.get(`/ehr/patient/${patientId}`);
            if (data.success) setEhr(data.data);
        } catch (err) { showToast('Failed to load EHR', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEHR(); }, [patientId]);

    const recordVitals = async (e) => {
        e.preventDefault();
        try {
            await API.post(`/ehr/patient/${patientId}/vitals`, vitalForm);
            showToast('Vitals recorded', 'success');
            setShowVitalModal(false);
            setVitalForm({ height_cm: '', weight_kg: '', bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', spo2: '', notes: '' });
            fetchEHR();
        } catch (err) { showToast('Failed to record vitals', 'error'); }
    };

    const addCondition = async (e) => {
        e.preventDefault();
        try {
            await API.post(`/ehr/patient/${patientId}/conditions`, conditionForm);
            showToast('Condition added', 'success');
            setShowConditionModal(false);
            setConditionForm({ condition_name: '', icd10_code: '', diagnosis_date: '', notes: '' });
            fetchEHR();
        } catch (err) { showToast('Failed to add condition', 'error'); }
    };

    const markResolved = async (id) => {
        try {
            await API.put(`/ehr/conditions/${id}`, { status: 'resolved' });
            showToast('Condition marked as resolved', 'success');
            fetchEHR();
        } catch (err) { showToast('Failed to update', 'error'); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!ehr) return <div className="p-6 text-center text-gray-500">Patient not found</div>;

    const p = ehr.patient;
    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'conditions', label: 'Conditions', icon: AlertCircle },
        { id: 'vitals', label: 'Vitals', icon: Heart },
        { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
        { id: 'labs', label: 'Lab Reports', icon: FlaskConical },
        { id: 'admissions', label: 'Admissions', icon: Bed },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{p.name}</h1>
                    <p className="text-sm text-gray-500">Age: {p.age} | {p.gender} | Blood Group: {p.blood_group || 'N/A'} | {p.phone}</p>
                </div>
            </div>

            {p.allergies && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-red-700 flex items-center gap-1"><AlertCircle size={16} /> Allergies</h3>
                    <p className="text-sm text-red-600 mt-1">{p.allergies}</p>
                </div>
            )}

            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <t.icon size={16} className="inline mr-1" />{t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border"><h3 className="text-xs font-bold text-gray-500 uppercase">Active Conditions</h3><p className="text-3xl font-bold text-blue-600 mt-2">{ehr.conditions?.filter(c => c.status === 'active').length || 0}</p></div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border"><h3 className="text-xs font-bold text-gray-500 uppercase">Total Visits</h3><p className="text-3xl font-bold text-green-600 mt-2">{ehr.prescriptions?.length || 0}</p></div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border"><h3 className="text-xs font-bold text-gray-500 uppercase">Lab Reports</h3><p className="text-3xl font-bold text-purple-600 mt-2">{ehr.labReports?.length || 0}</p></div>
                    {ehr.vitals?.[0] && (
                        <div className="md:col-span-3 bg-white rounded-xl p-4 shadow-sm border">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Latest Vitals ({new Date(ehr.vitals[0].recorded_at).toLocaleString()})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                {ehr.vitals[0].bp_systolic && <div className="text-center"><p className="text-xs text-gray-400">BP</p><p className="font-bold text-red-600">{ehr.vitals[0].bp_systolic}/{ehr.vitals[0].bp_diastolic}</p></div>}
                                {ehr.vitals[0].pulse && <div className="text-center"><p className="text-xs text-gray-400">Pulse</p><p className="font-bold text-pink-600">{ehr.vitals[0].pulse}</p></div>}
                                {ehr.vitals[0].temperature && <div className="text-center"><p className="text-xs text-gray-400">Temp</p><p className="font-bold text-amber-600">{ehr.vitals[0].temperature}°F</p></div>}
                                {ehr.vitals[0].spo2 && <div className="text-center"><p className="text-xs text-gray-400">SpO2</p><p className="font-bold text-blue-600">{ehr.vitals[0].spo2}%</p></div>}
                                {ehr.vitals[0].weight_kg && <div className="text-center"><p className="text-xs text-gray-400">Weight</p><p className="font-bold">{ehr.vitals[0].weight_kg} kg</p></div>}
                                {ehr.vitals[0].height_cm && <div className="text-center"><p className="text-xs text-gray-400">Height</p><p className="font-bold">{ehr.vitals[0].height_cm} cm</p></div>}
                            </div>
                        </div>
                    )}
                    {p.medical_notes && <div className="md:col-span-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4"><h3 className="text-sm font-bold text-yellow-700">Medical Notes</h3><p className="text-sm mt-1">{p.medical_notes}</p></div>}
                </div>
            )}

            {tab === 'conditions' && (
                <div className="space-y-4">
                    <button onClick={() => setShowConditionModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700"><Plus size={16} /> Add Condition</button>
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Condition</th><th className="px-4 py-3 text-left">ICD-10</th><th className="px-4 py-3 text-left">Diagnosed</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Doctor</th><th className="px-4 py-3">Action</th></tr></thead>
                            <tbody className="divide-y">
                                {ehr.conditions?.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{c.condition_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.icd10_code || '-'}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.diagnosis_date ? new Date(c.diagnosis_date).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{c.status}</span></td>
                                        <td className="px-4 py-3 text-gray-500">{c.diagnosed_by_name || '-'}</td>
                                        <td className="px-4 py-3 text-center">{c.status === 'active' && <button onClick={() => markResolved(c.id)} className="text-xs text-blue-600 hover:underline">Mark Resolved</button>}</td>
                                    </tr>
                                ))}
                                {!ehr.conditions?.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No conditions recorded</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'vitals' && (
                <div className="space-y-4">
                    <button onClick={() => setShowVitalModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700"><Plus size={16} /> Record Vitals</button>
                    <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">BP</th><th className="px-3 py-3">Pulse</th><th className="px-3 py-3">Temp</th><th className="px-3 py-3">SpO2</th><th className="px-3 py-3">Weight</th><th className="px-3 py-3">Height</th><th className="px-3 py-3">By</th></tr></thead>
                            <tbody className="divide-y">
                                {ehr.vitals?.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50 text-center">
                                        <td className="px-3 py-3">{new Date(v.recorded_at).toLocaleString()}</td>
                                        <td className="px-3 py-3 font-medium text-red-600">{v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '-'}</td>
                                        <td className="px-3 py-3">{v.pulse || '-'}</td>
                                        <td className="px-3 py-3">{v.temperature ? `${v.temperature}°F` : '-'}</td>
                                        <td className="px-3 py-3">{v.spo2 ? `${v.spo2}%` : '-'}</td>
                                        <td className="px-3 py-3">{v.weight_kg ? `${v.weight_kg}kg` : '-'}</td>
                                        <td className="px-3 py-3">{v.height_cm ? `${v.height_cm}cm` : '-'}</td>
                                        <td className="px-3 py-3 text-gray-500">{v.recorded_by_name}</td>
                                    </tr>
                                ))}
                                {!ehr.vitals?.length && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No vitals recorded</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'prescriptions' && (
                <div className="space-y-3">
                    {ehr.prescriptions?.map(pr => (
                        <div key={pr.id} className="bg-white rounded-xl p-4 shadow-sm border">
                            <div className="flex justify-between mb-2"><span className="text-sm font-bold">{pr.doctor_name} — {pr.department_name}</span><span className="text-xs text-gray-500">{new Date(pr.created_at).toLocaleString()}</span></div>
                            {pr.notes && <p className="text-sm text-gray-600 mb-2">{pr.notes}</p>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {pr.medicines?.map(m => <div key={m.id} className="text-xs bg-blue-50 rounded px-2 py-1"><span className="font-medium">{m.medicine_name}</span> — {m.dosage} — {m.duration}</div>)}
                            </div>
                        </div>
                    ))}
                    {!ehr.prescriptions?.length && <p className="text-center text-gray-400 py-8">No prescriptions</p>}
                </div>
            )}

            {tab === 'labs' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Test</th><th className="px-4 py-3 text-left">Doctor</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
                        <tbody className="divide-y">
                            {ehr.labReports?.map(l => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{l.test_name}</td>
                                    <td className="px-4 py-3 text-gray-500">{l.doctor_name}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${l.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{l.status}</span></td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(l.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {!ehr.labReports?.length && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No lab reports</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'admissions' && (
                <div className="space-y-3">
                    {ehr.admissions?.map(a => (
                        <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border flex justify-between items-center">
                            <div>
                                <p className="font-medium">{a.ward_name} — Bed {a.bed_number}</p>
                                <p className="text-sm text-gray-500">Dr. {a.doctor_name} | {a.diagnosis || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'admitted' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                                <p className="text-xs text-gray-400 mt-1">{new Date(a.admission_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                    {!ehr.admissions?.length && <p className="text-center text-gray-400 py-8">No admissions</p>}
                </div>
            )}

            {showVitalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4">Record Vitals</h2>
                        <form onSubmit={recordVitals} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-gray-500">Height (cm)</label><input type="number" step="0.1" value={vitalForm.height_cm} onChange={(e) => setVitalForm({...vitalForm, height_cm: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">Weight (kg)</label><input type="number" step="0.1" value={vitalForm.weight_kg} onChange={(e) => setVitalForm({...vitalForm, weight_kg: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">BP Systolic</label><input type="number" value={vitalForm.bp_systolic} onChange={(e) => setVitalForm({...vitalForm, bp_systolic: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">BP Diastolic</label><input type="number" value={vitalForm.bp_diastolic} onChange={(e) => setVitalForm({...vitalForm, bp_diastolic: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">Pulse</label><input type="number" value={vitalForm.pulse} onChange={(e) => setVitalForm({...vitalForm, pulse: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">Temp (°F)</label><input type="number" step="0.1" value={vitalForm.temperature} onChange={(e) => setVitalForm({...vitalForm, temperature: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">SpO2 (%)</label><input type="number" step="0.1" value={vitalForm.spo2} onChange={(e) => setVitalForm({...vitalForm, spo2: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                            </div>
                            <textarea placeholder="Notes" value={vitalForm.notes} onChange={(e) => setVitalForm({...vitalForm, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">Save Vitals</button>
                        </form>
                    </div>
                </div>
            )}

            {showConditionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4">Add Medical Condition</h2>
                        <form onSubmit={addCondition} className="space-y-3">
                            <input required placeholder="Condition Name *" value={conditionForm.condition_name} onChange={(e) => setConditionForm({...conditionForm, condition_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="ICD-10 Code (optional)" value={conditionForm.icd10_code} onChange={(e) => setConditionForm({...conditionForm, icd10_code: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input type="date" value={conditionForm.diagnosis_date} onChange={(e) => setConditionForm({...conditionForm, diagnosis_date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <textarea placeholder="Notes" value={conditionForm.notes} onChange={(e) => setConditionForm({...conditionForm, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">Add Condition</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EHRView;
