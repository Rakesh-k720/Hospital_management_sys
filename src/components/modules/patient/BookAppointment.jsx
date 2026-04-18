import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Calendar, ChevronRight, Check } from 'lucide-react';

const BookAppointment = () => {
    const [step, setStep] = useState(1);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Book Appointment</h2>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${step >= s ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                    ))}
                </div>
            </div>

            <Card>
                {step === 1 && (
                    <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-8">
                            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Step 1</p>
                            <h3 className="text-xl font-bold text-secondary-900">Select Department & Doctor</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-secondary-700">Medical Department</label>
                                <select
                                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="Pediatrics">Pediatrics</option>
                                    <option value="Orthopedics">Orthopedics</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-secondary-700">Specialist Doctor</label>
                                <select className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                                    <option value="">Select Doctor</option>
                                    <option value="1">Dr. Sarah Connor (Available Today)</option>
                                    <option value="2">Dr. James Smith (Available Tomorrow)</option>
                                </select>
                            </div>

                            <div className="pt-4">
                                <Button
                                    className="w-full py-6 text-base flex items-center justify-center gap-2 group"
                                    onClick={() => setStep(2)}
                                    disabled={!selectedDept}
                                >
                                    Next Step
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}

                {step === 2 && (
                    <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-8">
                            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Step 2</p>
                            <h3 className="text-xl font-bold text-secondary-900">Choose Date & Time</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p className="text-sm font-bold text-secondary-900 mb-2">Select Date</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <button
                                            key={i}
                                            className={`p-2 h-14 rounded-xl border flex flex-col items-center justify-center transition-all ${i === 2 ? 'bg-primary-600 border-primary-600 text-white shadow-soft ring-2 ring-primary-100' : 'bg-white border-slate-100 text-secondary-600 hover:border-primary-200'
                                                }`}
                                        >
                                            <span className="text-[10px] uppercase font-bold opacity-70">FEB</span>
                                            <span className="text-sm font-bold">{14 + i}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-bold text-secondary-900 mb-2">Available Slots</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM'].map((slot, i) => (
                                        <button
                                            key={i}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${i === 1 ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' : 'bg-white border-slate-100 text-secondary-600 hover:border-slate-200'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                            <Button className="flex-[2]" onClick={() => setStep(3)}>Confirm Selection</Button>
                        </div>
                    </CardContent>
                )}

                {step === 3 && (
                    <CardContent className="p-12 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-bold text-secondary-900 mb-2">Appointment Scheduled!</h3>
                        <p className="text-secondary-500 mb-8 max-w-sm mx-auto">
                            Your appointment with <span className="text-secondary-900 font-bold">Dr. Sarah Connor</span> is confirmed for <span className="text-secondary-900 font-bold">Feb 16 at 10:30 AM</span>.
                        </p>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left mb-8">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-secondary-400 uppercase">Token Number</span>
                                <span className="text-xs font-bold text-primary-600">CONFIRMED</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-secondary-900 font-mono">APP-2402-01</p>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-secondary-900">Room 304</p>
                                    <p className="text-[10px] text-secondary-500 uppercase">South Wing</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1">Add to Calendar</Button>
                            <Button className="flex-1" onClick={() => setStep(1)}>Go to Portal</Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default BookAppointment;
