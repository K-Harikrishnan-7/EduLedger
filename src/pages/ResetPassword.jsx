import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 2500);
            } else {
                setError(data.error || 'Reset failed. Link may have expired.');
            }
        } catch {
            setError('Cannot reach server. Check your connection.');
        }
        setLoading(false);
    };

    if (!token) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
                <h2>Invalid Reset Link</h2>
                <Link to="/login" style={{ color: 'var(--primary-color)' }}>Return to Login</Link>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: '2rem' }}>
            <div style={{ backgroundColor: 'var(--surface-color)', padding: '2.5rem', borderRadius: '1rem', boxShadow: 'var(--shadow)', width: '100%', maxWidth: '420px', border: '1px solid var(--border-color)' }}>
                {success ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={52} color="#22c55e" style={{ marginBottom: '1rem' }} />
                        <h2>Password Reset!</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Redirecting to login...</p>
                    </div>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '0.5rem' }}>Set New Password</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Enter your new password below.
                        </p>

                        {error && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="password" value={newPassword} required onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters"
                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="password" value={confirm} required onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password"
                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={{ padding: '0.875rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
