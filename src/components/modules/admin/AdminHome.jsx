import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { stats, recentActivity } from '../../../data/mock';
import {
    TrendingUp, TrendingDown, Users, Calendar, DollarSign,
    Bed, Activity, ShieldCheck, UserPlus, FileText, Settings,
    AlertCircle, Briefcase, Plus
} from 'lucide-react';

const AdminHome = () => {
    const iconMap = {
        'Total Patients': Users,
        'Total Doctors': Activity,
        'Today Appointments': Calendar,
        'Total Revenue': DollarSign,
        'Available Beds': Bed,
        'Waiting Patients': Users,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Hospital Administration Panel</h2>
                    <p className="text-sm text-secondary-500">System Overview & Management</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="flex items-center gap-2 border-slate-200">
                        <FileText size={18} />
                        Reports
                    </Button>
                    <Button className="flex items-center gap-2 shadow-soft">
                        <Plus size={18} />
                        New Admission
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {stats.admin.map((stat) => {
                    const Icon = iconMap[stat.label] || Activity;
                    return (
                        <Card key={stat.label} className="border-none shadow-premium bg-white">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${stat.color === 'primary' ? 'bg-primary-50 text-primary-600' :
                                            stat.color === 'success' ? 'bg-green-50 text-green-600' :
                                                stat.color === 'warning' ? 'bg-amber-50 text-amber-600' :
                                                    stat.color === 'danger' ? 'bg-red-50 text-red-600' :
                                                        'bg-blue-50 text-blue-600'
                                        }`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold">
                                        {stat.trend.startsWith('+') ? <TrendingUp size={12} className="text-success" /> : stat.trend.startsWith('-') ? <TrendingDown size={12} className="text-danger" /> : null}
                                        <span className={stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-600' : 'text-secondary-400'}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-secondary-900 font-['Outfit']">{stat.value}</p>
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider mt-1">{stat.label}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Admin Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* Recent Activity Table */}
                    <Card className="border-none shadow-premium overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-lg">System Audit Log</CardTitle>
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary-600">Export CSV</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/30">
                                    <TableRow>
                                        <TableHead className="text-[11px] font-bold uppercase text-secondary-400">Activity Type</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase text-secondary-400">Entity/Patient</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase text-secondary-400">Details</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase text-secondary-400">Status</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase text-secondary-400 text-right">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentActivity.map((activity) => (
                                        <TableRow key={activity.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="capitalize text-secondary-600 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${activity.type === 'billing' ? 'bg-primary-500' : 'bg-secondary-300'}`} />
                                                    {activity.type}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-secondary-900">{activity.patient}</TableCell>
                                            <TableCell className="text-secondary-500 text-sm">
                                                {activity.doctor || activity.room || activity.amount || activity.test}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    activity.status === 'Confirmed' || activity.status === 'Paid' || activity.status === 'Discharged' ? 'success' :
                                                        activity.status === 'Pending' ? 'warning' : 'primary'
                                                }>
                                                    {activity.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-secondary-400 text-xs text-right font-medium">{activity.time}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Infrastructure Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-premium bg-white">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Bed size={16} className="text-primary-600" />
                                    Ward Occupancy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    { ward: 'ICU / Critical Care', occupied: 12, total: 15, color: 'red' },
                                    { ward: 'General Ward - A', occupied: 45, total: 50, color: 'primary' },
                                    { ward: 'Maternity Wing', occupied: 8, total: 20, color: 'green' },
                                ].map((ward) => (
                                    <div key={ward.ward} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-secondary-700">{ward.ward}</span>
                                            <span className="text-secondary-500">{ward.occupied}/{ward.total}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-${ward.color === 'red' ? 'red-500' : ward.color === 'green' ? 'green-500' : 'primary-600'}`}
                                                style={{ width: `${(ward.occupied / ward.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-premium bg-white">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Briefcase size={16} className="text-primary-600" />
                                    Staff On-Duty
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary-600 shadow-sm">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-secondary-900">Physicians</p>
                                            <p className="text-[10px] text-secondary-500">14 Active</p>
                                        </div>
                                    </div>
                                    <Badge variant="success">92% present</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary-600 shadow-sm">
                                            <Activity size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-secondary-900">Nursing Staff</p>
                                            <p className="text-[10px] text-secondary-500">32 Active</p>
                                        </div>
                                    </div>
                                    <Badge variant="success">88% present</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <Card className="border-none shadow-premium bg-gradient-to-br from-secondary-900 to-secondary-800 text-white">
                        <CardContent className="p-6 space-y-4">
                            <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center border border-white/20">
                                <ShieldCheck size={24} className="text-primary-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-['Outfit']">Management Tools</h3>
                                <p className="text-xs text-secondary-300 mt-1">Quick access to core system settings</p>
                            </div>
                            <div className="space-y-2 pt-2">
                                <Button className="w-full bg-white text-secondary-900 hover:bg-slate-100 flex items-center justify-between px-4">
                                    <span className="text-xs font-bold">Staff Directory</span>
                                    <Users size={14} />
                                </Button>
                                <Button className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 flex items-center justify-between px-4">
                                    <span className="text-xs font-bold">Inventory Control</span>
                                    <Plus size={14} />
                                </Button>
                                <Button className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 flex items-center justify-between px-4">
                                    <span className="text-xs font-bold">Billing Settings</span>
                                    <Settings size={14} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="text-warning" />
                                Action Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 rounded-xl border border-warning-100 bg-warning-50/20">
                                <p className="text-xs font-bold text-secondary-900">Bed Limit Alert</p>
                                <p className="text-[10px] text-secondary-500 mt-1">ICU Ward is reaching 90% capacity. Please review admissions.</p>
                            </div>
                            <div className="p-3 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-secondary-900">Stock Low: Paracetamol</p>
                                <p className="text-[10px] text-secondary-500 mt-1">Current inventory for Pharmacy A-1 below threshold.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;

