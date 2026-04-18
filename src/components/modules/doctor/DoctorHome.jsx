import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import { stats, opdQueue } from '../../../data/mock';
import {
    Calendar, Users, Clock, AlertCircle, Plus,
    FileText, UserRound, Search, Video,
    ClipboardCheck, Activity, Pill
} from 'lucide-react';
import Button from '../../ui/Button';

const DoctorHome = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Clinical Practice Panel</h2>
                    <p className="text-sm text-secondary-500">Dr. Sarah Connor | Cardiology Department</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="flex items-center gap-2 border-slate-200">
                        <Calendar size={18} />
                        My Schedule
                    </Button>
                    <Button className="flex items-center gap-2 shadow-soft bg-primary-600 hover:bg-primary-700">
                        <Video size={18} />
                        Start Online Consult
                    </Button>
                </div>
            </div>

            {/* Practical Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.doctor.map((stat) => (
                    <Card key={stat.label} className="border-none shadow-premium bg-white">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold text-secondary-900 font-['Outfit']">{stat.value}</p>
                                <p className={`text-[10px] font-bold mt-1 ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-secondary-400'}`}>
                                    {stat.trend} since yesterday
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.color === 'primary' ? 'bg-primary-50 text-primary-600' :
                                    stat.color === 'success' ? 'bg-green-50 text-green-600' :
                                        stat.color === 'warning' ? 'bg-amber-50 text-amber-600' :
                                            'bg-red-50 text-red-600'
                                }`}>
                                {stat.label.includes('Patients') ? <Users size={20} /> : stat.label.includes('Wait') ? <Clock size={20} /> : <Activity size={20} />}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-premium">
                    <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-50">
                        <div>
                            <CardTitle className="text-lg">Live OPD Queue</CardTitle>
                            <p className="text-[10px] text-secondary-400 font-bold uppercase mt-0.5">Currently Processing Token #T-101</p>
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                            <input
                                type="text"
                                placeholder="Search token/name..."
                                className="pl-9 pr-4 py-1.5 bg-slate-50 border-none rounded-lg text-xs w-40 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {[
                                { token: 'T-102', patient: 'Alice Johnson', age: 34, reason: 'Routine Checkup', type: 'Offline', status: 'Next' },
                                { token: 'T-103', patient: 'Bob Wilson', age: 45, reason: 'Post-Surgery Follow-up', type: 'Online', status: 'Waiting' },
                                { token: 'T-104', patient: 'Charlie Brown', age: 29, reason: 'Chest Discomfort', type: 'Offline', status: 'Arrived' },
                            ].map((appt, i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-primary-50/20 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-100 p-2.5 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <p className="text-xs font-bold text-secondary-900">{appt.token}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-secondary-900">{appt.patient}</p>
                                                <span className="text-[10px] text-secondary-400 font-medium">({appt.age} Yrs)</span>
                                            </div>
                                            <p className="text-xs text-secondary-500 mt-0.5">{appt.reason}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={appt.type === 'Emergency' ? 'danger' : appt.type === 'Online' ? 'info' : 'secondary'}>
                                            {appt.type}
                                        </Badge>
                                        <Button size="sm" className="h-8 px-4 text-xs font-bold rounded-lg shadow-sm">Call Patient</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full text-[10px] font-bold py-3 text-secondary-400 hover:text-primary-600 transition-colors uppercase gap-1">
                            Load Full Queue <Plus size={12} />
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-premium bg-white">
                        <CardHeader className="py-4 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ClipboardCheck size={16} className="text-primary-600" />
                                Patient Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <Button className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-primary-50 text-secondary-900 border-none group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white group-hover:text-primary-600 transition-colors shadow-sm">
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-xs font-bold">Write Prescription</span>
                                </div>
                                <Plus size={14} className="text-secondary-400" />
                            </Button>
                            <Button className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-primary-50 text-secondary-900 border-none group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white group-hover:text-primary-600 transition-colors shadow-sm">
                                        <Activity size={16} />
                                    </div>
                                    <span className="text-xs font-bold">Order Lab Test</span>
                                </div>
                                <Plus size={14} className="text-secondary-400" />
                            </Button>
                            <Button className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-primary-50 text-secondary-900 border-none group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white group-hover:text-primary-600 transition-colors shadow-sm">
                                        <Pill size={16} />
                                    </div>
                                    <span className="text-xs font-bold">Pharmacy Request</span>
                                </div>
                                <Plus size={14} className="text-secondary-400" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-premium bg-white">
                        <CardHeader className="py-4 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="text-warning" />
                                Reporting & Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {[
                                { label: 'In-Patient Rounds', count: 3, priority: 'High' },
                                { label: 'Medication Reviews', count: 5, priority: 'Medium' },
                                { label: 'Discharge Summaries', count: 2, priority: 'Pending' },
                            ].map((task, i) => (
                                <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 hover:border-primary-100 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'High' ? 'bg-red-500' : 'bg-primary-500'}`} />
                                        <p className="text-xs font-bold text-secondary-900">{task.label}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] min-w-[30px] justify-center">{task.count}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DoctorHome;

