import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBlockchain } from '../context/AppContext';
import { Lock, User, ArrowRight, AlertCircle, BookOpen } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useBlockchain();

    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(userId, password);
        if (result.success) {
            const { role } = result;
            if (role === 'student') navigate('/student');
            else if (role === 'university') navigate('/university');
            else if (role === 'company') navigate('/company');
            else navigate('/');
        } else {
            setError(result.message);
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 200px)',
            padding: '2rem',
            background: 'var(--background-color)',
        }}>
            <div style={{
                backgroundColor: 'var(--surface-color)',
                padding: '2.5rem',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow)',
                width: '100%',
                maxWidth: '420px',
                border: '1px solid var(--border-color)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)20',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem auto',
                    }}>
                        <BookOpen size={32} color="var(--primary-color)" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Welcome to EduLedger</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Sign in with your credentials
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2', color: '#dc2626',
                        padding: '0.75rem', borderRadius: '0.5rem',
                        fontSize: '0.875rem', display: 'flex',
                        alignItems: 'center', gap: '0.5rem',
                        marginBottom: '1.25rem',
                    }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* User ID */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                            User ID
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Enter your User ID"
                                required
                                style={{
                                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '0.5rem', border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--background-color)', color: 'var(--text-color)',
                                    fontSize: '0.95rem', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
                            <Link to="/forgot-userid" style={{ fontSize: '0.8rem', color: 'var(--primary-color)', textDecoration: 'none' }}>
                                Forgot User ID?
                            </Link>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Password</label>
                            <Link
                                to="/forgot-password"
                                style={{ fontSize: '0.8rem', color: 'var(--primary-color)', textDecoration: 'none' }}
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your Password"
                                required
                                style={{
                                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '0.5rem', border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--background-color)', color: 'var(--text-color)',
                                    fontSize: '0.95rem', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '0.5rem', padding: '0.875rem',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white', border: 'none', borderRadius: '0.5rem',
                            fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '0.5rem',
                            opacity: loading ? 0.7 : 1, fontSize: '1rem',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Access is provided by EduLedger administration only.
                </p>
            </div>
        </div>
    );
};

export default Login;
