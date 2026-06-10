import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { LayoutDashboard, DollarSign, CreditCard, AlertCircle, TrendingUp, FileText } from 'lucide-react';

const AccountantHome = () => {
    const [summary, setSummary] = useState({});
    const [methods, setMethods] = useState([]);
    const [recentBills, setRecentBills] = useState([]);

    const fetchData = async () => {
        try {
            const { data } = await API.get('/staff/accountant/summary');
            if (data.success) {
                setSummary(data.data.summary);
                setMethods(data.data.methodBreakdown);
                setRecentBills(data.data.recentBills);
            }
        } catch (err) { showToast('Failed to load', 'error'); }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><LayoutDashboard className="text-amber-600" /> Accountant Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-green-500 p-2 rounded-lg text-white"><DollarSign size={20} /></div><div><p className="text-xs text-gray-500">Month Revenue</p><p className="text-xl font-bold text-green-600">₹{Number(summary.month_revenue || 0).toLocaleString()}</p></div></div></div>
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-red-500 p-2 rounded-lg text-white"><AlertCircle size={20} /></div><div><p className="text-xs text-gray-500">Total Unpaid</p><p className="text-xl font-bold text-red-600">₹{Number(summary.total_unpaid || 0).toLocaleString()}</p></div></div></div>
                <div className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className="bg-blue-500 p-2 rounded-lg text-white"><TrendingUp size={20} /></div><div><p className="text-xs text-gray-500">Total Collected</p><p className="text-xl font-bold text-blue-600">₹{Number(summary.total_collected || 0).toLocaleString()}</p></div></div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <h3 className="font-bold mb-3">Payment Methods (This Month)</h3>
                    <div className="space-y-2">
                        {methods.map((m, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium capitalize">{m.payment_method || 'N/A'}</span>
                                <div className="text-right">
                                    <p className="text-sm font-bold">₹{Number(m.amount).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">{m.count} bills</p>
                                </div>
                            </div>
                        ))}
                        {!methods.length && <p className="text-gray-400 text-sm text-center py-4">No data</p>}
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <h3 className="font-bold mb-3">Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Paid Bills (Month):</span><span className="font-bold">{summary.paid_bills_this_month || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Unpaid Bills:</span><span className="font-bold text-red-600">{summary.unpaid_count || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Pharmacy Revenue (Month):</span><span className="font-bold">₹{Number(summary.pharmacy_month_revenue || 0).toLocaleString()}</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <div className="px-4 py-3 border-b"><h3 className="font-bold flex items-center gap-2"><FileText size={16} /> Recent Bills</h3></div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Bill #</th><th className="px-4 py-3 text-left">Patient</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
                    <tbody className="divide-y">
                        {recentBills.map(b => (
                            <tr key={b.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs">#{b.id}</td>
                                <td className="px-4 py-3">{b.patient_name}</td>
                                <td className="px-4 py-3 text-right font-medium">₹{Number(b.total_amount).toLocaleString()}</td>
                                <td className="px-4 py-3 capitalize text-gray-500">{b.payment_method || '-'}</td>
                                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${b.payment_status === 'paid' ? 'bg-green-50 text-green-600' : b.payment_status === 'unpaid' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>{b.payment_status}</span></td>
                                <td className="px-4 py-3 text-gray-500">{new Date(b.bill_date).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {!recentBills.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No bills</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountantHome;
