import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { Bed, User, Waves, Trash2 } from 'lucide-react';

const BedManagement = () => {
    const wards = [
        { name: 'General Ward A', total: 20, occupied: 15, type: 'General' },
        { name: 'General Ward B', total: 20, occupied: 12, type: 'General' },
        { name: 'ICU Unit', total: 10, occupied: 8, type: 'Critical' },
        { name: 'Pediatric Ward', total: 15, occupied: 5, type: 'Specialized' },
    ];

    const beds = Array.from({ length: 12 }, (_, i) => ({
        id: 101 + i,
        status: i < 5 ? 'Occupied' : i < 8 ? 'Available' : 'Cleaning',
        patient: i < 5 ? 'Patient ' + (i + 1) : null
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Bed & Ward Management</h2>
                    <p className="text-sm text-secondary-500">Real-time bed availability and allocation</p>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                    <Bed size={18} />
                    Add Ward
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {wards.map((ward) => (
                    <Card key={ward.name}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-secondary-400 uppercase tracking-tighter">{ward.type}</span>
                                <Badge variant={ward.occupied / ward.total > 0.8 ? 'danger' : 'primary'}>
                                    {Math.round((ward.occupied / ward.total) * 100)}% Full
                                </Badge>
                            </div>
                            <h3 className="font-bold text-secondary-900">{ward.name}</h3>
                            <div className="mt-4 flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-secondary-900">{ward.total - ward.occupied}</p>
                                    <p className="text-xs text-secondary-500">Available Beds</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-secondary-700">{ward.occupied} / {ward.total}</p>
                                    <p className="text-[10px] text-secondary-400">Total Capacity</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ward Layout - ICU Unit</CardTitle>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs text-secondary-600">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-danger"></div>
                            <span className="text-xs text-secondary-600">Occupied</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-warning"></div>
                            <span className="text-xs text-secondary-600">Cleaning</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {beds.map((bed) => (
                            <div
                                key={bed.id}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${bed.status === 'Occupied' ? 'bg-red-50 border-red-100 text-red-700' :
                                        bed.status === 'Available' ? 'bg-green-50 border-green-100 text-green-700' :
                                            'bg-yellow-50 border-yellow-100 text-yellow-700'
                                    }`}
                            >
                                <Bed size={24} />
                                <div>
                                    <p className="text-xs font-bold uppercase">Bed {bed.id}</p>
                                    <p className="text-[10px] opacity-80">{bed.patient || (bed.status === 'Cleaning' ? 'Maintenance' : 'Ready')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BedManagement;
