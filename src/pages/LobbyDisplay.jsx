import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import {
    Activity,
    Clock,
    Maximize2,
    Minimize2,
    Phone,
    Stethoscope,
    Users,
    Volume2,
    VolumeX,
    Wifi,
    WifiOff
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const emptyData = {
    hospital: {},
    stats: { waiting: 0, in_consultation: 0, completed: 0, total: 0 },
    departments: [],
    nowServing: null,
    nowServingAll: [],
    queue: [],
    recentlyCompleted: [],
    visitDate: new Date().toISOString().slice(0, 10)
};

const LobbyDisplay = () => {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(emptyData);
    const [deptFilter, setDeptFilter] = useState('');
    const [connected, setConnected] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [soundOn, setSoundOn] = useState(false);
    const [flashToken, setFlashToken] = useState(null);
    const prevServingRef = useRef(null);
    const audioCtxRef = useRef(null);

    const playChime = useCallback(() => {
        if (!soundOn) return;
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.stop(ctx.currentTime + 0.4);
        } catch {
            /* ignore autoplay blocks */
        }
    }, [soundOn]);

    const load = useCallback(async () => {
        try {
            const params = {};
            if (deptFilter) params.department_id = deptFilter;
            const res = await axios.get(`${API_BASE}/queue/lobby`, { params });
            const payload = res.data.data || emptyData;
            setData(payload);

            const servingKey = (payload.nowServingAll || [])
                .map((s) => s.token_number)
                .join('|');
            if (prevServingRef.current && prevServingRef.current !== servingKey && servingKey) {
                playChime();
                setFlashToken(payload.nowServing?.token_number || payload.nowServingAll[0]?.token_number);
                setTimeout(() => setFlashToken(null), 4000);
            }
            prevServingRef.current = servingKey;
        } catch (err) {
            console.error(err);
        }
    }, [deptFilter, playChime]);

    useEffect(() => {
        load();
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.emit('lobby:subscribe');
        socket.on('queue:update', load);
        const poll = setInterval(load, 20000);
        return () => {
            socket.disconnect();
            clearInterval(poll);
        };
    }, [load]);

    useEffect(() => {
        const tick = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        const onFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFs);
        return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen?.();
        }
    };

    const hospitalName =
        data.hospital?.hospital_name ||
        import.meta.env.VITE_HOSPITAL_NAME ||
        'LifeLine Hospital';
    const announcement =
        data.hospital?.lobby_announcement || t('lobbyDisplay.announcementDefault');

    const stats = data.stats || emptyData.stats;
    const servingList = data.nowServingAll?.length
        ? data.nowServingAll
        : data.nowServing
          ? [data.nowServing]
          : [];
    const waitingQueue = data.queue || [];

    const toggleLang = () => {
        i18n.changeLanguage(i18n.language === 'hi' ? 'en' : 'hi');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 text-white flex flex-col overflow-hidden">
            {/* Ticker */}
            <div className="bg-violet-700/90 py-2 overflow-hidden shrink-0">
                <div className="animate-[scroll_30s_linear_infinite] whitespace-nowrap text-sm md:text-base font-medium tracking-wide">
                    <span className="inline-block px-8">{announcement}</span>
                    <span className="inline-block px-8">{announcement}</span>
                </div>
            </div>

            {/* Header */}
            <header className="px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold font-['Outfit'] tracking-tight">{hospitalName}</h1>
                    <p className="text-violet-300 text-sm md:text-base mt-0.5">{t('lobbyDisplay.subtitle')}</p>
                    {(data.hospital?.hospital_address || data.hospital?.hospital_phone) && (
                        <p className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                            {data.hospital?.hospital_address && <span>{data.hospital.hospital_address}</span>}
                            {data.hospital?.hospital_phone && (
                                <span className="inline-flex items-center gap-1">
                                    <Phone size={12} /> {data.hospital.hospital_phone}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                            connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                    >
                        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {connected ? t('lobbyDisplay.live') : t('lobbyDisplay.offline')}
                    </div>
                    <div className="flex items-center gap-2 text-lg md:text-2xl font-mono tabular-nums bg-white/5 px-4 py-2 rounded-xl">
                        <Clock size={20} className="text-violet-400 shrink-0" />
                        {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <p className="text-xs text-slate-400 hidden sm:block">
                        {clock.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <button
                        type="button"
                        onClick={() => setSoundOn((s) => !s)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                        title={soundOn ? 'Sound on' : 'Sound off'}
                    >
                        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                    <button
                        type="button"
                        onClick={toggleLang}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                        {i18n.language === 'hi' ? 'EN' : 'हिं'}
                    </button>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-4 md:px-8 py-3 shrink-0">
                {[
                    { label: t('lobbyDisplay.waiting'), value: stats.waiting ?? 0, color: 'text-amber-400', icon: Users },
                    { label: t('lobbyDisplay.inConsult'), value: stats.in_consultation ?? 0, color: 'text-green-400', icon: Stethoscope },
                    { label: t('lobbyDisplay.completedToday'), value: stats.completed ?? 0, color: 'text-blue-400', icon: Activity },
                    { label: t('lobbyDisplay.totalToday'), value: stats.total ?? 0, color: 'text-violet-400', icon: Activity }
                ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-xl px-3 py-2 md:py-3 flex items-center gap-3">
                        <s.icon size={22} className={`${s.color} shrink-0 hidden sm:block`} />
                        <div>
                            <p className={`text-xl md:text-3xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Department filter */}
            {data.departments?.length > 0 && (
                <div className="px-4 md:px-8 pb-2 flex flex-wrap gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setDeptFilter('')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                            !deptFilter ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                        }`}
                    >
                        {t('lobbyDisplay.allDepartments')}
                    </button>
                    {data.departments.map((d) => (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => setDeptFilter(String(d.id))}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                                deptFilter === String(d.id)
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                            }`}
                        >
                            {d.name}
                            {(Number(d.waiting) > 0 || Number(d.in_consultation) > 0) && (
                                <span className="ml-1 opacity-80">
                                    ({Number(d.waiting) + Number(d.in_consultation)})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <main className="flex-1 px-4 md:px-8 pb-6 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0 overflow-auto">
                {/* Now serving */}
                <section className="xl:col-span-7 space-y-3">
                    <h2 className="text-sm uppercase tracking-widest text-violet-300 font-bold">
                        {t('lobbyDisplay.nowServing')}
                    </h2>
                    {servingList.length === 0 ? (
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-10 md:p-16 text-center">
                            <p className="text-2xl md:text-4xl font-bold text-slate-500">
                                {t('lobbyDisplay.noConsultation')}
                            </p>
                            <p className="text-slate-400 mt-2">{t('lobbyDisplay.pleaseWait')}</p>
                        </div>
                    ) : (
                        <div className={`grid gap-3 ${servingList.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                            {servingList.map((s) => (
                                <div
                                    key={`${s.token_number}-${s.department_id}`}
                                    className={`rounded-3xl p-6 md:p-10 text-center shadow-2xl border transition-all duration-500 ${
                                        flashToken === s.token_number
                                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300 scale-[1.02] animate-pulse'
                                            : 'bg-gradient-to-br from-primary-600 to-violet-700 border-violet-400/30'
                                    }`}
                                >
                                    <p className="text-xs uppercase tracking-widest opacity-80">
                                        {s.department_name}
                                    </p>
                                    <p className="text-5xl md:text-8xl font-bold mt-2 font-['Outfit'] tracking-tight">
                                        {s.token_number}
                                    </p>
                                    {s.priority === 'emergency' && (
                                        <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-red-500 text-xs font-bold">
                                            {t('lobbyDisplay.emergency')}
                                        </span>
                                    )}
                                    <p className="text-base md:text-xl mt-4 opacity-90">
                                        {t('lobbyDisplay.doctor')}: {s.doctor_name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Up next + recently done */}
                <section className="xl:col-span-5 flex flex-col gap-4 min-h-0">
                    <div className="flex-1 min-h-0">
                        <h2 className="text-sm uppercase tracking-widest text-violet-300 font-bold mb-2">
                            {t('lobbyDisplay.upNext')}
                        </h2>
                        {waitingQueue.length === 0 ? (
                            <p className="text-slate-500 text-center py-8 bg-white/5 rounded-2xl">
                                {t('lobbyDisplay.queueEmpty')}
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[40vh] xl:max-h-none overflow-y-auto pr-1">
                                {waitingQueue.slice(0, 12).map((q) => (
                                    <div
                                        key={q.token_id}
                                        className={`rounded-xl p-3 md:p-4 text-center border ${
                                            q.priority === 'emergency'
                                                ? 'bg-red-500/20 border-red-400/50'
                                                : 'bg-white/10 border-white/10'
                                        }`}
                                    >
                                        <p className="text-xl md:text-2xl font-bold">{q.token_number}</p>
                                        <p className="text-[10px] md:text-xs text-slate-400 mt-1 truncate">
                                            {q.department_name}
                                        </p>
                                        <p className="text-[10px] text-violet-300 mt-0.5">
                                            {t('lobbyDisplay.position', { n: q.queue_position })}
                                        </p>
                                        {q.priority === 'emergency' && (
                                            <span className="text-[9px] font-bold text-red-300 uppercase">
                                                {t('lobbyDisplay.emergency')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {data.recentlyCompleted?.length > 0 && (
                        <div className="shrink-0">
                            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-bold mb-2">
                                {t('lobbyDisplay.recentlyDone')}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {data.recentlyCompleted.slice(0, 8).map((r, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-slate-300 border border-white/10"
                                    >
                                        <span className="font-bold text-white">{r.token_number}</span>
                                        <span className="text-slate-500 mx-1">·</span>
                                        <span className="text-xs">{r.department_name}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};

export default LobbyDisplay;
