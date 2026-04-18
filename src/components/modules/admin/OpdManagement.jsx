import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { opdQueue } from '../../../data/mock';
import { Ticket, Users, Clock, ArrowRight } from 'lucide-react';

const OpdManagement = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">OPD Queue Management</h2>
                    <p className="text-sm text-secondary-500">Monitor and manage live patient tokens</p>
                </div>
                <Button className="flex items-center gap-2">
                    <Ticket size={18} />
                    Generate New Token
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary-600 text-white border-none">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Total in Queue</p>
                                <p className="text-3xl font-bold">18 Patients</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-success text-white border-none">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Avg Wait Time</p>
                                <p className="text-3xl font-bold">24 Mins</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500 text-white border-none">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Ticket size={24} />
                            </div>
                            <div>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Active Tokens</p>
                                <p className="text-3xl font-bold">12 Active</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Live Token Board</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Token No</TableHead>
                                <TableHead>Patient Name</TableHead>
                                <TableHead>Assigned Doctor</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {opdQueue.map((item) => (
                                <TableRow key={item.token}>
                                    <TableCell>
                                        <span className="bg-slate-100 px-2 py-1 rounded font-mono font-bold text-secondary-700">
                                            {item.token}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-bold text-secondary-900">{item.patient}</TableCell>
                                    <TableCell className="text-secondary-600">{item.doctor}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.priority === 'Emergency' ? 'danger' : 'secondary'}>
                                            {item.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            item.status === 'In Consultation' ? 'primary' :
                                                item.status === 'Done' ? 'success' : 'warning'
                                        }>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" className="flex items-center gap-1 ml-auto">
                                            Call Next <ArrowRight size={14} />
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

export default OpdManagement;
