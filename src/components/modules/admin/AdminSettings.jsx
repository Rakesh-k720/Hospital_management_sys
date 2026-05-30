import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/Table';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    Settings,
    Building2,
    Plug,
    HardDrive,
    RefreshCw,
    Save,
    ExternalLink,
    Monitor,
    Database,
    FolderArchive,
    Package,
    Download,
    Trash2,
    RotateCcw,
    Shield
} from 'lucide-react';

const formatBytes = (bytes) => {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};



const AdminSettings = () => {
    const { t } = useTranslation();
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const apiOrigin = apiUrl.replace(/\/api\/?$/, '');

    const [tab, setTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backupLoading, setBackupLoading] = useState(null);

    const [paymentConfig, setPaymentConfig] = useState(null);

    const [backups, setBackups] = useState([]);
    const [uploadsStats, setUploadsStats] = useState({ fileCount: 0, totalSize: 0 });

    const [settings, setSettings] = useState({
        hospital_name: '',
        hospital_address: '',
        hospital_phone: '',
        hospital_email: '',
        lobby_announcement: '',
        opd_hours: '9:00 AM – 6:00 PM',
        currency_symbol: '₹',
        maintenance_mode: '0'
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [settingsRes, paymentRes, backupRes] = await Promise.all([
                API.get('/settings'),
                API.get('/payments/config').catch(() => ({ data: { data: null } })),
                API.get('/settings/backups')
            ]);
            setSettings((s) => ({ ...s, ...settingsRes.data.data }));
            setPaymentConfig(paymentRes.data.data);
            setBackups(backupRes.data.data?.backups || []);
            setUploadsStats(backupRes.data.data?.uploads || { fileCount: 0, totalSize: 0 });
        } catch (err) {
            showToast(err.response?.data?.message || t('adminSettings.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.put('/settings', settings);
            showToast(t('adminSettings.saved'));
        } catch (err) {
            showToast(err.response?.data?.message || t('adminSettings.saveError'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const createBackup = async (type) => {
        setBackupLoading(type);
        try {
            const res = await API.post('/settings/backups', { type });
            showToast(t('adminSettings.backupCreated'));
            await load();
            return res.data.data;
        } catch (err) {
            showToast(err.response?.data?.message || t('adminSettings.backupFailed'), 'error');
        } finally {
            setBackupLoading(null);
        }
    };

    const downloadBackup = async (filename) => {
        try {
            const res = await API.get(`/settings/backups/${encodeURIComponent(filename)}/download`, {
                responseType: 'blob'
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            showToast(err.response?.data?.message || t('adminSettings.backupFailed'), 'error');
        }
    };

    const deleteBackup = async (filename) => {
        if (!window.confirm(t('adminSettings.deleteConfirm'))) return;
        try {
            await API.delete(`/settings/backups/${encodeURIComponent(filename)}`);
            showToast(t('adminSettings.deleted'));
            load();
        } catch (err) {
            showToast(err.response?.data?.message || t('adminSettings.backupFailed'), 'error');
        }
    };

    const restoreBackup = async (filename) => {
        if (!window.confirm(t('adminSettings.restoreConfirm'))) return;
        setBackupLoading(`restore-${filename}`);
        try {
            await API.post(`/settings/backups/${encodeURIComponent(filename)}/restore`);
            showToast(t('adminSettings.restored'));
        } catch (err) {
            showToast(err.response?.data?.message || t('adminSettings.restoreFailed'), 'error');
        } finally {
            setBackupLoading(null);
        }
    };

    const typeLabel = (type) => {
        if (type === 'database') return t('adminSettings.typeDatabase');
        if (type === 'files') return t('adminSettings.typeFiles');
        if (type === 'full') return t('adminSettings.typeFull');
        return type;
    };

    const tabs = [
        { id: 'general', label: t('adminSettings.tabGeneral'), icon: Building2 },
        { id: 'integrations', label: t('adminSettings.tabIntegrations'), icon: Plug },
        { id: 'backup', label: t('adminSettings.tabBackup'), icon: HardDrive }
    ];

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900 flex items-center gap-2">
                        <Settings className="text-slate-700" size={28} />
                        {t('adminSettings.title')}
                    </h2>
                    <p className="text-sm text-secondary-500">{t('adminSettings.subtitle')}</p>
                </div>
                <Button variant="outline" onClick={load} className="gap-2 shrink-0">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {t('adminSettings.refresh')}
                </Button>
            </div>

            {settings.maintenance_mode === '1' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <Shield size={18} />
                    {t('adminSettings.maintenanceHint')}
                </div>
            )}

            <div className="flex flex-wrap gap-1 border-b border-slate-100">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition ${
                            tab === id
                                ? 'border-slate-800 text-slate-900'
                                : 'border-transparent text-secondary-500 hover:text-secondary-700'
                        }`}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'general' && (
                <Card className="border-none shadow-premium">
                    <CardHeader>
                        <CardTitle className="text-base">{t('adminSettings.hospitalProfile')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={save} className="space-y-4">
                            <Input
                                label={t('adminSettings.hospitalName')}
                                value={settings.hospital_name}
                                onChange={(e) => setSettings({ ...settings, hospital_name: e.target.value })}
                            />
                            <Input
                                label={t('adminSettings.hospitalAddress')}
                                value={settings.hospital_address}
                                onChange={(e) => setSettings({ ...settings, hospital_address: e.target.value })}
                            />
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Input
                                    label={t('adminSettings.hospitalPhone')}
                                    value={settings.hospital_phone}
                                    onChange={(e) => setSettings({ ...settings, hospital_phone: e.target.value })}
                                />
                                <Input
                                    label={t('adminSettings.hospitalEmail')}
                                    type="email"
                                    value={settings.hospital_email || ''}
                                    onChange={(e) => setSettings({ ...settings, hospital_email: e.target.value })}
                                />
                            </div>
                            <Input
                                label={t('adminSettings.opdHours')}
                                value={settings.opd_hours || ''}
                                onChange={(e) => setSettings({ ...settings, opd_hours: e.target.value })}
                            />
                            <Input
                                label={t('adminSettings.currencySymbol')}
                                value={settings.currency_symbol || '₹'}
                                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                                className="max-w-[120px]"
                            />
                            <div>
                                <label className="text-xs font-semibold text-secondary-600">
                                    {t('adminSettings.lobbyAnnouncement')}
                                </label>
                                <p className="text-[10px] text-secondary-400 mb-1">{t('adminSettings.lobbyAnnouncementHint')}</p>
                                <textarea
                                    rows={3}
                                    value={settings.lobby_announcement || ''}
                                    onChange={(e) => setSettings({ ...settings, lobby_announcement: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.maintenance_mode === '1'}
                                    onChange={(e) =>
                                        setSettings({ ...settings, maintenance_mode: e.target.checked ? '1' : '0' })
                                    }
                                    className="rounded"
                                />
                                <span className="text-sm font-medium">{t('adminSettings.maintenanceMode')}</span>
                            </label>
                            <Button type="submit" disabled={saving} className="gap-2">
                                <Save size={16} />
                                {saving ? t('common.loading') : t('adminSettings.save')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {tab === 'integrations' && (
                <Card className="border-none shadow-premium">
                    <CardHeader>
                        <CardTitle className="text-base">{t('adminSettings.integrations')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50">
                                <p className="text-xs font-bold uppercase text-secondary-500">{t('adminSettings.apiUrl')}</p>
                                <p className="font-mono text-xs mt-1 break-all">{apiUrl}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50">
                                <p className="text-xs font-bold uppercase text-secondary-500">{t('adminSettings.apiDocs')}</p>
                                <a
                                    href={`${apiOrigin}/api/docs`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary-600 font-medium mt-1"
                                >
                                    {t('adminSettings.openDocs')} <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={paymentConfig?.razorpayEnabled ? 'success' : 'warning'}>
                                {t('adminSettings.razorpay')}:{' '}
                                {paymentConfig?.razorpayEnabled
                                    ? t('adminSettings.razorpayActive')
                                    : t('adminSettings.razorpayInactive')}
                            </Badge>

                            <Badge variant="secondary">
                                {t('adminSettings.twilio')}: {t('adminSettings.twilioFallback')}
                            </Badge>
                        </div>
                        <Link to="/lobby" target="_blank" rel="noreferrer">
                            <Button variant="outline" className="gap-2">
                                <Monitor size={16} />
                                {t('adminSettings.openLobby')}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {tab === 'backup' && (
                <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                        {[
                            {
                                type: 'database',
                                icon: Database,
                                title: t('adminSettings.backupDb'),
                                desc: t('adminSettings.backupDbDesc'),
                                color: 'text-blue-600 bg-blue-50'
                            },
                            {
                                type: 'files',
                                icon: FolderArchive,
                                title: t('adminSettings.backupFiles'),
                                desc: t('adminSettings.backupFilesDesc'),
                                color: 'text-amber-600 bg-amber-50'
                            },
                            {
                                type: 'full',
                                icon: Package,
                                title: t('adminSettings.backupFull'),
                                desc: t('adminSettings.backupFullDesc'),
                                color: 'text-violet-600 bg-violet-50'
                            }
                        ].map((b) => (
                            <Card key={b.type} className="border-none shadow-premium">
                                <CardContent className="p-4 flex flex-col h-full">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.color} mb-3`}>
                                        <b.icon size={20} />
                                    </div>
                                    <p className="font-bold text-secondary-900">{b.title}</p>
                                    <p className="text-xs text-secondary-500 mt-1 flex-1">{b.desc}</p>
                                    <Button
                                        className="mt-4 w-full gap-2"
                                        variant="outline"
                                        disabled={!!backupLoading}
                                        onClick={() => createBackup(b.type)}
                                    >
                                        {backupLoading === b.type ? t('adminSettings.creating') : t('adminSettings.createBackup')}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-none shadow-premium">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base">{t('adminSettings.backupList')}</CardTitle>
                                <p className="text-xs text-secondary-500 mt-1">
                                    {t('adminSettings.uploadsStats')}: {t('adminSettings.uploadsCount', { count: uploadsStats.fileCount })} · {formatBytes(uploadsStats.totalSize)}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {backups.length === 0 ? (
                                <div className="p-10 text-center">
                                    <HardDrive size={36} className="mx-auto text-secondary-300 mb-2" />
                                    <p className="font-semibold text-secondary-600">{t('adminSettings.noBackups')}</p>
                                    <p className="text-xs text-secondary-400">{t('adminSettings.noBackupsHint')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('adminSettings.colFile')}</TableHead>
                                            <TableHead>{t('adminSettings.colType')}</TableHead>
                                            <TableHead>{t('adminSettings.colSize')}</TableHead>
                                            <TableHead>{t('adminSettings.colDate')}</TableHead>
                                            <TableHead className="text-right">{t('adminPatients.colActions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {backups.map((b) => (
                                            <TableRow key={b.filename}>
                                                <TableCell className="font-mono text-xs max-w-[180px] truncate">
                                                    {b.filename}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{typeLabel(b.type)}</Badge>
                                                </TableCell>
                                                <TableCell>{formatBytes(b.size)}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {new Date(b.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1 flex-wrap">
                                                        <Button size="sm" variant="outline" onClick={() => downloadBackup(b.filename)}>
                                                            <Download size={14} />
                                                        </Button>
                                                        {b.type === 'database' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={backupLoading === `restore-${b.filename}`}
                                                                onClick={() => restoreBackup(b.filename)}
                                                            >
                                                                <RotateCcw size={14} className="text-amber-600" />
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="outline" onClick={() => deleteBackup(b.filename)}>
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
                </div>
            )}


        </div>
    );
};

export default AdminSettings;
