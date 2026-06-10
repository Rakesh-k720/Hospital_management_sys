import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { Users, Plus, Edit2, X, Shield, Download } from 'lucide-react';
import { exportStaffToCSV } from '../../../utils/csvExport';

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'receptionist' });

    const fetchStaff = async () => {
        try {
            const { data } = await API.get('/staff/admin/list');
            if (data.success) setStaff(data.data);
        } catch (err) { showToast('Failed to load staff', 'error'); }
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post('/staff/admin/create', form);
            showToast('Staff member created', 'success');
            setShowModal(false);
            setForm({ name: '', email: '', phone: '', password: '', role: 'receptionist' });
            fetchStaff();
        } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await API.put(`/staff/admin/${id}`, { status: currentStatus === 'active' ? 'inactive' : 'active' });
            showToast('Status updated', 'success');
            fetchStaff();
        } catch (err) { showToast('Failed', 'error'); }
    };

    const roleColors = { receptionist: 'bg-blue-50 text-blue-700', nurse: 'bg-green-50 text-green-700', pharmacist: 'bg-purple-50 text-purple-700', accountant: 'bg-amber-50 text-amber-700' };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Users className="text-blue-600" /> Staff Management</h1>
                <div className="flex gap-2">
                    <button onClick={() => exportStaffToCSV(staff)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"><Download size={18} /> Export CSV</button>
                    <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={18} /> Add Staff</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {['receptionist', 'nurse', 'pharmacist', 'accountant'].map(role => (
                    <div key={role} className="bg-white rounded-xl p-4 shadow-sm border">
                        <p className="text-xs text-gray-500 capitalize">{role}s</p>
                        <p className="text-2xl font-bold">{staff.filter(s => s.role === role).length}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Phone</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                    <tbody className="divide-y">
                        {staff.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{s.name}</td>
                                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                                <td className="px-4 py-3 text-gray-500">{s.phone || '-'}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[s.role] || ''}`}>{s.role}</span></td>
                                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span></td>
                                <td className="px-4 py-3 text-center"><button onClick={() => toggleStatus(s.id, s.status)} className="text-xs text-blue-600 hover:underline">{s.status === 'active' ? 'Deactivate' : 'Activate'}</button></td>
                            </tr>
                        ))}
                        {!staff.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No staff members</td></tr>}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Add Staff Member</h2><button onClick={() => setShowModal(false)}><X size={20} /></button></div>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <input required placeholder="Full Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input required type="password" placeholder="Password *" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                                <option value="receptionist">Receptionist</option><option value="nurse">Nurse</option><option value="pharmacist">Pharmacist</option><option value="accountant">Accountant</option>
                            </select>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">Create Staff Member</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
