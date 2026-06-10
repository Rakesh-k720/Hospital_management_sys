import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { Pill, Plus, Search, AlertTriangle, Package, DollarSign, TrendingUp, Edit2, Trash2, X } from 'lucide-react';

const PharmacyManagement = () => {
    const [medicines, setMedicines] = useState([]);
    const [stats, setStats] = useState({});
    const [search, setSearch] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editMed, setEditMed] = useState(null);
    const [form, setForm] = useState({ name: '', generic_name: '', manufacturer: '', category: 'general', unit_price: 0, stock_quantity: 0, reorder_level: 10, expiry_date: '', batch_number: '' });

    const fetchMedicines = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (lowStockOnly) params.set('low_stock', '1');
            const { data } = await API.get(`/pharmacy/medicines?${params}`);
            if (data.success) {
                setMedicines(data.data.medicines);
                setStats(data.data.stats);
            }
        } catch (err) { showToast('Failed to load medicines', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMedicines(); }, [search, lowStockOnly]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMed) {
                await API.put(`/pharmacy/medicines/${editMed.id}`, form);
                showToast('Medicine updated', 'success');
            } else {
                await API.post('/pharmacy/medicines', form);
                showToast('Medicine created', 'success');
            }
            setShowModal(false);
            setEditMed(null);
            setForm({ name: '', generic_name: '', manufacturer: '', category: 'general', unit_price: 0, stock_quantity: 0, reorder_level: 10, expiry_date: '', batch_number: '' });
            fetchMedicines();
        } catch (err) { showToast(err.response?.data?.message || 'Failed to save', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this medicine?')) return;
        try {
            await API.delete(`/pharmacy/medicines/${id}`);
            showToast('Medicine deleted', 'success');
            fetchMedicines();
        } catch (err) { showToast('Failed to delete', 'error'); }
    };

    const openEdit = (med) => {
        setEditMed(med);
        setForm({ name: med.name, generic_name: med.generic_name || '', manufacturer: med.manufacturer || '', category: med.category || 'general', unit_price: med.unit_price, stock_quantity: med.stock_quantity, reorder_level: med.reorder_level, expiry_date: med.expiry_date?.split('T')[0] || '', batch_number: med.batch_number || '' });
        setShowModal(true);
    };

    const statCards = [
        { label: 'Total Medicines', value: stats.total || 0, icon: Package, color: 'bg-blue-500' },
        { label: 'Low Stock', value: stats.low_stock || 0, icon: AlertTriangle, color: 'bg-amber-500' },
        { label: 'Out of Stock', value: stats.out_of_stock || 0, icon: AlertTriangle, color: 'bg-red-500' },
        { label: 'Inventory Value', value: `₹${(stats.total_value || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Pill className="text-blue-600" /> Pharmacy Management</h1>
                <button onClick={() => { setEditMed(null); setForm({ name: '', generic_name: '', manufacturer: '', category: 'general', unit_price: 0, stock_quantity: 0, reorder_level: 10, expiry_date: '', batch_number: '' }); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={18} /> Add Medicine</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`${s.color} p-2 rounded-lg text-white`}><s.icon size={20} /></div>
                            <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-800">{s.value}</p></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded" />
                    Low stock only
                </label>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                        <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Generic</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-left">Expiry</th><th className="px-4 py-3 text-center">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {medicines.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{m.name}</td>
                                <td className="px-4 py-3 text-gray-500">{m.generic_name || '-'}</td>
                                <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{m.category}</span></td>
                                <td className="px-4 py-3 text-right">₹{Number(m.unit_price).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`font-medium ${Number(m.stock_quantity) <= Number(m.reorder_level) ? 'text-red-600' : 'text-green-600'}`}>{m.stock_quantity}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '-'}</td>
                                <td className="px-4 py-3 text-center flex justify-center gap-1">
                                    <button onClick={() => openEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={15} /></button>
                                    <button onClick={() => handleDelete(m.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                                </td>
                            </tr>
                        ))}
                        {!medicines.length && !loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No medicines found</td></tr>}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">{editMed ? 'Edit Medicine' : 'Add Medicine'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input required placeholder="Medicine Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="Generic Name" value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                <option value="general">General</option><option value="antibiotic">Antibiotic</option><option value="painkiller">Painkiller</option><option value="cardiac">Cardiac</option><option value="diabetes">Diabetes</option><option value="vitamin">Vitamin</option>
                            </select>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-xs text-gray-500">Price</label><input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">Stock</label><input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">Reorder Lvl</label><input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-gray-500">Expiry Date</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="text-xs text-gray-500">Batch #</label><input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">{editMed ? 'Update' : 'Create'} Medicine</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmacyManagement;
