import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import { stats } from '../../../data/mock';
import {
    Calendar, Ticket, CreditCard, ClipboardCheck, ArrowRight,
    Download, Heart, Activity, Clock, ShieldAlert,
    History, MapPin, FileHeart
} from 'lucide-react';
import Button from '../../ui/Button';
import { Link } from 'react-router-dom';

const PatientHome = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Patient Health Portal</h2>
                    <p className="text-sm text-secondary-500">Welcome Back | Patient ID: #P-8821</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/patient/reports">
                        <Button variant="outline" className="flex items-center gap-2 border-slate-200">
                            <History size={18} />
                            Medical Records
                        </Button>
                    </Link>
                    <Link to="/patient/book">
                        <Button className="flex items-center gap-2 shadow-soft bg-primary-600 hover:bg-primary-700">
                            <Calendar size={18} />
                            Book Appointment
                        </Button>
                    </Link>
                </div>
            </div>

            {/* health Vitials Brief */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Blood Group', value: 'B+ Positive', icon: Heart, color: 'red' },
                    { label: 'Height / Weight', value: '175cm / 72kg', icon: Activity, color: 'primary' },
                    { label: 'Next Appointment', value: 'Tomorrow 10 AM', icon: Clock, color: 'amber' },
                    { label: 'Insurance Status', value: 'Active / Premium', icon: ShieldAlert, color: 'green' },
                ].map((item) => (
                    <Card key={item.label} className="border-none shadow-premium bg-white">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-2xl bg-${item.color === 'red' ? 'red-50 text-red-500' : item.color === 'primary' ? 'primary-50 text-primary-600' : item.color === 'amber' ? 'amber-50 text-amber-600' : 'green-50 text-green-600'}`}>
                                <item.icon size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                                <p className="text-sm font-bold text-secondary-900 font-['Outfit']">{item.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Consultations/Appointments */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-50">
                            <CardTitle className="text-lg">My Appointments</CardTitle>
                            <button className="text-xs text-primary-600 font-bold hover:underline">View History</button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {[
                                    { doctor: 'Dr. Sarah Connor', specialty: 'Cardiology', date: 'Tomorrow', time: '10:00 AM', status: 'Confirmed', room: 'Room 204 | 2nd Floor' },
                                    { doctor: 'Dr. James Smith', specialty: 'Neurology', date: 'Feb 20', time: '02:30 PM', status: 'Pending', room: 'OPD Complex | Ground Floor' },
                                ].map((appt, i) => (
                                    <div key={i} className="p-5 hover:bg-slate-50 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary-50 p-3 rounded-2xl text-primary-600 group-hover:bg-white transition-colors shadow-sm">
                                                    <Calendar size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-900">{appt.doctor}</p>
                                                    <p className="text-xs text-secondary-500 mb-1">{appt.specialty}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-secondary-400 font-medium">
                                                        <MapPin size={10} /> {appt.room}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-secondary-900">{appt.date}</p>
                                                <p className="text-[10px] text-secondary-400 font-bold uppercase">{appt.time}</p>
                                                <Badge variant={appt.status === 'Confirmed' ? 'success' : 'warning'} className="mt-2">{appt.status}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lab Archives */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-4 border-b border-slate-50">
                            <CardTitle className="text-lg">Lab Reports & Downloads</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { test: 'Full Body Checkup', date: 'Feb 10, 2024', size: '1.2 MB' },
                                { test: 'Blood Glucose History', date: 'Jan 28, 2024', size: '450 KB' },
                            ].map((report, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-primary-100 hover:bg-primary-50/10 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-50 p-2.5 rounded-xl text-secondary-500">
                                            <ClipboardCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-secondary-900">{report.test}</p>
                                            <p className="text-[10px] text-secondary-400 font-bold">{report.date} • {report.size}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-600 hover:bg-primary-50">
                                        <Download size={16} />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Financial Summary */}
                    <Card className="border-none shadow-premium bg-gradient-to-br from-primary-700 to-primary-600 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <CreditCard size={120} />
                        </div>
                        <CardContent className="p-6 relative">
                            <p className="text-xs font-bold text-primary-100 uppercase tracking-widest mb-1">Billing Summary</p>
                            <h3 className="text-3xl font-bold font-['Outfit'] mb-6">$120.40</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs pb-3 border-b border-white/20">
                                    <span className="text-primary-100">Pending Payments</span>
                                    <span className="font-bold">01 Invoice</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-primary-100">Last Payment</span>
                                    <span className="font-bold">Feb 12, 2024</span>
                                </div>
                            </div>
                            <Button className="w-full mt-6 bg-white text-primary-600 hover:bg-primary-50 font-bold py-2.5 text-xs shadow-soft rounded-xl">
                                Pay Outstanding Bill
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Emergency Contacts */}
                    <Card className="border-none shadow-premium">
                        <CardHeader className="py-4 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShieldAlert size={16} className="text-red-500" />
                                Support & Help
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-bold text-secondary-400 uppercase mb-1">Assigned Case Manager</p>
                                <p className="text-sm font-bold text-secondary-900">Dr. Robert Downey</p>
                                <p className="text-xs text-primary-600 font-medium mt-1 hover:underline cursor-pointer">Start Chat Support</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100">
                                <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Emergency Helpline</p>
                                <p className="text-sm font-bold text-red-600">+1 (800) 999 000</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PatientHome;

