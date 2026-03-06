import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setSent(true);
            } else {
                const data = await res.json();
                setError(data.error || 'Something went wrong');
            }
        } catch {
            setError('Cannot reach server. Check your connection.');
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: '2rem',
        }}>
            <div style={{
                backgroundColor: 'var(--surface-color)', padding: '2.5rem',
                borderRadius: '1rem', boxShadow: 'var(--shadow)',
                width: '100%', maxWidth: '420px', border: '1px solid var(--border-color)',
            }}>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                {sent ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <CheckCircle size={52} color="#22c55e" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ marginBottom: '0.75rem' }}>Check your email</h2>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            If this email is registered, a reset link has been sent.<br />
                            <span style={{ fontSize: '0.8rem' }}>(In development, check the server console for the link)</span>
                        </p>
                        <Link to="/login" style={{ display: 'inline-block', marginTop: '1.5rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '0.5rem' }}>Forgot Password</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Enter your registered email address and we'll send you a reset link.
                        </p>

                        {error && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="email" value={email} required
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={{ padding: '0.875rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
