import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Stethoscope, UserPlus, Mail, Lock, Phone, User, ShieldCheck, Heart } from 'lucide-react';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'patient'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await API.post('/auth/register', formData);
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-xl w-full border-none shadow-premium bg-white rounded-3xl overflow-hidden my-8">
                <CardHeader className="text-center pt-10 pb-6 border-none">
                    <div className="bg-primary-600 w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto mb-4 shadow-soft">
                        <Stethoscope size={32} />
                    </div>
                    <CardTitle className="text-3xl font-bold font-['Outfit'] text-secondary-900">Create Account</CardTitle>
                    <p className="text-secondary-500 text-sm mt-2">Join LifeLine Hospital Management System</p>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {error && (
                            <div className="md:col-span-2 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 italic">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="md:col-span-2 bg-green-50 text-green-600 p-3 rounded-xl text-xs font-bold border border-green-100 italic">
                                {success}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-secondary-700 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

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
                            <label className="text-xs font-bold text-secondary-700 ml-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                                    placeholder="1234567890"
                                    value={formData.phone}
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

                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-secondary-700 ml-1">Account Role</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'patient', label: 'Patient', icon: Heart },
                                    { id: 'doctor', label: 'Doctor', icon: Stethoscope },
                                    { id: 'admin', label: 'Admin', icon: ShieldCheck },
                                ].map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: role.id })}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.role === role.id
                                            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-soft'
                                            : 'border-slate-100 bg-slate-50 text-secondary-500 hover:border-primary-200'
                                            }`}
                                    >
                                        <role.icon size={20} />
                                        <span className="text-[10px] font-bold uppercase">{role.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="md:col-span-2 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-soft mt-4"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Register Account
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100">
                        <p className="text-sm text-secondary-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-primary-600 hover:underline">Sign In Instead</Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Signup;
