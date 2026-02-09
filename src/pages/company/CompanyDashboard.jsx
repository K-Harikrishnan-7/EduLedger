import React, { useState } from 'react';
import { useBlockchain } from '../../context/MockBlockchainContext';
import { Search, ShieldCheck, CheckCircle, Clock, User, Award } from 'lucide-react';

const CompanyDashboard = () => {
    const { currentUser, students, users, requestConsent, getAccessibleMarksheets, getCompanyRequests } = useBlockchain();

    const [studentIdInput, setStudentIdInput] = useState('');
    const [message, setMessage] = useState(null);

    const accessibleMarksheets = getAccessibleMarksheets(currentUser.id);
    const myRequests = getCompanyRequests(currentUser.id);

    // Fetch available students via context (or just users list) for validation mock
    // In real app, you might just request by known ID or Address
    const allStudents = users.filter(u => u.role === 'student');

    const handleRequest = (e) => {
        e.preventDefault();
        if (!studentIdInput) return;

        // Validate student exists
        const student = allStudents.find(s => s.id === studentIdInput || s.wallet === studentIdInput);
        if (!student) {
            setMessage({ type: 'error', text: 'Student ID or Wallet not found.' });
            return;
        }

        // Check if already requested
        const existing = myRequests.find(r => r.studentId === student.id && r.status === 'pending');
        if (existing) {
            setMessage({ type: 'error', text: 'Request already pending for this student.' });
            return;
        }

        // Check if already approved
        const approved = myRequests.find(r => r.studentId === student.id && r.status === 'approved');
        if (approved) {
            setMessage({ type: 'success', text: 'Access already granted!' });
            return;
        }

        requestConsent(student.id);
        setMessage({ type: 'success', text: `Consent requested from ${student.name}` });
        setStudentIdInput('');
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Company Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Verify future employees.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Request Access */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Search size={24} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Request Verification Access</h3>
                    </div>

                    <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Enter the Student ID or Wallet Address to request permission to view their academic marksheets.
                        </p>

                        <div>
                            <label style={labelStyle}>Student ID / Wallet</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. s1 or 0xStudent1"
                                value={studentIdInput}
                                onChange={e => setStudentIdInput(e.target.value)}
                            />
                        </div>

                        <button type="submit" style={buttonStyle}>
                            Send Consent Request
                        </button>

                        {message && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                color: message.type === 'success' ? '#047857' : '#b91c1c',
                                border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                            }}>
                                {message.text}
                            </div>
                        )}


                    </form>
                </div>

                {/* Right Column: Verified List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Approved & Verified Candidates */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <ShieldCheck size={24} style={{ color: 'var(--secondary-color)' }} />
                            <h3 style={{ fontSize: '1.25rem' }}>Verified Marksheets</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {accessibleMarksheets.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No verified marksheets accessible yet.</p>
                            ) : (
                                accessibleMarksheets.map((m, idx) => (
                                    <div key={`${m.id}-${idx}`} style={verifiedItemStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <div style={{ backgroundColor: '#d1fae5', padding: '0.5rem', borderRadius: '50%', height: 'fit-content' }}>
                                                    <CheckCircle size={16} color="var(--secondary-color)" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{m.studentName}</div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{m.course}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{m.gpa}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GPA</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pending Requests List */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <Clock size={20} style={{ color: '#d97706' }} />
                            <h3 style={{ fontSize: '1.125rem' }}>Pending Requests</h3>
                        </div>
                        {myRequests.filter(r => r.status === 'pending').length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending requests.</p>
                        ) : (
                            myRequests.filter(r => r.status === 'pending').map(req => {
                                const s = allStudents.find(s => s.id === req.studentId);
                                return (
                                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.875rem' }}>Request sent to {s?.name || req.studentId}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Pending</span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

// Styles
const cardStyle = {
    backgroundColor: 'var(--surface-color)',
    padding: '1.5rem',
    borderRadius: '1rem',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)',
    height: 'fit-content'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: 'var(--text-main)'
};

const inputStyle = {
    width: '100%',
    padding: '0.625rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border-color)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s'
};

const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    fontWeight: '600',
    borderRadius: 'var(--radius)',
    border: 'none',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s'
};

const verifiedItemStyle = {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '1px solid var(--border-color)',
    backgroundColor: '#f9fafb'
};

export default CompanyDashboard;
