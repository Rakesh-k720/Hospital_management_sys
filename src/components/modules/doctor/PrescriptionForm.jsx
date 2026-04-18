import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Plus, Pill, Trash2, Save, Printer } from 'lucide-react';

const PrescriptionForm = () => {
    const [medicines, setMedicines] = useState([
        { name: '', dosage: '', duration: '', instructions: '' }
    ]);

    const addMedicine = () => {
        setMedicines([...medicines, { name: '', dosage: '', duration: '', instructions: '' }]);
    };

    const removeMedicine = (index) => {
        setMedicines(medicines.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Create Prescription</h2>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Printer size={16} /> Print
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-secondary-600">
                                AJ
                            </div>
                            <div>
                                <CardTitle>Alice Johnson</CardTitle>
                                <p className="text-xs text-secondary-500">24 Years • Female • ID: P-8821</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-secondary-900">Feb 14, 2024</p>
                            <p className="text-[10px] text-secondary-400 font-bold">OPD CONSULTATION</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Diagnosis / Problem" placeholder="e.g. Mild Hypertension" />
                        <Input label="Observations" placeholder="e.g. Blood pressure slightly elevated" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-sm font-bold text-secondary-900 flex items-center gap-2">
                                <Pill size={16} className="text-primary-600" />
                                Medicines & Dosage
                            </h3>
                            <Button variant="ghost" size="sm" onClick={addMedicine} className="text-primary-600 h-8">
                                <Plus size={16} /> Add Medicine
                            </Button>
                        </div>

                        {medicines.map((med, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-4 rounded-xl bg-slate-50 border border-slate-100 relative group">
                                <Input label="Medicine Name" placeholder="e.g. Paracetamol" />
                                <Input label="Dosage" placeholder="e.g. 500mg - 1-0-1" />
                                <Input label="Duration" placeholder="e.g. 5 Days" />
                                <div className="flex items-center gap-2">
                                    <Input label="Instructions" placeholder="e.g. After meal" className="flex-1" />
                                    {medicines.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeMedicine(index)}
                                            className="text-danger hover:bg-red-50 mb-0.5"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4">
                        <label className="text-sm font-medium text-secondary-700 block mb-1.5">Lab Test Requests</label>
                        <textarea
                            placeholder="List any lab tests required..."
                            className="w-full h-24 rounded-lg border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                        ></textarea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3">
                    <Button variant="outline">Save as Draft</Button>
                    <Button className="flex items-center gap-2">
                        <Save size={18} />
                        Finalize & Issue
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PrescriptionForm;
