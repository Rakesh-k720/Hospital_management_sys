import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import {
    Receipt,
    Search,
    Download,
    RefreshCw,
    Plus,
    X,
    CreditCard,
    Phone,
    IndianRupee,
    Trash2,
    Printer,
    CheckCircle2
} from 'lucide-react';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import { downloadBillPdf } from '../../../utils/pdfExport';

const emptyLine = () => ({ item_name: '', cost: '', quantity: 1 });

const statusVariant = (status) => {
    if (status === 'paid') return 'success';
    if (status === 'partially_paid') return 'info';
    return 'warning';
};

const BillingManagement = () => {
    const { t } = useTranslation();

    const [bills, setBills] = useState([]);
    const [stats, setStats] = useState({});
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [selected, setSelected] = useState(null);
    const [billDetail, setBillDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [showGenerate, setShowGenerate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [genPatient, setGenPatient] = useState('');
    const [lineItems, setLineItems] = useState([
        { item_name: 'Consultation Fee', cost: '500', quantity: 1 }
    ]);

    const [payModal, setPayModal] = useState(false);
    const [payBill, setPayBill] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [payProcessing, setPayProcessing] = useState(false);

    const fetchBills = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;

            const [billRes, patRes] = await Promise.all([
                API.get('/billing/all', { params }),
                API.get('/admin/patients')
            ]);
            const payload = billRes.data.data;
            if (Array.isArray(payload)) {
                setBills(payload);
                setStats({});
            } else {
                setBills(payload?.bills || []);
                setStats(payload?.stats || {});
            }
            setPatients(patRes.data.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || t('adminBilling.loadError'), 'error');
            setBills([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, fromDate, toDate, t]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(fetchBills, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchBills]);

    const loadBillDetail = async (billId) => {
        setDetailLoading(true);
        try {
            const res = await API.get(`/billing/${billId}/items`);
            setBillDetail(res.data.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load invoice', 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    const openView = async (bill) => {
        setSelected(bill);
        setBillDetail(null);
        await loadBillDetail(bill.id);
    };

    const filteredBills = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return bills;
        return bills.filter(
            (bill) =>
                (bill.patient_name || '').toLowerCase().includes(q) ||
                String(bill.id).includes(q) ||
                (bill.patient_phone || '').includes(q) ||
                (bill.patient_email || '').toLowerCase().includes(q)
        );
    }, [bills, searchTerm]);

    const counts = useMemo(
        () => ({
            total: Number(stats.total) || bills.length,
            paid: Number(stats.paid_count) || bills.filter((b) => b.payment_status === 'paid').length,
            unpaid: Number(stats.unpaid_count) || bills.filter((b) => b.payment_status === 'unpaid').length,
            revenue: Number(stats.revenue_paid) || bills.filter((b) => b.payment_status === 'paid').reduce((s, b) => s + Number(b.total_amount), 0),
            pending: Number(stats.amount_pending) || bills.filter((b) => b.payment_status === 'unpaid').reduce((s, b) => s + Number(b.total_amount), 0)
        }),
        [stats, bills]
    );

    const genTotal = useMemo(
        () =>
            lineItems.reduce((sum, line) => {
                const cost = Number(line.cost) || 0;
                const qty = Number(line.quantity) || 1;
                return sum + cost * qty;
            }, 0),
        [lineItems]
    );

    const handleGenerateBill = async (e) => {
        e.preventDefault();
        const items = lineItems
            .filter((l) => l.item_name.trim())
            .map((l) => ({
                item_name: l.item_name.trim(),
                cost: Number(l.cost) || 0,
                quantity: Number(l.quantity) || 1
            }));
        if (!genPatient || !items.length) {
            showToast('Patient and at least one item required', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const res = await API.post('/billing/generate-manual', {
                patient_id: parseInt(genPatient, 10),
                items
            });
            const { billId, totalAmount } = res.data.data;
            showToast(t('adminBilling.billCreated', { id: billId, amount: totalAmount }));
            setShowGenerate(false);
            setLineItems([{ item_name: 'Consultation Fee', cost: '500', quantity: 1 }]);
            fetchBills();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to generate bill', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const openPayModal = (bill) => {
        setPayBill(bill);
        setPaymentMethod('cash');
        setPayModal(true);
    };

    const handleMarkAsPaid = async (e) => {
        e.preventDefault();
        if (!payBill) return;
        setPayProcessing(true);
        try {
            await API.put('/billing/pay', {
                bill_id: payBill.id,
                payment_method: paymentMethod
            });
            showToast(t('adminBilling.paymentRecorded'));
            setPayModal(false);
            setPayBill(null);
            if (selected?.id === payBill.id) {
                setSelected((s) => (s ? { ...s, payment_status: 'paid', payment_method: paymentMethod } : null));
            }
            fetchBills();
            if (billDetail?.bill?.id === payBill.id) {
                loadBillDetail(payBill.id);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Payment failed', 'error');
        } finally {
            setPayProcessing(false);
        }
    };

    const handleDownloadPdf = async (bill) => {
        try {
            let items = billDetail?.bill?.id === bill.id ? billDetail.items : null;
            if (!items) {
                const res = await API.get(`/billing/${bill.id}/items`);
                items = res.data.data?.items || [];
            }
            downloadBillPdf(
                { ...bill, patient_name: bill.patient_name },
                items
            );
        } catch {
            downloadBillPdf(bill, []);
        }
    };

    const updateLine = (index, field, value) => {
        setLineItems((lines) => lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
    };

    const addLine = () => setLineItems((lines) => [...lines, emptyLine()]);
    const removeLine = (index) => setLineItems((lines) => lines.filter((_, i) => i !== index));

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Receipt className="text-green-600" size={28} />
                        {t('adminBilling.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminBilling.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-secondary-600 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        {t('adminBilling.autoRefresh')}
                    </label>
                    <Button variant="outline" onClick={fetchBills} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminBilling.refresh')}
                    </Button>
                    <Button onClick={() => {
                        setGenPatient(patients[0] ? String(patients[0].id) : '');
                        setShowGenerate(true);
                    }} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Plus size={16} />
                        {t('adminBilling.generateBill')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: t('adminBilling.totalInvoices'), value: counts.total, color: 'text-secondary-900' },
                    { label: t('adminBilling.paid'), value: counts.paid, color: 'text-green-600' },
                    { label: t('adminBilling.unpaid'), value: counts.unpaid, color: 'text-amber-600' },
                    { label: t('adminBilling.revenue'), value: `₹${Math.round(counts.revenue)}`, color: 'text-emerald-600' },
                    { label: t('adminBilling.pending'), value: `₹${Math.round(counts.pending)}`, color: 'text-red-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4">
                            <p className={`text-xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-premium">
                <CardHeader className="border-b border-slate-50">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                placeholder={t('adminBilling.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm rounded-xl border border-slate-200 px-3 py-2.5"
                        >
                            <option value="all">{t('adminBilling.allStatus')}</option>
                            <option value="unpaid">{t('adminBilling.statusUnpaid')}</option>
                            <option value="paid">{t('adminBilling.statusPaid')}</option>
                            <option value="partially_paid">{t('adminBilling.statusPartial')}</option>
                        </select>
                        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="max-w-[150px]" title={t('adminBilling.fromDate')} />
                        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="max-w-[150px]" title={t('adminBilling.toDate')} />
                        {(fromDate || toDate) && (
                            <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
                                {t('adminBilling.clearDates')}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <p className="p-8 text-center text-sm text-secondary-400 animate-pulse">{t('common.loading')}</p>
                    ) : filteredBills.length === 0 ? (
                        <div className="p-12 text-center">
                            <Receipt size={40} className="mx-auto text-secondary-300 mb-3" />
                            <p className="font-semibold text-secondary-600">{t('adminBilling.empty')}</p>
                            <p className="text-xs text-secondary-400 mt-1">{t('adminBilling.emptyHint')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('adminBilling.colId')}</TableHead>
                                    <TableHead>{t('adminBilling.colPatient')}</TableHead>
                                    <TableHead>{t('adminBilling.colDate')}</TableHead>
                                    <TableHead>{t('adminBilling.colAmount')}</TableHead>
                                    <TableHead>{t('adminBilling.colMethod')}</TableHead>
                                    <TableHead>{t('adminBilling.colStatus')}</TableHead>
                                    <TableHead className="text-right">{t('adminBilling.colActions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBills.map((bill) => (
                                    <TableRow
                                        key={bill.id}
                                        className={`hover:bg-slate-50/80 cursor-pointer ${
                                            selected?.id === bill.id ? 'bg-green-50/50' : ''
                                        }`}
                                        onClick={() => openView(bill)}
                                    >
                                        <TableCell className="font-mono font-bold text-green-700">INV-{bill.id}</TableCell>
                                        <TableCell>
                                            <p className="font-medium">{bill.patient_name}</p>
                                            {bill.patient_phone && (
                                                <p className="text-[10px] text-secondary-400 flex items-center gap-1">
                                                    <Phone size={10} /> {bill.patient_phone}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(bill.bill_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-bold">₹{bill.total_amount}</TableCell>
                                        <TableCell className="text-xs capitalize">{bill.payment_method || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(bill.payment_status)}>
                                                {bill.payment_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-wrap justify-end gap-1">
                                                <Button size="sm" variant="outline" onClick={() => openView(bill)}>
                                                    {t('adminBilling.view')}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(bill)}>
                                                    <Download size={14} />
                                                </Button>
                                                {bill.payment_status === 'unpaid' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => openPayModal(bill)}
                                                    >
                                                        {t('adminBilling.markPaid')}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {selected && (
                <Card className="border-none shadow-premium print-area">
                    <CardHeader className="flex flex-row items-center justify-between no-print">
                        <CardTitle className="text-base">{t('adminBilling.details')} — INV-{selected.id}</CardTitle>
                        <button type="button" onClick={() => { setSelected(null); setBillDetail(null); }}>
                            <X size={18} />
                        </button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {detailLoading ? (
                            <p className="text-sm text-secondary-400">{t('common.loading')}</p>
                        ) : (
                            <>
                                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="font-bold text-lg">{billDetail?.bill?.patient_name || selected.patient_name}</p>
                                        <p className="text-secondary-500 flex items-center gap-1 mt-1">
                                            <Phone size={14} /> {billDetail?.bill?.patient_phone || selected.patient_phone || '—'}
                                        </p>
                                    </div>
                                    <div className="text-right sm:text-right">
                                        <Badge variant={statusVariant(selected.payment_status)} className="mb-2">
                                            {selected.payment_status}
                                        </Badge>
                                        <p className="text-2xl font-bold flex items-center justify-end gap-1">
                                            <IndianRupee size={20} />
                                            {selected.total_amount}
                                        </p>
                                        {selected.payment_method && selected.payment_status === 'paid' && (
                                            <p className="text-xs text-secondary-500 mt-1">
                                                {t('adminBilling.paidOn')}: {selected.payment_method}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500 mb-2">{t('adminBilling.lineItems')}</p>
                                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="text-left p-3">{t('adminBilling.itemName')}</th>
                                                    <th className="text-right p-3">{t('adminBilling.qty')}</th>
                                                    <th className="text-right p-3">{t('adminBilling.subtotal')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(billDetail?.items || []).map((item) => (
                                                    <tr key={item.id} className="border-t border-slate-50">
                                                        <td className="p-3">{item.item_name}</td>
                                                        <td className="p-3 text-right">{item.quantity || 1}</td>
                                                        <td className="p-3 text-right font-medium">
                                                            ₹{(Number(item.cost) * (item.quantity || 1)).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 no-print">
                                    {selected.payment_status === 'unpaid' && (
                                        <Button className="bg-green-600 gap-2" onClick={() => openPayModal(selected)}>
                                            <CreditCard size={16} />
                                            {t('adminBilling.recordPayment')}
                                        </Button>
                                    )}
                                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadPdf(selected)}>
                                        <Download size={16} />
                                        {t('adminBilling.downloadPdf')}
                                    </Button>
                                    <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                                        <Printer size={16} />
                                        {t('adminBilling.print')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {showGenerate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10">
                            <CardTitle>{t('adminBilling.newBill')}</CardTitle>
                            <button type="button" onClick={() => setShowGenerate(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={handleGenerateBill}>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminBilling.selectPatient')}</label>
                                    <select
                                        required
                                        value={genPatient}
                                        onChange={(e) => setGenPatient(e.target.value)}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="">—</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase text-secondary-500">{t('adminBilling.lineItems')}</p>
                                        <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1">
                                            <Plus size={14} /> {t('adminBilling.addLine')}
                                        </Button>
                                    </div>
                                    {lineItems.map((line, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-50">
                                            <div className="col-span-5">
                                                <Input
                                                    placeholder={t('adminBilling.itemName')}
                                                    value={line.item_name}
                                                    onChange={(e) => updateLine(idx, 'item_name', e.target.value)}
                                                    required={idx === 0}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder={t('adminBilling.unitCost')}
                                                    value={line.cost}
                                                    onChange={(e) => updateLine(idx, 'cost', e.target.value)}
                                                    required={idx === 0}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder={t('adminBilling.quantity')}
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                {lineItems.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                                                        <Trash2 size={16} className="text-red-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-xl bg-green-50">
                                    <span className="font-bold text-secondary-700">{t('adminBilling.grandTotal')}</span>
                                    <span className="text-2xl font-bold text-green-700">₹{genTotal.toFixed(2)}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t sticky bottom-0 bg-white">
                                <Button type="button" variant="outline" onClick={() => setShowGenerate(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={submitting || !patients.length}>
                                    {submitting ? t('common.loading') : t('adminBilling.createBill')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {payModal && payBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm no-print">
                    <Card className="w-full max-w-md border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CheckCircle2 className="text-green-600" size={18} />
                                {t('adminBilling.recordPayment')}
                            </CardTitle>
                            <button type="button" onClick={() => setPayModal(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={handleMarkAsPaid}>
                            <CardContent className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-secondary-400">INV-{payBill.id}</p>
                                        <p className="font-medium">{payBill.patient_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase text-secondary-400">{t('adminBilling.amountDue')}</p>
                                        <p className="text-2xl font-bold">₹{payBill.total_amount}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500">{t('adminBilling.selectMethod')}</label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {[
                                            { label: t('adminBilling.cash'), value: 'cash' },
                                            { label: t('adminBilling.card'), value: 'card' },
                                            { label: t('adminBilling.online'), value: 'online' },
                                            { label: t('adminBilling.insurance'), value: 'insurance' }
                                        ].map((m) => (
                                            <button
                                                key={m.value}
                                                type="button"
                                                onClick={() => setPaymentMethod(m.value)}
                                                className={`p-3 rounded-xl border-2 text-sm font-medium ${
                                                    paymentMethod === m.value
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'border-slate-100'
                                                }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t">
                                <Button type="button" variant="outline" onClick={() => setPayModal(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={payProcessing} className="bg-green-600 hover:bg-green-700">
                                    {payProcessing ? t('common.loading') : t('adminBilling.confirmPay')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default BillingManagement;
