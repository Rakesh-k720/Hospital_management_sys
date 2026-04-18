import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import { doctors } from '../../../data/mock';
import { Plus, Search, MoreVertical, Filter } from 'lucide-react';

const DoctorManagement = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Doctors Management</h2>
                    <p className="text-sm text-secondary-500">Manage hospital medical staff and their schedules</p>
                </div>
                <Button className="flex items-center gap-2">
                    <Plus size={18} />
                    Add New Doctor
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full max-w-sm">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or specialty..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter size={18} />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-secondary-500 font-medium">Total: {doctors.length} Doctors</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Doctor Name</TableHead>
                                <TableHead>Specialization</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {doctors.map((doctor) => (
                                <TableRow key={doctor.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">
                                                {doctor.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span className="font-bold text-secondary-900">{doctor.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-secondary-600">{doctor.specialization}</TableCell>
                                    <TableCell className="text-secondary-500 font-mono text-xs">{doctor.contact}</TableCell>
                                    <TableCell>
                                        <Badge variant={doctor.status === 'Active' ? 'success' : 'secondary'}>
                                            {doctor.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorManagement;
