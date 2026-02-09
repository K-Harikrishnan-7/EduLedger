import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBlockchain } from '../context/MockBlockchainContext';
import { GraduationCap, Building2, Briefcase, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useBlockchain();

    const [role, setRole] = useState(searchParams.get('role') || 'student');
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urlRole = searchParams.get('role');
        if (urlRole) setRole(urlRole);
    }, [searchParams]);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network delay
        setTimeout(() => {
            const result = login(userId, password, role);
            if (result.success) {
                if (role === 'student') navigate('/student');
                else if (role === 'university') navigate('/university');
                else if (role === 'company') navigate('/company');
            } else {
                setError(result.message);
                setLoading(false);
            }
        }, 800);
    };

    const getRoleIcon = () => {
        switch (role) {
            case 'university': return <Building2 size={32} color="var(--primary-color)" />;
            case 'company': return <Briefcase size={32} color="#059669" />;
            default: return <GraduationCap size={32} color="#2563eb" />;
        }
    };

    const getRoleColor = () => {
        switch (role) {
            case 'university': return 'var(--primary-color)';
            case 'company': return '#059669';
            default: return '#2563eb'; // blue
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 200px)', // Adjust for header/footer
            padding: '2rem'
        }}>
            <div style={{
                backgroundColor: 'var(--surface-color)',
                padding: '2.5rem',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow)',
                width: '100%',
                maxWidth: '450px',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: `${getRoleColor()}15`, // 15% opacity
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto'
                    }}>
                        {getRoleIcon()}
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Login to your {role} account</p>
                </div>

                {/* Role Tabs */}
                <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--background-color)',
                    padding: '0.25rem',
                    borderRadius: '0.5rem',
                    marginBottom: '2rem'
                }}>
                    {['student', 'university', 'company'].map((r) => (
                        <button
                            key={r}
                            onClick={() => { setRole(r); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: 'none',
                                background: role === r ? 'var(--surface-color)' : 'transparent',
                                color: role === r ? 'var(--text-color)' : 'var(--text-muted)',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontWeight: role === r ? '600' : '400',
                                boxShadow: role === r ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {error && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>User ID</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Enter Login ID"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--background-color)',
                                    color: 'var(--text-color)'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Password"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--background-color)',
                                    color: 'var(--text-color)'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.875rem',
                            backgroundColor: getRoleColor(),
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Login'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Login;
