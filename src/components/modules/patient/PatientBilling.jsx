import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { CreditCard, Download, Receipt } from 'lucide-react';
import API from '../../../services/api';

const PatientBilling = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const response = await API.get('/patient/bills');
                setBills(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching bills:', err);
                setLoading(false);
            }
        };
        fetchBills();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">My Invoices</h2>
                    <p className="text-sm text-secondary-500">Track and pay your hospital bills</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <thead>
                            <tr className="bg-secondary-50 text-left">
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Invoice #</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Date</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Amount</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-secondary-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="p-4 text-center text-secondary-400">Loading...</td></tr>
                            ) : bills.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-secondary-400">No invoices found.</td></tr>
                            ) : bills.map((bill) => (
                                <tr key={bill.id} className="border-t border-secondary-100 hover:bg-secondary-50">
                                    <td className="p-4 font-bold text-secondary-700">INV-2024-{bill.id}</td>
                                    <td className="p-4 text-secondary-600">{new Date(bill.bill_date).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold text-secondary-900">₹{bill.total_amount}</td>
                                    <td className="p-4">
                                        <Badge variant={bill.payment_status === 'paid' ? 'success' : 'warning'}>
                                            {bill.payment_status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="p-4 space-x-2">
                                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                                            <Download size={14} /> Receipts
                                        </Button>
                                        {bill.payment_status === 'unpaid' && (
                                            <Button size="sm" className="flex items-center gap-1 group">
                                                <CreditCard size={14} className="group-hover:animate-pulse" /> Pay Now
                                            </Button>
                                        )}
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

export default PatientBilling;
