import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Stethoscope, LogIn, Mail, Lock, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../ui/LanguageSwitcher';

const Login = ({ setAuth }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

        const handleBeforeInstallPrompt = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Install Choice: ${outcome}`);
        setDeferredPrompt(null);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await API.post('/auth/login', formData);
            const { token, user } = response.data.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            setAuth({ token, user });

            // Redirect based on role
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'doctor') navigate('/doctor');
            else navigate('/patient');

        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
            <Card className="max-w-md w-full border-none shadow-premium bg-white rounded-3xl overflow-hidden">
                <CardHeader className="text-center pt-10 pb-6 border-none">
                    <div className="bg-primary-600 w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto mb-4 shadow-soft">
                        <Stethoscope size={32} />
                    </div>
                    <CardTitle className="text-3xl font-bold font-['Outfit'] text-secondary-900">{t('auth.welcomeBack')}</CardTitle>
                    <p className="text-secondary-500 text-sm mt-2">{t('app.tagline')}</p>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 italic">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-secondary-700 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-secondary-700 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-secondary-500">
                                <input type="checkbox" className="rounded-md border-slate-300 text-primary-600 focus:ring-primary-500" />
                                Remember me
                            </label>
                            <Link to="/forgot-password" className="font-bold text-primary-600 hover:underline">Forgot password?</Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-soft mt-4"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Login to Dashboard
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100">
                        <p className="text-sm text-secondary-500">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-bold text-primary-600 hover:underline">Create Account</Link>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Premium PWA Install Banner */}
            {deferredPrompt && showBanner && (
                <div className="mt-6 max-w-md w-full bg-white/70 backdrop-blur-lg border border-slate-200/60 rounded-3xl p-5 flex items-center justify-between shadow-premium relative animate-fade-in">
                    {/* Dismiss Button */}
                    <button
                        onClick={() => setShowBanner(false)}
                        className="absolute top-3 right-3 text-secondary-400 hover:text-secondary-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                        title="Dismiss"
                    >
                        <X size={14} />
                    </button>

                    <div className="flex items-center gap-4 pr-4">
                        <div className="relative flex items-center justify-center bg-primary-100 text-primary-600 w-12 h-12 rounded-2xl shadow-inner shrink-0">
                            <Download size={20} />
                            {/* Glowing Green Dot */}
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-secondary-900 font-['Outfit']">
                                Install HMS {isMobile ? 'Mobile' : 'Desktop'} App
                            </h4>
                            <p className="text-[11px] text-secondary-500 mt-0.5 leading-relaxed">
                                {isMobile 
                                    ? 'Access fast on your home screen & use offline.' 
                                    : 'Use it offline and access files directly.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstallClick}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                    >
                        Install
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;
