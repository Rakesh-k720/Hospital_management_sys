import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { LayoutDashboard, Pill, Package, AlertTriangle, DollarSign } from 'lucide-react';

const PharmacistHome = () => {
    const [stats, setStats] = useState({});
    const [medicines, setMedicines] = useState([]);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const [s, m] = await Promise.all([
                API.get('/pharmacy/stats'),
                API.get('/pharmacy/medicines?low_stock=1')
            ]);
            if (s.data.success) setStats(s.data.data.summary);
            if (m.data.success) setMedicines(m.data.data.medicines);
        } catch (err) { showToast('Failed to load', 'error'); }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><LayoutDashboard className="text-purple-600" /> Pharmacist Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-purple-500 p-2 rounded-lg text-white"><Package size={20} /></div><div><p className="text-xs text-gray-500">Total Medicines</p><p className="text-xl font-bold">{stats.total_medicines || 0}</p></div></div></div>
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-amber-500 p-2 rounded-lg text-white"><AlertTriangle size={20} /></div><div><p className="text-xs text-gray-500">Low Stock</p><p className="text-xl font-bold text-amber-600">{stats.low_stock || 0}</p></div></div></div>
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-blue-500 p-2 rounded-lg text-white"><Pill size={20} /></div><div><p className="text-xs text-gray-500">Today's Orders</p><p className="text-xl font-bold">{stats.today_orders || 0}</p></div></div></div>
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-green-500 p-2 rounded-lg text-white"><DollarSign size={20} /></div><div><p className="text-xs text-gray-500">Today's Revenue</p><p className="text-xl font-bold">₹{Number(stats.today_revenue || 0).toLocaleString()}</p></div></div></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16} /> Low Stock Medicines</h3>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">Reorder Level</th><th className="px-4 py-3 text-right">Price</th></tr></thead>
                    <tbody className="divide-y">
                        {medicines.slice(0, 20).map(m => (
                            <tr key={m.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{m.name}</td>
                                <td className="px-4 py-3 text-gray-500">{m.category}</td>
                                <td className="px-4 py-3 text-right text-red-600 font-bold">{m.stock_quantity}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{m.reorder_level}</td>
                                <td className="px-4 py-3 text-right">₹{Number(m.unit_price).toFixed(2)}</td>
                            </tr>
                        ))}
                        {!medicines.length && <tr><td colSpan={5} className="text-center py-8 text-green-500">All medicines are well stocked!</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PharmacistHome;
