import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { Shield, Plus, FileText, CheckCircle, XCircle, Clock, DollarSign, Building2, X } from 'lucide-react';

const InsuranceManagement = () => {
    const [tab, setTab] = useState('claims');
    const [claims, setClaims] = useState([]);
    const [providers, setProviders] = useState([]);
    const [stats, setStats] = useState({});
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [providerForm, setProviderForm] = useState({ name: '', tpa_name: '', contact_email: '', contact_phone: '', address: '' });
    const [claimForm, setClaimForm] = useState({ bill_id: '', patient_id: '', provider_id: '', claimed_amount: '', notes: '' });

    const fetchData = async () => {
        try {
            const [c, p, s] = await Promise.all([
                API.get('/insurance/claims'),
                API.get('/insurance/providers'),
                API.get('/insurance/stats')
            ]);
            if (c.data.success) setClaims(c.data.data);
            if (p.data.success) setProviders(p.data.data);
            if (s.data.success) setStats(s.data.data);
        } catch (err) { showToast('Failed to load data', 'error'); }
    };

    useEffect(() => { fetchData(); }, []);

    const createProvider = async (e) => {
        e.preventDefault();
        try {
            await API.post('/insurance/providers', providerForm);
            showToast('Provider added', 'success');
            setShowProviderModal(false);
            setProviderForm({ name: '', tpa_name: '', contact_email: '', contact_phone: '', address: '' });
            fetchData();
        } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    };

    const createClaim = async (e) => {
        e.preventDefault();
        try {
            await API.post('/insurance/claims', claimForm);
            showToast('Claim created', 'success');
            setShowClaimModal(false);
            setClaimForm({ bill_id: '', patient_id: '', provider_id: '', claimed_amount: '', notes: '' });
            fetchData();
        } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    };

    const updateClaimStatus = async (id, status) => {
        try {
            await API.patch(`/insurance/claims/${id}/status`, { status });
            showToast(`Claim ${status}`, 'success');
            fetchData();
        } catch (err) { showToast('Failed to update', 'error'); }
    };

    const statusColors = { pending: 'bg-yellow-50 text-yellow-700', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700', partially_approved: 'bg-orange-50 text-orange-700' };

    const statCards = [
        { label: 'Total Claims', value: stats.stats?.total_claims || 0, icon: FileText, color: 'bg-blue-500' },
        { label: 'Pending', value: stats.stats?.pending_claims || 0, icon: Clock, color: 'bg-yellow-500' },
        { label: 'Total Claimed', value: `₹${(stats.stats?.total_claimed || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500' },
        { label: 'Total Approved', value: `₹${(stats.stats?.total_approved || 0).toLocaleString()}`, icon: CheckCircle, color: 'bg-green-500' },
    ];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Shield className="text-blue-600" /> Insurance & TPA Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm border"><div className="flex items-center gap-3"><div className={`${s.color} p-2 rounded-lg text-white`}><s.icon size={20} /></div><div><p className="text-xs text-gray-500">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div></div></div>
                ))}
            </div>

            <div className="flex gap-2 border-b border-gray-200">
                {[{ id: 'claims', label: 'Claims' }, { id: 'providers', label: 'Providers' }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{t.label}</button>
                ))}
            </div>

            {tab === 'claims' && (
                <div className="space-y-4">
                    <button onClick={() => setShowClaimModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700"><Plus size={16} /> New Claim</button>
                    <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Claim #</th><th className="px-4 py-3 text-left">Patient</th><th className="px-4 py-3 text-left">Provider</th><th className="px-4 py-3 text-right">Claimed</th><th className="px-4 py-3 text-right">Approved</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                            <tbody className="divide-y">
                                {claims.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs">{c.claim_number}</td>
                                        <td className="px-4 py-3">{c.patient_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.provider_name}</td>
                                        <td className="px-4 py-3 text-right font-medium">₹{Number(c.claimed_amount).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-green-600">₹{Number(c.approved_amount || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ''}`}>{c.status}</span></td>
                                        <td className="px-4 py-3 text-center">
                                            <select onChange={(e) => updateClaimStatus(c.id, e.target.value)} value="" className="text-xs border rounded px-2 py-1">
                                                <option value="">Change...</option>
                                                <option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="partially_approved">Partial</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                                {!claims.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No claims found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'providers' && (
                <div className="space-y-4">
                    <button onClick={() => setShowProviderModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700"><Plus size={16} /> Add Provider</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.map(p => (
                            <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border">
                                <div className="flex items-start gap-3">
                                    <Building2 className="text-blue-500 mt-1" size={20} />
                                    <div>
                                        <h3 className="font-bold">{p.name}</h3>
                                        {p.tpa_name && <p className="text-xs text-gray-500">TPA: {p.tpa_name}</p>}
                                        <p className="text-xs text-gray-500">{p.contact_email} | {p.contact_phone}</p>
                                        <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!providers.length && <p className="text-gray-400 col-span-2 text-center py-8">No providers</p>}
                    </div>
                </div>
            )}

            {showProviderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Add Insurance Provider</h2><button onClick={() => setShowProviderModal(false)}><X size={20} /></button></div>
                        <form onSubmit={createProvider} className="space-y-3">
                            <input required placeholder="Company Name *" value={providerForm.name} onChange={(e) => setProviderForm({...providerForm, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="TPA Name" value={providerForm.tpa_name} onChange={(e) => setProviderForm({...providerForm, tpa_name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input type="email" placeholder="Email" value={providerForm.contact_email} onChange={(e) => setProviderForm({...providerForm, contact_email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input placeholder="Phone" value={providerForm.contact_phone} onChange={(e) => setProviderForm({...providerForm, contact_phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <textarea placeholder="Address" value={providerForm.address} onChange={(e) => setProviderForm({...providerForm, address: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">Add Provider</button>
                        </form>
                    </div>
                </div>
            )}

            {showClaimModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Create Insurance Claim</h2><button onClick={() => setShowClaimModal(false)}><X size={20} /></button></div>
                        <form onSubmit={createClaim} className="space-y-3">
                            <input required type="number" placeholder="Bill ID *" value={claimForm.bill_id} onChange={(e) => setClaimForm({...claimForm, bill_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <input required type="number" placeholder="Patient ID *" value={claimForm.patient_id} onChange={(e) => setClaimForm({...claimForm, patient_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <select required value={claimForm.provider_id} onChange={(e) => setClaimForm({...claimForm, provider_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                                <option value="">Select Provider *</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input required type="number" step="0.01" placeholder="Claimed Amount *" value={claimForm.claimed_amount} onChange={(e) => setClaimForm({...claimForm, claimed_amount: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            <textarea placeholder="Notes" value={claimForm.notes} onChange={(e) => setClaimForm({...claimForm, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">Create Claim</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InsuranceManagement;
