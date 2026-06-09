import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Stethoscope, LogIn, Mail, Lock, Download } from 'lucide-react';
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
    const navigate = useNavigate();

    useEffect(() => {
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
            {deferredPrompt && (
                <div className="mt-6 max-w-md w-full bg-gradient-to-r from-primary-50 to-sky-50 border border-primary-100 rounded-3xl p-5 flex items-center justify-between shadow-soft animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-soft">
                            <Download size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-secondary-900 font-['Outfit']">Install HMS Desktop App</h4>
                            <p className="text-xs text-secondary-500 mt-0.5">Use it offline and access files directly.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstallClick}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                    >
                        Install App
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;
