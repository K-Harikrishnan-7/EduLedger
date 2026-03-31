import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, User, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--background-color)',
    color: 'var(--text-color)',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
};

const btnStyle = (loading) => ({
    width: '100%',
    padding: '0.875rem',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    fontSize: '1rem',
    transition: 'opacity 0.2s',
});

const errBox = (
    <div style={{
        backgroundColor: '#fee2e2', color: '#dc2626',
        padding: '0.75rem', borderRadius: '0.5rem',
        fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1rem',
    }} />
);

// ── Progress bar ─────────────────────────────────────────────────────────────
const StepIndicator = ({ current }) => {
    const steps = ['Email', 'OTP', 'Done'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            {steps.map((label, i) => {
                const idx = i + 1;
                const active = idx === current;
                const done = idx < current;
                return (
                    <React.Fragment key={label}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: done ? '#22c55e' : active ? 'var(--primary-color)' : 'var(--border-color)',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '700', fontSize: '0.85rem', transition: 'background 0.3s',
                            }}>
                                {done ? <CheckCircle size={16} /> : idx}
                            </div>
                            <span style={{ fontSize: '0.7rem', marginTop: '4px', color: active ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: '2px', backgroundColor: done ? '#22c55e' : 'var(--border-color)', transition: 'background 0.3s', marginBottom: '18px' }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ── Main component ───────────────────────────────────────────────────────────
const ForgotUserId = () => {
    const navigate = useNavigate();

    // Step state
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1
    const [email, setEmail] = useState('');

    // Step 2
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef([]);

    // Step 2 result
    const [username, setUsername] = useState('');
    const [resetToken, setResetToken] = useState('');

    // Step 3
    const [showReset, setShowReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [resetDone, setResetDone] = useState(false);

    // ── STEP 1: Send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-userid/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setStep(2);
            } else {
                const data = await res.json();
                setError(data.error || 'Something went wrong');
            }
        } catch {
            setError('Cannot reach server. Check your connection.');
        }
        setLoading(false);
    };

    // ── OTP input handling ────────────────────────────────────────────────────
    const handleOtpChange = (idx, val) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...otp];
        next[idx] = digit;
        setOtp(next);
        if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    };

    const handleOtpKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    // ── STEP 2: Verify OTP ────────────────────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpStr = otp.join('');
        if (otpStr.length < 6) { setError('Enter all 6 digits'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-userid/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpStr }),
            });
            const data = await res.json();
            if (res.ok) {
                setUsername(data.username);
                setResetToken(data.resetToken);
                setStep(3);
            } else {
                setError(data.error || 'Invalid or expired OTP');
            }
        } catch {
            setError('Cannot reach server. Check your connection.');
        }
        setLoading(false);
    };

    // ── STEP 3: Reset password (optional) ─────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-userid/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetToken, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setResetDone(true);
                setTimeout(() => navigate('/login'), 2500);
            } else {
                setError(data.error || 'Reset failed. Token may have expired.');
            }
        } catch {
            setError('Cannot reach server. Check your connection.');
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: '2rem' }}>
            <div style={{
                backgroundColor: 'var(--surface-color)', padding: '2.5rem',
                borderRadius: '1rem', boxShadow: 'var(--shadow)',
                width: '100%', maxWidth: '440px', border: '1px solid var(--border-color)',
            }}>
                {/* Back link */}
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <StepIndicator current={step} />

                {/* Error banner */}
                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* ── STEP 1 ── */}
                {step === 1 && (
                    <>
                        <h2 style={{ marginBottom: '0.5rem' }}>Forgot User ID?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Enter your registered email address. We'll send you a one-time password (OTP) to recover your User ID.
                        </p>
                        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={btnStyle(loading)}>
                                {loading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── STEP 2 ── */}
                {step === 2 && (
                    <>
                        <h2 style={{ marginBottom: '0.5rem' }}>Enter OTP</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            A 6-digit OTP was sent to <strong>{email}</strong>.<br />
                            <span style={{ fontSize: '0.8rem' }}>(In development, check the server console.)</span>
                        </p>
                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* OTP boxes */}
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => (otpRefs.current[idx] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                        onPaste={handleOtpPaste}
                                        style={{
                                            width: '48px', height: '56px',
                                            textAlign: 'center', fontSize: '1.5rem', fontWeight: '700',
                                            borderRadius: '0.5rem', border: `2px solid ${digit ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            backgroundColor: 'var(--background-color)', color: 'var(--text-color)',
                                            transition: 'border-color 0.2s', outline: 'none',
                                        }}
                                    />
                                ))}
                            </div>
                            <button type="submit" disabled={loading} style={btnStyle(loading)}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </form>
                        <button onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>
                            ← Resend OTP / Change Email
                        </button>
                    </>
                )}

                {/* ── STEP 3 ── */}
                {step === 3 && (
                    <>
                        {resetDone ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <CheckCircle size={52} color="#22c55e" style={{ marginBottom: '1rem' }} />
                                <h2 style={{ marginBottom: '0.5rem' }}>Password Reset!</h2>
                                <p style={{ color: 'var(--text-muted)' }}>Redirecting to login...</p>
                            </div>
                        ) : (
                            <>
                                {/* User ID card */}
                                <div style={{ backgroundColor: 'var(--primary-color)15', border: '1px solid var(--primary-color)40', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        <User size={16} /> Your User ID
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-color)', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                                        {username}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Copy and use this to log in.
                                    </p>
                                </div>

                                <Link to="/login" style={{ display: 'block', textAlign: 'center', marginBottom: '1rem', padding: '0.875rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none', fontSize: '1rem' }}>
                                    Go to Login
                                </Link>

                                {/* Optional password reset */}
                                {!showReset ? (
                                    <button onClick={() => setShowReset(true)} style={{ width: '100%', padding: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        Also reset my password
                                    </button>
                                ) : (
                                    <>
                                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
                                                <KeyRound size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                                Reset Password
                                            </h3>
                                            {error && (
                                                <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    <AlertCircle size={16} /> {error}
                                                </div>
                                            )}
                                            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>New Password</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                        <input type={showPw ? 'text' : 'password'} value={newPassword} required onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" style={{ ...inputStyle, paddingRight: '2.5rem' }} />
                                                        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: '500' }}>Confirm Password</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                        <input type={showPw ? 'text' : 'password'} value={confirmPassword} required onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={inputStyle} />
                                                    </div>
                                                </div>
                                                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                                                    {loading ? 'Resetting...' : 'Reset Password'}
                                                </button>
                                            </form>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotUserId;
