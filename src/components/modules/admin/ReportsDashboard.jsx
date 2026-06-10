import { useState, useEffect } from 'react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { BarChart3, TrendingUp, Users, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ReportsDashboard = () => {
    const [tab, setTab] = useState('department');
    const [deptData, setDeptData] = useState([]);
    const [demoData, setDemoData] = useState({});
    const [doctorData, setDoctorData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [customReport, setCustomReport] = useState(null);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [loading, setLoading] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [d, demo, doc, m] = await Promise.all([
                API.get('/reports/department-revenue'),
                API.get('/reports/demographics'),
                API.get('/reports/doctor-performance'),
                API.get('/reports/monthly-comparison')
            ]);
            if (d.data.success) setDeptData(d.data.data);
            if (demo.data.success) setDemoData(demo.data.data);
            if (doc.data.success) setDoctorData(doc.data.data);
            if (m.data.success) setMonthlyData(m.data.data);
        } catch (err) { showToast('Failed to load reports', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const fetchCustomReport = async () => {
        if (!dateRange.from || !dateRange.to) { showToast('Select date range', 'error'); return; }
        try {
            const { data } = await API.get(`/reports/custom?from=${dateRange.from}&to=${dateRange.to}`);
            if (data.success) setCustomReport(data.data);
        } catch (err) { showToast('Failed', 'error'); }
    };

    const tabs = [
        { id: 'department', label: 'Department Revenue', icon: BarChart3 },
        { id: 'demographics', label: 'Demographics', icon: Users },
        { id: 'doctors', label: 'Doctor Performance', icon: TrendingUp },
        { id: 'monthly', label: 'Monthly Trends', icon: Calendar },
        { id: 'custom', label: 'Custom Report', icon: Filter },
    ];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="text-blue-600" /> Reports Dashboard</h1>

            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <t.icon size={16} className="inline mr-1" />{t.label}
                    </button>
                ))}
            </div>

            {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : (
                <>
                    {tab === 'department' && (
                        <div className="bg-white rounded-xl p-6 shadow-sm border">
                            <h3 className="font-bold mb-4">Department-wise Revenue (Last 6 Months)</h3>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={deptData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="department" tick={{ fontSize: 12 }} /><YAxis /><Tooltip /><Bar dataKey="total_appointments" fill="#3B82F6" name="Appointments" /><Bar dataKey="completed" fill="#10B981" name="Completed" /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {tab === 'demographics' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <h3 className="font-bold mb-4">Gender Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart><Pie data={demoData.genderDist || []} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={100} label>{(entry) => entry.gender}</Pie><Tooltip /><Legend /></PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <h3 className="font-bold mb-4">Age Groups</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={demoData.ageGroups || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="age_group" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#8B5CF6" /></BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm border md:col-span-2">
                                <h3 className="font-bold mb-4">Blood Group Distribution</h3>
                                <div className="flex flex-wrap gap-4">
                                    {(demoData.bloodGroups || []).map(bg => (
                                        <div key={bg.blood_group} className="bg-red-50 px-4 py-2 rounded-lg"><span className="font-bold text-red-700">{bg.blood_group}</span>: {bg.count}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'doctors' && (
                        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Doctor</th><th className="px-4 py-3 text-left">Department</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Completed</th><th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Est. Revenue</th></tr></thead>
                                <tbody className="divide-y">
                                    {doctorData.map(d => (
                                        <tr key={d.doctor_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{d.doctor_name}</td>
                                            <td className="px-4 py-3 text-gray-500">{d.department || '-'}</td>
                                            <td className="px-4 py-3 text-right">{d.total_appointments}</td>
                                            <td className="px-4 py-3 text-right text-green-600">{d.completed || 0}</td>
                                            <td className="px-4 py-3 text-right"><span className={`px-2 py-0.5 rounded-full text-xs ${Number(d.completion_rate) > 70 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{d.completion_rate || 0}%</span></td>
                                            <td className="px-4 py-3 text-right font-medium">₹{Number(d.estimated_revenue || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'monthly' && (
                        <div className="bg-white rounded-xl p-6 shadow-sm border">
                            <h3 className="font-bold mb-4">Monthly Trends (Last 6 Months)</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="opd_count" stroke="#3B82F6" name="OPD" strokeWidth={2} /><Line type="monotone" dataKey="ipd_count" stroke="#10B981" name="IPD" strokeWidth={2} /><Line type="monotone" dataKey="revenue" stroke="#F59E0B" name="Revenue" strokeWidth={2} /></LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {tab === 'custom' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <h3 className="font-bold mb-4">Custom Date Range Report</h3>
                                <div className="flex gap-4 items-end">
                                    <div><label className="text-xs text-gray-500">From</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="block border rounded-lg px-3 py-2 text-sm" /></div>
                                    <div><label className="text-xs text-gray-500">To</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="block border rounded-lg px-3 py-2 text-sm" /></div>
                                    <button onClick={fetchCustomReport} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Generate</button>
                                </div>
                            </div>
                            {customReport && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border">
                                        <h3 className="font-bold mb-3">Appointment Stats</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-bold">{customReport.appointmentStats?.total}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Completed:</span><span className="font-bold text-green-600">{customReport.appointmentStats?.completed}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Cancelled:</span><span className="font-bold text-red-600">{customReport.appointmentStats?.cancelled}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Pending:</span><span className="font-bold text-yellow-600">{customReport.appointmentStats?.pending}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl p-6 shadow-sm border">
                                        <h3 className="font-bold mb-3">Billing Stats</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Total Bills:</span><span className="font-bold">{customReport.billingStats?.total_bills}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Collected:</span><span className="font-bold text-green-600">₹{Number(customReport.billingStats?.collected || 0).toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Pending:</span><span className="font-bold text-red-600">₹{Number(customReport.billingStats?.pending_amount || 0).toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportsDashboard;
