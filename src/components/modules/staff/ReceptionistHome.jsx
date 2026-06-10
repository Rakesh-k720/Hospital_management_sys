import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { LayoutDashboard, Users, Calendar, Clock, UserPlus } from 'lucide-react';

const ReceptionistHome = () => {
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ waiting: 0, in_consultation: 0, completed: 0 });
    const [showWalkIn, setShowWalkIn] = useState(false);
    const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', age: '', gender: 'male' });

    const fetchQueue = async () => {
        try {
            const { data } = await API.get('/staff/receptionist/queue');
            if (data.success) {
                setQueue(data.data);
                setStats({
                    waiting: data.data.filter(t => t.status === 'waiting').length,
                    in_consultation: data.data.filter(t => t.status === 'in_consultation').length,
                    completed: data.data.filter(t => t.status === 'completed').length,
                });
            }
        } catch (err) { showToast('Failed to load queue', 'error'); }
    };

    useEffect(() => { fetchQueue(); }, []);

    const registerWalkIn = async (e) => {
        e.preventDefault();
        try {
            await API.post('/staff/receptionist/walk-in', walkInForm);
            showToast('Walk-in patient registered', 'success');
            setShowWalkIn(false);
            setWalkInForm({ name: '', phone: '', age: '', gender: 'male' });
            fetchQueue();
        } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><LayoutDashboard className="text-blue-600" /> Receptionist Dashboard</h1>
                <button onClick={() => setShowWalkIn(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><UserPlus size={18} /> Walk-in Patient</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200"><p className="text-xs text-yellow-600 font-bold">Waiting</p><p className="text-3xl font-bold text-yellow-700">{stats.waiting}</p></div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200"><p className="text-xs text-blue-600 font-bold">In Consultation</p><p className="text-3xl font-bold text-blue-700">{stats.in_consultation}</p></div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200"><p className="text-xs text-green-600 font-bold">Completed Today</p><p className="text-3xl font-bold text-green-700">{stats.completed}</p></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <div className="px-4 py-3 border-b"><h3 className="font-bold">Today's Queue</h3></div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Token</th><th className="px-4 py-3 text-left">Patient</th><th className="px-4 py-3 text-left">Doctor</th><th className="px-4 py-3 text-left">Department</th><th className="px-4 py-3 text-left">Priority</th><th className="px-4 py-3 text-center">Status</th></tr></thead>
                    <tbody className="divide-y">
                        {queue.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono font-bold">{t.token_number}</td>
                                <td className="px-4 py-3">{t.patient_name}</td>
                                <td className="px-4 py-3 text-gray-500">{t.doctor_name}</td>
                                <td className="px-4 py-3 text-gray-500">{t.department_name}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${t.priority === 'emergency' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{t.priority}</span></td>
                                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'waiting' ? 'bg-yellow-50 text-yellow-700' : t.status === 'in_consultation' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{t.status}</span></td>
                            </tr>
                        ))}
                        {!queue.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No patients in queue today</td></tr>}
                    </tbody>
                </table>
            </div>

            {showWalkIn && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4">Register Walk-in Patient</h2>
                        <form onSubmit={registerWalkIn} className="space-y-3">
                            <input required placeholder="Patient Name *" value={walkInForm.name} onChange={(e) => setWalkInForm({...walkInForm, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input required placeholder="Phone *" value={walkInForm.phone} onChange={(e) => setWalkInForm({...walkInForm, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Age" value={walkInForm.age} onChange={(e) => setWalkInForm({...walkInForm, age: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                <select value={walkInForm.gender} onChange={(e) => setWalkInForm({...walkInForm, gender: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">Register Patient</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceptionistHome;
