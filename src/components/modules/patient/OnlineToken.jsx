import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Button from '../../ui/Button';
import { Ticket, Users, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import Badge from '../../ui/Badge';

const OnlineToken = () => {
    const [isGenerated, setIsGenerated] = useState(false);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">OPD Digital Parchi</h2>
                <Badge variant="info" className="animate-pulse">Live Queue Tracking Enabled</Badge>
            </div>

            {!isGenerated ? (
                <Card className="overflow-hidden border-none shadow-premium">
                    <div className="bg-primary-600 p-8 text-white text-center">
                        <Ticket size={48} className="mx-auto mb-4 opacity-80" />
                        <h3 className="text-xl font-bold">Generate OPD Token</h3>
                        <p className="text-primary-100 text-sm mt-2">Skip the physical queue, get your token online.</p>
                    </div>
                    <CardContent className="p-8 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-secondary-700">Select Department</label>
                            <select className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none">
                                <option>General Medicine</option>
                                <option>Pediatrics</option>
                                <option>Orthopedics</option>
                                <option>Dermatology</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-secondary-700">Primary Complaint</label>
                            <textarea
                                className="w-full h-24 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                                placeholder="Briefly describe your health issue..."
                            ></textarea>
                        </div>
                        <Button
                            className="w-full py-6 rounded-xl text-lg font-bold shadow-lg shadow-primary-500/30"
                            onClick={() => setIsGenerated(true)}
                        >
                            Generate Token
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <Card className="border-2 border-primary-500 shadow-premium overflow-hidden bg-primary-50/10">
                        <div className="p-1 px-4 bg-primary-500 text-white text-[10px] font-bold text-center uppercase tracking-widest">
                            Official Digital Parchi
                        </div>
                        <CardContent className="p-0">
                            <div className="p-8 border-b border-dashed border-slate-300 relative">
                                {/* Punched holes effect */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-r border-slate-200"></div>
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-l border-slate-200"></div>

                                <div className="text-center">
                                    <p className="text-xs font-medium text-secondary-500 uppercase tracking-widest mb-1">Your Token Number</p>
                                    <p className="text-6xl font-black text-secondary-900 font-['Outfit']">T-102</p>
                                    <Badge variant="success" className="mt-4 px-4 py-1">ACTIVE</Badge>
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Users size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Queue Position</p>
                                            <p className="text-sm font-bold text-secondary-900">3rd in line</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Est. Wait Time</p>
                                            <p className="text-sm font-bold text-secondary-900">~15 Mins</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Room Number</p>
                                            <p className="text-sm font-bold text-secondary-900">Room 204</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 size={18} className="text-primary-600 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Department</p>
                                            <p className="text-sm font-bold text-secondary-900">General Med</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-secondary-500">P{i}</div>
                                ))}
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600">+12</div>
                            </div>
                            <p className="text-xs text-secondary-500">Waiting in gallery</p>
                        </div>
                    </Card>

                    <div className="flex gap-4">
                        <Button variant="outline" className="flex-1">Download PDF</Button>
                        <Button className="flex-1" onClick={() => setIsGenerated(false)}>Cancel Token</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnlineToken;
