import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { CreditCard, Download, X, CheckCircle } from 'lucide-react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { openRazorpayCheckout } from '../../../utils/razorpayCheckout';

const PatientBilling = () => {
    const { t } = useTranslation();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [processing, setProcessing] = useState(false);
    const [razorpayEnabled, setRazorpayEnabled] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchBills = async () => {
        setLoading(true);
        try {
            const [billRes, configRes] = await Promise.all([
                API.get('/patient/bills'),
                API.get('/payments/config')
            ]);
            setBills(billRes.data.data || []);
            setRazorpayEnabled(configRes.data.data?.razorpayEnabled);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBills(); }, []);

    const handlePayClick = (bill) => {
        setSelectedBill(bill);
        setPaymentMethod(razorpayEnabled ? 'online' : 'cash');
        setPayModalOpen(true);
    };

    const payWithRazorpay = async () => {
        const orderRes = await API.post('/payments/create-order', { bill_id: selectedBill.id });
        const { orderId, amount, currency, keyId, billId } = orderRes.data.data;

        const response = await openRazorpayCheckout({
            keyId,
            orderId,
            amount,
            currency,
            name: t('app.name'),
            description: `Bill #${billId}`,
            prefill: { name: user.name, email: user.email },
            onFailure: () => showToast(t('billing.paymentFailed'), 'error')
        });

        await API.post('/payments/verify', {
            bill_id: billId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
        });

        showToast(t('billing.paymentSuccess'));
        setPayModalOpen(false);
        fetchBills();
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (paymentMethod === 'online' && razorpayEnabled) {
                await payWithRazorpay();
            } else if (paymentMethod === 'online' && !razorpayEnabled) {
                showToast(t('billing.razorpayNotConfigured'), 'error');
            } else {
                await API.put('/billing/pay', {
                    bill_id: selectedBill.id,
                    payment_method: paymentMethod
                });
                showToast(t('billing.paymentSuccess'));
                setPayModalOpen(false);
                fetchBills();
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || t('billing.paymentFailed'), 'error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-secondary-900">{t('billing.title')}</h2>
                <p className="text-sm text-secondary-500">{t('billing.subtitle')}</p>
            </div>

            <Card className="border-none shadow-premium bg-white">
                <CardHeader className="border-b border-slate-50">
                    <CardTitle>{t('billing.title')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="p-8 text-center text-secondary-400">{t('common.loading')}</p>
                    ) : bills.length === 0 ? (
                        <p className="p-8 text-center text-secondary-400">No invoices</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bills.map((bill) => (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-bold">INV-{bill.id}</TableCell>
                                        <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-bold">₹{bill.total_amount}</TableCell>
                                        <TableCell>
                                            <Badge variant={bill.payment_status === 'paid' ? 'success' : 'warning'}>
                                                {bill.payment_status === 'paid' ? t('billing.paid') : t('billing.unpaid')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => { setSelectedBill(bill); setReceiptModalOpen(true); }}>
                                                <Download size={12} className="mr-1" /> {t('billing.receipt')}
                                            </Button>
                                            {bill.payment_status === 'unpaid' && (
                                                <Button size="sm" onClick={() => handlePayClick(bill)}>
                                                    <CreditCard size={12} className="mr-1" /> {t('billing.payNow')}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {payModalOpen && selectedBill && (
                <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                    <Card className="w-full max-w-md bg-white rounded-2xl shadow-premium border-none">
                        <CardHeader className="flex flex-row items-center justify-between border-b">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CreditCard className="text-primary-600" size={18} />
                                {t('billing.payNow')}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setPayModalOpen(false)}><X size={20} /></Button>
                        </CardHeader>
                        <form onSubmit={handlePaymentSubmit}>
                            <CardContent className="space-y-4 pt-4">
                                <div className="p-4 rounded-xl bg-slate-50 flex justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase">{t('billing.amountDue')}</p>
                                        <h3 className="text-xl font-bold">₹{selectedBill.total_amount}</h3>
                                    </div>
                                    <Badge variant="warning">{t('billing.unpaid')}</Badge>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500">{t('billing.selectMethod')}</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {[
                                            { label: t('billing.upi'), value: 'online', disabled: !razorpayEnabled },
                                            { label: t('billing.card'), value: 'card' },
                                            { label: t('billing.cash'), value: 'cash' }
                                        ].map((m) => (
                                            <div
                                                key={m.value}
                                                onClick={() => !m.disabled && setPaymentMethod(m.value)}
                                                className={`p-3 rounded-xl border-2 text-center cursor-pointer text-xs ${
                                                    paymentMethod === m.value ? 'border-primary-500 bg-primary-50 font-bold' : 'border-slate-100'
                                                } ${m.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
                                                {m.label}
                                            </div>
                                        ))}
                                    </div>
                                    {razorpayEnabled && paymentMethod === 'online' && (
                                        <p className="text-[10px] text-secondary-500 mt-2">{t('billing.razorpayNote')}</p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 border-t pt-4">
                                <Button type="button" variant="outline" onClick={() => setPayModalOpen(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? t('billing.processing') : t('billing.payAmount', { amount: selectedBill.total_amount })}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {receiptModalOpen && selectedBill && (
                <div className="fixed inset-0 bg-secondary-900/40 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-xl print-area">
                        <CardHeader className="flex justify-between no-print">
                            <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-600" size={18} /> {t('billing.receipt')}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setReceiptModalOpen(false)}><X size={20} /></Button>
                        </CardHeader>
                        <CardContent className="p-8 text-center space-y-4">
                            <h2 className="text-xl font-bold">{t('app.name')}</h2>
                            <p>INV-{selectedBill.id} | ₹{selectedBill.total_amount}</p>
                            <Badge variant={selectedBill.payment_status === 'paid' ? 'success' : 'warning'}>
                                {selectedBill.payment_status === 'paid' ? t('billing.paid') : t('billing.unpaid')}
                            </Badge>
                        </CardContent>
                        <CardFooter className="no-print justify-end gap-2">
                            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button onClick={() => window.print()}>{t('billing.receipt')}</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PatientBilling;
