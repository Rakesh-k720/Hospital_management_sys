import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    ScrollText,
    Search,
    RefreshCw,
    Download,
    X,
    Shield,
    Calendar,
    Trash2,
    PlusCircle,
    Activity,
    ChevronLeft,
    ChevronRight,
    Eye
} from 'lucide-react';

const PAGE_SIZE = 50;

const actionVariant = (action) => {
    if (!action) return 'secondary';
    if (action.includes('delete')) return 'danger';
    if (action.includes('create') || action.includes('add')) return 'success';
    if (action.includes('update') || action.includes('status')) return 'warning';
    return 'secondary';
};

const parseDetails = (raw) => {
    if (!raw) return null;
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return raw;
    }
};

const AuditLogs = () => {
    const { t } = useTranslation();

    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [topActions, setTopActions] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ actions: [], entityTypes: [], users: [] });
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selected, setSelected] = useState(null);

    const todayStr = new Date().toISOString().slice(0, 10);

    const actionLabel = (action) =>
        t(`adminAudit.actionLabels.${action}`, { defaultValue: action?.replace(/_/g, ' ') });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: PAGE_SIZE, offset };
            if (actionFilter !== 'all') params.action = actionFilter;
            if (entityFilter !== 'all') params.entity_type = entityFilter;
            if (userFilter) params.user_id = userFilter;
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;
            if (search.trim()) params.search = search.trim();

            const res = await API.get('/admin/audit-logs', { params });
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setLogs(payload);
                setTotal(payload.length);
                setStats({});
            } else {
                setLogs(payload?.logs || []);
                setTotal(payload?.total ?? 0);
                setStats(payload?.stats || {});
                setTopActions(payload?.topActions || []);
                setFilterOptions(payload?.filters || { actions: [], entityTypes: [], users: [] });
            }
        } catch (err) {
            showToast(err.response?.data?.message || t('adminAudit.loadError'), 'error');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [actionFilter, entityFilter, userFilter, fromDate, toDate, search, offset, t]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        setOffset(0);
    }, [actionFilter, entityFilter, userFilter, fromDate, toDate, search]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(load, 60000);
        return () => clearInterval(id);
    }, [autoRefresh, load]);

    const exportCsv = () => {
        if (!logs.length) {
            showToast(t('adminAudit.exportEmpty'), 'error');
            return;
        }
        const rows = [
            ['ID', 'Time', 'User', 'Role', 'Action', 'Entity', 'EntityID', 'Details'],
            ...logs.map((l) => [
                l.id,
                new Date(l.created_at).toISOString(),
                l.user_name || '',
                l.user_role || '',
                l.action,
                l.entity_type || '',
                l.entity_id || '',
                l.details || ''
            ])
        ];
        const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${todayStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('adminAudit.exported'));
    };

    const filterToday = () => {
        setFromDate(todayStr);
        setToDate(todayStr);
    };

    const pageFrom = total === 0 ? 0 : offset + 1;
    const pageTo = Math.min(offset + logs.length, total);
    const maxTop = useMemo(
        () => Math.max(...topActions.map((a) => Number(a.count)), 1),
        [topActions]
    );

    const selectedDetails = selected ? parseDetails(selected.details) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <ScrollText className="text-slate-700" size={28} />
                        {t('adminAudit.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminAudit.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-secondary-600 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        {t('adminAudit.autoRefresh')}
                    </label>
                    <Button variant="outline" onClick={exportCsv} className="gap-2">
                        <Download size={16} />
                        {t('adminAudit.exportCsv')}
                    </Button>
                    <Button variant="outline" onClick={load} className="gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {t('adminAudit.refresh')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: t('adminAudit.totalLogs'), value: stats.total ?? total, color: 'text-secondary-900', icon: Shield },
                    { label: t('adminAudit.todayLogs'), value: stats.today ?? 0, color: 'text-primary-600', icon: Calendar },
                    { label: t('adminAudit.creates'), value: stats.creates ?? 0, color: 'text-green-600', icon: PlusCircle },
                    { label: t('adminAudit.deletes'), value: stats.deletes ?? 0, color: 'text-red-600', icon: Trash2 }
                ].map((s) => (
                    <Card key={s.label} className="border-none shadow-premium">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-50">
                                <s.icon size={20} className={s.color} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                                <p className="text-[10px] font-bold uppercase text-secondary-500">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {topActions.length > 0 && (
                <Card className="border-none shadow-premium">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Activity size={16} /> {t('adminAudit.topActions')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {topActions.map((a) => (
                            <button
                                key={a.action}
                                type="button"
                                onClick={() => setActionFilter(a.action)}
                                className="w-full flex items-center gap-3 text-left hover:bg-slate-50 rounded-lg px-2 py-1"
                            >
                                <span className="text-xs font-mono w-36 truncate shrink-0">{actionLabel(a.action)}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-600 rounded-full"
                                        style={{ width: `${(Number(a.count) / maxTop) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-secondary-600 w-8 text-right">{a.count}</span>
                            </button>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-col xl:flex-row gap-4">
                <Card className="flex-1 border-none shadow-premium min-w-0">
                    <CardHeader className="border-b border-slate-50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                            >
                                <option value="all">{t('adminAudit.allActions')}</option>
                                {filterOptions.actions.map((a) => (
                                    <option key={a} value={a}>{actionLabel(a)}</option>
                                ))}
                            </select>
                            <select
                                value={entityFilter}
                                onChange={(e) => setEntityFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                            >
                                <option value="all">{t('adminAudit.allEntities')}</option>
                                {filterOptions.entityTypes.map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                            >
                                <option value="">{t('adminAudit.allUsers')}</option>
                                {filterOptions.users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={t('adminAudit.fromDate')}
                            />
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="text-sm rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={t('adminAudit.toDate')}
                            />
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="flex-1" onClick={filterToday}>
                                    {t('adminAudit.todayOnly')}
                                </Button>
                                {(fromDate || toDate) && (
                                    <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
                                        {t('adminAudit.clearDates')}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('adminAudit.searchPlaceholder')}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {loading ? (
                            <p className="p-8 text-center text-sm text-secondary-400">{t('common.loading')}</p>
                        ) : logs.length === 0 ? (
                            <div className="p-12 text-center">
                                <ScrollText size={40} className="mx-auto text-secondary-300 mb-3" />
                                <p className="font-semibold text-secondary-600">{t('adminAudit.empty')}</p>
                                <p className="text-xs text-secondary-400 mt-1">{t('adminAudit.emptyHint')}</p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('adminAudit.colTime')}</TableHead>
                                            <TableHead>{t('adminAudit.colUser')}</TableHead>
                                            <TableHead>{t('adminAudit.colAction')}</TableHead>
                                            <TableHead>{t('adminAudit.colEntity')}</TableHead>
                                            <TableHead className="hidden md:table-cell">{t('adminAudit.colDetails')}</TableHead>
                                            <TableHead className="text-right">{t('adminPatients.colActions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((l) => (
                                            <TableRow
                                                key={l.id}
                                                className={`cursor-pointer hover:bg-slate-50/80 ${
                                                    selected?.id === l.id ? 'bg-slate-100/80' : ''
                                                }`}
                                                onClick={() => setSelected(l)}
                                            >
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {new Date(l.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{l.user_name || '—'}</p>
                                                    {l.user_role && (
                                                        <Badge variant="secondary" className="text-[9px] mt-0.5">{l.user_role}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={actionVariant(l.action)} className="font-mono text-[10px]">
                                                        {actionLabel(l.action)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {l.entity_type ? (
                                                        <>
                                                            <span className="capitalize">{l.entity_type}</span>
                                                            {l.entity_id != null && (
                                                                <span className="text-secondary-400"> #{l.entity_id}</span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-xs text-secondary-500 max-w-[200px] truncate">
                                                    {l.details || '—'}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="sm" variant="outline" onClick={() => setSelected(l)}>
                                                        <Eye size={14} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-50 text-sm">
                                    <p className="text-secondary-500 text-xs">
                                        {t('adminAudit.showing', { from: pageFrom, to: pageTo, total })}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={offset === 0}
                                            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                                            className="gap-1"
                                        >
                                            <ChevronLeft size={14} /> {t('adminAudit.prev')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={offset + PAGE_SIZE >= total}
                                            onClick={() => setOffset((o) => o + PAGE_SIZE)}
                                            className="gap-1"
                                        >
                                            {t('adminAudit.next')} <ChevronRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {selected && (
                    <Card className="w-full xl:w-96 shrink-0 border-none shadow-premium sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">{t('adminAudit.details')}</CardTitle>
                            <button type="button" onClick={() => setSelected(null)}>
                                <X size={18} />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="p-4 rounded-xl bg-slate-100 text-center">
                                <Badge variant={actionVariant(selected.action)} className="mb-2">
                                    {actionLabel(selected.action)}
                                </Badge>
                                <p className="text-xs text-secondary-500">
                                    {new Date(selected.created_at).toLocaleString()}
                                </p>
                            </div>
                            <dl className="space-y-2 text-secondary-600">
                                <div className="flex justify-between gap-2">
                                    <dt>{t('adminAudit.logId')}</dt>
                                    <dd className="font-mono">#{selected.id}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt>{t('adminAudit.colUser')}</dt>
                                    <dd className="text-right">{selected.user_name || '—'}</dd>
                                </div>
                                {selected.user_email && (
                                    <div className="flex justify-between gap-2">
                                        <dt>{t('adminAudit.userEmail')}</dt>
                                        <dd className="text-right text-xs">{selected.user_email}</dd>
                                    </div>
                                )}
                                {selected.user_role && (
                                    <div className="flex justify-between gap-2">
                                        <dt>{t('adminAudit.userRole')}</dt>
                                        <dd><Badge variant="secondary">{selected.user_role}</Badge></dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2">
                                    <dt>{t('adminAudit.colEntity')}</dt>
                                    <dd className="capitalize">{selected.entity_type || '—'}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt>{t('adminAudit.entityId')}</dt>
                                    <dd>{selected.entity_id ?? '—'}</dd>
                                </div>
                            </dl>
                            {selectedDetails && (
                                <div className="border-t pt-3">
                                    <p className="text-xs font-bold uppercase text-secondary-500 mb-2">
                                        {t('adminAudit.rawDetails')}
                                    </p>
                                    <pre className="text-[10px] bg-slate-900 text-green-400 p-3 rounded-xl overflow-x-auto max-h-48">
                                        {JSON.stringify(selectedDetails, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
