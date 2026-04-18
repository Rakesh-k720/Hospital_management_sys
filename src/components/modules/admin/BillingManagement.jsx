import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Receipt, Search, Download, CheckCircle } from 'lucide-react';
import API from '../../../services/api';

const BillingManagement = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const response = await API.get('/billing/all');
                setBills(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching bills:', err);
                setLoading(false);
            }
        };
        fetchBills();
    }, []);

    const handleMarkAsPaid = async (billId) => {
        try {
            await API.put('/billing/pay', { bill_id: billId, payment_method: 'cash' });
            setBills(bills.map(b => b.id === billId ? { ...b, payment_status: 'paid' } : b));
        } catch (err) {
            console.error('Error updating payment:', err);
        }
    };

    const filteredBills = bills.filter(bill => 
        bill.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Hospital Billing</h2>
                    <p className="text-sm text-secondary-500">Manage invoices and payment records</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex items-center gap-2">
                        <Download size={18} />
                        Export Report
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <Input 
                        placeholder="Search by Patient Name or Invoice ID..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select className="bg-secondary-50 border border-secondary-200 text-secondary-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5">
                    <option value="all">All Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <thead>
                            <tr className="bg-secondary-50 text-left">
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Invoice ID</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Patient Name</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Date</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Amount</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
                            ) : filteredBills.map((bill) => (
                                <tr key={bill.id} className="border-t border-secondary-100 hover:bg-secondary-50 transition-colors">
                                    <td className="p-4 font-bold text-secondary-700">#INV-{bill.id}</td>
                                    <td className="p-4 text-secondary-900">{bill.patient_name}</td>
                                    <td className="p-4 text-secondary-600">{new Date(bill.bill_date).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold text-secondary-900">₹{bill.total_amount}</td>
                                    <td className="p-4">
                                        <Badge variant={bill.payment_status === 'paid' ? 'success' : 'warning'}>
                                            {bill.payment_status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="p-4 space-x-2">
                                        {bill.payment_status === 'unpaid' && (
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleMarkAsPaid(bill.id)}
                                            >
                                                Mark Paid
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm">View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default BillingManagement;
