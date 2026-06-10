import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { LayoutDashboard, Bed, Heart, FileText, Plus } from 'lucide-react';

const NurseHome = () => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [notes, setNotes] = useState([]);
    const [noteForm, setNoteForm] = useState({ note_type: 'observation', content: '' });
    const [vitalForm, setVitalForm] = useState({ bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', spo2: '' });
    const [showVitals, setShowVitals] = useState(false);

    const fetchPatients = async () => {
        try {
            const { data } = await API.get('/staff/nurse/ipd-patients');
            if (data.success) setPatients(data.data);
        } catch (err) { showToast('Failed to load patients', 'error'); }
    };

    useEffect(() => { fetchPatients(); }, []);

    const fetchNotes = async (patientId) => {
        try {
            const { data } = await API.get(`/staff/nurse/patient/${patientId}/notes`);
            if (data.success) setNotes(data.data);
        } catch (err) { /* silent */ }
    };

    const selectPatient = (p) => {
        setSelectedPatient(p);
        fetchNotes(p.patient_id);
    };

    const addNote = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;
        try {
            await API.post(`/staff/nurse/patient/${selectedPatient.patient_id}/notes`, noteForm);
            showToast('Note added', 'success');
            setNoteForm({ note_type: 'observation', content: '' });
            fetchNotes(selectedPatient.patient_id);
        } catch (err) { showToast('Failed', 'error'); }
    };

    const recordVitals = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;
        try {
            await API.post(`/ehr/patient/${selectedPatient.patient_id}/vitals`, vitalForm);
            showToast('Vitals recorded', 'success');
            setShowVitals(false);
            setVitalForm({ bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '', spo2: '' });
        } catch (err) { showToast('Failed', 'error'); }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><LayoutDashboard className="text-green-600" /> Nurse Dashboard</h1>

            <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
                <h3 className="font-bold flex items-center gap-2 mb-3"><Bed size={18} /> IPD Patients ({patients.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {patients.map(p => (
                        <div key={p.id} onClick={() => selectPatient(p)} className={`p-3 rounded-lg border cursor-pointer transition ${selectedPatient?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                            <p className="font-medium">{p.patient_name}</p>
                            <p className="text-xs text-gray-500">{p.ward_name} — Bed {p.bed_number} ({p.bed_type})</p>
                            <p className="text-xs text-gray-500">Dr. {p.doctor_name}</p>
                            <p className="text-xs text-gray-400">Admitted: {new Date(p.admission_date).toLocaleDateString()}</p>
                        </div>
                    ))}
                    {!patients.length && <p className="text-gray-400 col-span-3 text-center py-4">No admitted patients</p>}
                </div>
            </div>

            {selectedPatient && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold">Patient: {selectedPatient.patient_name}</h3>
                            <button onClick={() => setShowVitals(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-green-700"><Heart size={14} /> Record Vitals</button>
                        </div>
                        <p className="text-sm text-gray-500">Diagnosis: {selectedPatient.diagnosis || 'N/A'}</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><FileText size={16} /> Nursing Notes</h3>
                        <form onSubmit={addNote} className="flex gap-2 mb-4">
                            <select value={noteForm.note_type} onChange={(e) => setNoteForm({...noteForm, note_type: e.target.value})} className="border rounded-lg px-2 py-2 text-sm">
                                <option value="observation">Observation</option><option value="vitals">Vitals</option><option value="medication">Medication</option><option value="care">Care</option>
                            </select>
                            <input required placeholder="Write a note..." value={noteForm.content} onChange={(e) => setNoteForm({...noteForm, content: e.target.value})} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                            <button type="submit" className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700">Add</button>
                        </form>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {notes.map(n => (
                                <div key={n.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between mb-1"><span className="text-xs font-bold text-blue-600 uppercase">{n.note_type}</span><span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span></div>
                                    <p>{n.content}</p>
                                    <p className="text-xs text-gray-400 mt-1">— {n.nurse_name}</p>
                                </div>
                            ))}
                            {!notes.length && <p className="text-gray-400 text-sm text-center py-4">No notes yet</p>}
                        </div>
                    </div>
                </div>
            )}

            {showVitals && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4">Record Vitals</h2>
                        <form onSubmit={recordVitals} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="BP Systolic" value={vitalForm.bp_systolic} onChange={(e) => setVitalForm({...vitalForm, bp_systolic: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                <input type="number" placeholder="BP Diastolic" value={vitalForm.bp_diastolic} onChange={(e) => setVitalForm({...vitalForm, bp_diastolic: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                <input type="number" placeholder="Pulse" value={vitalForm.pulse} onChange={(e) => setVitalForm({...vitalForm, pulse: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                <input type="number" step="0.1" placeholder="Temp (°F)" value={vitalForm.temperature} onChange={(e) => setVitalForm({...vitalForm, temperature: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                <input type="number" step="0.1" placeholder="SpO2 (%)" value={vitalForm.spo2} onChange={(e) => setVitalForm({...vitalForm, spo2: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700">Save Vitals</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NurseHome;
