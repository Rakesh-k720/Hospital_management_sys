import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');
    const [devInfo, setDevInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/auth/forgot-password', { email });
            setMsg(res.data.message);
            if (res.data.data?.devResetUrl) setDevInfo(res.data.data);
        } catch (err) {
            setMsg(err.response?.data?.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full">
                <CardHeader><CardTitle>Forgot Password</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        {msg && <p className="text-sm text-green-600">{msg}</p>}
                        {devInfo?.devResetUrl && (
                            <p className="text-xs bg-amber-50 p-2 rounded">Dev reset link: <a href={devInfo.devResetUrl} className="text-primary-600 break-all">{devInfo.devResetUrl}</a></p>
                        )}
                        <Button type="submit" disabled={loading} className="w-full">Send Reset Link</Button>
                        <Link to="/login" className="text-sm text-primary-600 block text-center">Back to login</Link>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ForgotPassword;
