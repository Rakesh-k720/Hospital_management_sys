import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Package,
    Search,
    RefreshCw,
    Plus,
    X,
    Pencil,
    Trash2,
    Download,
    AlertTriangle,
    Minus,
    PlusCircle
} from 'lucide-react';

const CATEGORIES = [
    { value: 'all', labelKey: 'adminInventory.allCategories' },
    { value: 'pharmacy', labelKey: 'adminInventory.catPharmacy' },
    { value: 'supplies', labelKey: 'adminInventory.catSupplies' },
    { value: 'equipment', labelKey: 'adminInventory.catEquipment' },
    { value: 'general', labelKey: 'adminInventory.catGeneral' }
];

const stockStatus = (item) => {
    const qty = Number(item.quantity);
    const reorder = Number(item.reorder_level);
    if (qty <= 0) return 'out';
    if (qty <= reorder) return 'low';
    return 'ok';
};

const InventoryManagement = () => {
    const { t } = useTranslation();

    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [selected, setSelected] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        item_name: '',
        category: 'pharmacy',
        quantity: 0,
        reorder_level: 10,
        unit_price: 0
    });
    const [submitting, setSubmitting] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState('10');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (lowStockOnly) params.low_stock = '1';

            const res = await API.get('/inventory', { params });
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setItems(payload);
                setStats({});
            } else {
                setItems(payload?.items || []);
                setStats(payload?.stats || {});
            }
        } catch (err) {
            showToast(err.response?.data?.message || t('adminInventory.loadError'), 'error');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, lowStockOnly, t]);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                (item.item_name || '').toLowerCase().includes(q) ||
                (item.category || '').toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

    const globalStats = useMemo(() => {
        if (stats.total_items !== undefined) {
            return {
                total: stats.total_items,
                low: stats.low_stock,
                out: stats.out_of_stock,
                value: stats.total_value
            };
        }
        return {
            total: items.length,
            low: items.filter((i) => stockStatus(i) === 'low').length,
            out: items.filter((i) => stockStatus(i) === 'out').length,
            value: items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0)
        };
    }, [stats, items]);

    const statusBadge = (item) => {
        const s = stockStatus(item);
        if (s === 'out') return <Badge variant="danger">{t('adminInventory.statusOut')}</Badge>;
        if (s === 'low') return <Badge variant="warning">{t('adminInventory.statusLow')}</Badge>;
        return <Badge variant="success">{t('adminInventory.statusOk')}</Badge>;
    };

    const openAdd = () => {
        setEditingId(null);
        setForm({ item_name: '', category: 'pharmacy', quantity: 0, reorder_level: 10, unit_price: 0 });
        setModalOpen(true);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm({
            item_name: item.item_name,
            category: item.category || 'pharmacy',
            quantity: item.quantity,
            reorder_level: item.reorder_level,
            unit_price: item.unit_price
        });
        setModalOpen(true);
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                quantity: Number(form.quantity),
                reorder_level: Number(form.reorder_level),
                unit_price: Number(form.unit_price)
            };
            if (editingId) {
                await API.put(`/inventory/${editingId}`, payload);
                showToast(t('adminInventory.updated'));
            } else {
                await API.post('/inventory', payload);
                showToast(t('adminInventory.added'));
            }
            setModalOpen(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const adjustStock = async (id, delta) => {
        try {
            const res = await API.patch(`/inventory/${id}/stock`, { delta });
            showToast(t('adminInventory.stockAdjusted'));
            const newQty = res.data.data?.quantity;
            if (selected?.id === id && newQty !== undefined) {
                setSelected((s) => (s ? { ...s, quantity: newQty } : null));
            }
            load();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed', 'error');
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this inventory item?')) return;
        try {
            await API.delete(`/inventory/${id}`);
            showToast(t('adminInventory.deleted'));
            if (selected?.id === id) setSelected(null);
            load();
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    const exportCsv = () => {
        const rows = [
            ['ID', 'Item', 'Category', 'Quantity', 'Reorder', 'UnitPrice', 'Value', 'Status'],
            ...filtered.map((i) => [
                i.id,
                i.item_name,
                i.category,
                i.quantity,
                i.reorder_level,
                i.unit_price,
                Number(i.quantity) * Number(i.unit_price),
                stockStatus(i)
            ])
        ];
        const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('adminInventory.exported'));
    };

    const categoryLabel = (cat) => {
        const found = CATEGORIES.find((c) => c.value === cat);
        return found ? t(found.labelKey) : cat;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Package className="text-orange-600" size={28} />
                        {t('adminInventory.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminInventory.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={!filtered.length}>
                        <Download size={16} />
                        {t('adminInventory.exportCsv')}
                    </Button>
                    <Button variant="outline" onClick={load} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminInventory.refresh')}
                    </Button>
                    <Button onClick={openAdd} className="gap-2 bg-orange-600 hover:bg-orange-700">
                        <Plus size={16} />
                        {t('adminInventory.addItem')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: t('adminInventory.totalItems'), value: globalStats.total, color: 'text-secondary-900' },
                    { label: t('adminInventory.lowStock'), value: globalStats.low, color: 'text-amber-600', icon: AlertTriangle },
                    { label: t('adminInventory.outOfStock'), value: globalStats.out, color: 'text-red-600' },
                    { label: t('adminInventory.stockValue'), value: `₹${Math.round(globalStats.value)}`, color: 'text-green-600' }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4">
                            {s.icon && <s.icon size={18} className={`${s.color} mb-1`} />}
                            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                            <p className="text-[10px] font-bold uppercase text-secondary-500 mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col xl:flex-row gap-4">
                <Card className="flex-1 border-none shadow-premium">
                    <CardHeader className="border-b border-slate-50 space-y-3">
                        <div className="flex flex-wrap gap-2 items-center">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setLowStockOnly(false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    !lowStockOnly ? 'bg-orange-600 text-white' : 'bg-slate-100 text-secondary-600'
                                }`}
                            >
                                {t('adminInventory.allItems')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLowStockOnly(true)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                                    lowStockOnly ? 'bg-red-600 text-white' : 'bg-slate-100 text-secondary-600'
                                }`}
                            >
                                <AlertTriangle size={12} />
                                {t('adminInventory.lowStockOnly')}
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('adminInventory.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <p className="p-8 text-center text-sm text-secondary-400">{t('common.loading')}</p>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <Package size={40} className="mx-auto text-secondary-300 mb-3" />
                                <p className="font-semibold text-secondary-600">{t('adminInventory.empty')}</p>
                                <p className="text-xs text-secondary-400 mt-1">{t('adminInventory.emptyHint')}</p>
                                <Button className="mt-4 gap-2" onClick={openAdd}>
                                    <Plus size={16} /> {t('adminInventory.addItem')}
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('adminInventory.colItem')}</TableHead>
                                        <TableHead>{t('adminInventory.colCategory')}</TableHead>
                                        <TableHead>{t('adminInventory.colStock')}</TableHead>
                                        <TableHead>{t('adminInventory.colReorder')}</TableHead>
                                        <TableHead>{t('adminInventory.colPrice')}</TableHead>
                                        <TableHead>{t('adminInventory.colValue')}</TableHead>
                                        <TableHead>{t('adminInventory.colStatus')}</TableHead>
                                        <TableHead className="text-right">{t('adminInventory.colActions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className={`cursor-pointer hover:bg-slate-50/80 ${
                                                selected?.id === item.id ? 'bg-orange-50/50' : ''
                                            } ${stockStatus(item) !== 'ok' ? 'bg-red-50/30' : ''}`}
                                            onClick={() => setSelected(item)}
                                        >
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{categoryLabel(item.category)}</Badge>
                                            </TableCell>
                                            <TableCell className="font-bold">{item.quantity}</TableCell>
                                            <TableCell>{item.reorder_level}</TableCell>
                                            <TableCell>₹{item.unit_price}</TableCell>
                                            <TableCell className="font-medium">
                                                ₹{(Number(item.quantity) * Number(item.unit_price)).toFixed(0)}
                                            </TableCell>
                                            <TableCell>{statusBadge(item)}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 flex-wrap">
                                                    <Button size="sm" variant="outline" onClick={() => adjustStock(item.id, 10)} title={t('adminInventory.stockIn')}>
                                                        <PlusCircle size={14} className="text-green-600" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => adjustStock(item.id, -10)} title={t('adminInventory.stockOut')}>
                                                        <Minus size={14} className="text-red-500" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => remove(item.id)}>
                                                        <Trash2 size={14} className="text-red-500" />
                                                    </Button>
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
                    <Card className="w-full xl:w-80 shrink-0 border-none shadow-premium sticky top-4">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">{t('adminInventory.details')}</CardTitle>
                            <button type="button" onClick={() => setSelected(null)}><X size={18} /></button>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="p-4 rounded-xl bg-orange-50 text-center">
                                <p className="font-bold text-lg">{selected.item_name}</p>
                                <Badge variant="secondary" className="mt-2">{categoryLabel(selected.category)}</Badge>
                                <div className="mt-3">{statusBadge(selected)}</div>
                            </div>
                            <dl className="space-y-2 text-secondary-600">
                                <div className="flex justify-between">
                                    <dt>{t('adminInventory.colStock')}</dt>
                                    <dd className="text-2xl font-bold text-secondary-900">{selected.quantity}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt>{t('adminInventory.colReorder')}</dt>
                                    <dd>{selected.reorder_level}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt>{t('adminInventory.colPrice')}</dt>
                                    <dd>₹{selected.unit_price}</dd>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <dt>{t('adminInventory.colValue')}</dt>
                                    <dd className="font-bold">
                                        ₹{(Number(selected.quantity) * Number(selected.unit_price)).toFixed(2)}
                                    </dd>
                                </div>
                            </dl>
                            <div>
                                <p className="text-xs font-bold uppercase text-secondary-500 mb-2">{t('adminInventory.adjustQty')}</p>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        size="sm"
                                        className="bg-green-600"
                                        onClick={() => adjustStock(selected.id, Number(adjustAmount) || 0)}
                                    >
                                        +
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => adjustStock(selected.id, -(Number(adjustAmount) || 0))}
                                    >
                                        −
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(selected)}>
                                    {t('adminInventory.edit')}
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(selected.id)}>
                                    {t('adminInventory.delete')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <Card className="w-full max-w-lg border-none shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{editingId ? t('adminInventory.editItem') : t('adminInventory.addItem')}</CardTitle>
                            <button type="button" onClick={() => setModalOpen(false)}><X size={20} /></button>
                        </CardHeader>
                        <form onSubmit={submitForm}>
                            <CardContent className="space-y-4">
                                <Input
                                    label={t('adminInventory.itemName')}
                                    required
                                    value={form.item_name}
                                    onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                />
                                <div>
                                    <label className="text-xs font-bold uppercase text-secondary-500">{t('adminInventory.category')}</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                                            <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        label={t('adminInventory.quantity')}
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        label={t('adminInventory.reorderLevel')}
                                        value={form.reorder_level}
                                        onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        label={t('adminInventory.unitPrice')}
                                        value={form.unit_price}
                                        onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 justify-end border-t">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? t('common.loading') : t('adminInventory.save')}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default InventoryManagement;
