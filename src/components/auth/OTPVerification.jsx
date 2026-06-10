import { useState, useRef } from 'react';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import API from '../../services/api';
import { showToast } from '../../utils/toast';

const OTPVerification = ({ userId, email, onBack, setAuth }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputsRef = useRef([]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            showToast('Please enter the complete 6-digit OTP', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data } = await API.post('/auth/verify-otp', { userId, otp: otpString });
            if (data.success) {
                const { token, user } = data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setAuth({ token, user });
                showToast('Login successful!', 'success');
            } else {
                showToast(data.message || 'Invalid OTP', 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Verification failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="text-blue-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
                    <p className="text-gray-500 mt-2">Enter the 6-digit code sent to</p>
                    <p className="text-gray-700 font-medium">{email}</p>
                </div>

                <form onSubmit={handleVerify}>
                    <div className="flex gap-2 justify-center mb-6">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputsRef.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                        Verify & Login
                    </button>
                </form>

                <button
                    onClick={onBack}
                    className="w-full mt-4 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-2"
                >
                    <ArrowLeft size={16} />
                    Back to Login
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">
                    OTP is valid for 10 minutes. Check server console in dev mode.
                </p>
            </div>
        </div>
    );
};

export default OTPVerification;
