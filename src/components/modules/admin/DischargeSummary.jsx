import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import { Printer, Download, Mail, CheckCircle2 } from 'lucide-react';
import Badge from '../../ui/Badge';

const DischargeSummary = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Discharge Patient</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Mail size={16} /> Email
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download size={16} /> Download
                    </Button>
                    <Button variant="primary" size="sm" className="flex items-center gap-2">
                        <Printer size={16} /> Print
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-premium bg-white print:shadow-none">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-soft">
                                H
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-secondary-900">LifeLine Hospital</h1>
                                <p className="text-sm text-secondary-500">123 Health Ave, Medical District</p>
                            </div>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Discharge ID</p>
                            <p className="text-xl font-bold text-secondary-900">DS-2024-8821</p>
                            <Badge variant="success" className="mt-2">CLEARED</Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-8">
                    {/* Patient & Stay Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-100">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Patient Name</p>
                            <p className="text-sm font-bold text-secondary-900">Alice Johnson</p>
                            <p className="text-xs text-secondary-500">24Y / Female / ID: P-8821</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Stay Duration</p>
                            <p className="text-sm font-bold text-secondary-900">Feb 10 - Feb 14 (4 Days)</p>
                            <p className="text-xs text-secondary-500">Ward: General-B, Bed 104</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">Admitting Doctor</p>
                            <p className="text-sm font-bold text-secondary-900">Dr. Sarah Connor</p>
                            <p className="text-xs text-secondary-500">Cardiology Specialist</p>
                        </div>
                    </div>

                    {/* Medical Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider border-l-4 border-primary-600 pl-3">Medical Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-secondary-600">Diagnosis</p>
                                <p className="text-sm text-secondary-700 leading-relaxed italic">
                                    Patient was admitted with acute chest pain and palpitations. Diagnosed with mild arrhythmia and hypertension.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-secondary-600">Treatment Provided</p>
                                <ul className="text-sm text-secondary-700 space-y-1 list-disc list-inside">
                                    <li>IV fluids for stabilization</li>
                                    <li>Beta-blockers therapy started</li>
                                    <li>Cardiac monitoring for 48 hours</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Medications */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider border-l-4 border-success pl-3">Discharge Medications</h3>
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                            <table className="w-full text-sm">
                                <thead className="text-left">
                                    <tr>
                                        <th className="pb-3 text-secondary-400 text-xs font-bold uppercase">Medicine</th>
                                        <th className="pb-3 text-secondary-400 text-xs font-bold uppercase">Dosage</th>
                                        <th className="pb-3 text-secondary-400 text-xs font-bold uppercase">Instructions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-secondary-900 font-medium">
                                    <tr className="border-t border-slate-100">
                                        <td className="py-3">Atenolol 50mg</td>
                                        <td className="py-3">1 - 0 - 0</td>
                                        <td className="py-3 text-secondary-500">After breakfast, 30 days</td>
                                    </tr>
                                    <tr className="border-t border-slate-100">
                                        <td className="py-3">Atorvastatin 10mg</td>
                                        <td className="py-3">0 - 0 - 1</td>
                                        <td className="py-3 text-secondary-500">Before bed, 60 days</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Final Billing */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider border-l-4 border-warning pl-3">Billing Summary</h3>
                        <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-900 text-white rounded-2xl p-8 shadow-lg">
                            <div className="space-y-3">
                                <div className="flex gap-12">
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">Room Charges</p>
                                        <p className="text-lg font-bold">$1,200.00</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">Medication</p>
                                        <p className="text-lg font-bold">$340.50</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">Lab/Services</p>
                                        <p className="text-lg font-bold">$850.00</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-2 text-success">
                                        <CheckCircle2 size={16} />
                                        <span className="text-xs font-bold uppercase">Payment Status: FULLY PAID VIA INSURANCE</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Total Amount Payable</p>
                                <p className="text-5xl font-black font-['Outfit'] text-primary-400">$2,390.50</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DischargeSummary;
