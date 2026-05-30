import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ResetPassword = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const email = params.get('email') || '';
    const token = params.get('token') || '';

    const submit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/auth/reset-password', { email, token, password });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full">
                <CardHeader><CardTitle>Set New Password</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" className="w-full">Update Password</Button>
                        <Link to="/login" className="text-sm text-primary-600 block text-center">Login</Link>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
