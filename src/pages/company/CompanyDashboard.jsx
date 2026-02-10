import React, { useState } from 'react';
import { useBlockchain } from '../../context/MockBlockchainContext';
import { Search, ShieldCheck, CheckCircle, Clock, User, Award, FileText, ExternalLink } from 'lucide-react';

import { calculateCGPA } from '../../utils/gradeCalculator';

const CompanyDashboard = () => {
    const { currentUser, users, requestConsent, getAccessibleMarksheets, getCompanyRequests } = useBlockchain();

    const [studentIdInput, setStudentIdInput] = useState('');
    const [message, setMessage] = useState(null);
    const [viewingPDF, setViewingPDF] = useState(null);
    const [expandedStudent, setExpandedStudent] = useState(null);

    const accessibleMarksheets = getAccessibleMarksheets(currentUser.id);
    const myRequests = getCompanyRequests(currentUser.id);

    const allStudents = users.filter(u => u.role === 'student');

    // Group marksheets by student
    const marksheetsByStudent = {};
    accessibleMarksheets.forEach(m => {
        if (!marksheetsByStudent[m.studentId]) {
            marksheetsByStudent[m.studentId] = {
                student: allStudents.find(s => s.id === m.studentId),
                marksheets: []
            };
        }
        marksheetsByStudent[m.studentId].marksheets.push(m);
    });

    const handleRequest = (e) => {
        e.preventDefault();
        if (!studentIdInput) return;

        const student = allStudents.find(s => s.id === studentIdInput || s.wallet === studentIdInput);
        if (!student) {
            setMessage({ type: 'error', text: 'Student ID or Wallet not found.' });
            return;
        }

        const existing = myRequests.find(r => r.studentId === student.id && r.status === 'pending');
        if (existing) {
            setMessage({ type: 'error', text: 'Request already pending for this student.' });
            return;
        }

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

    const handleViewPDF = (pdfUrl) => {
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        } else {
            alert('PDF not available');
        }
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

                    {/* Pending Requests */}
                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
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

                {/* Right Column: Verified Students */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={24} style={{ color: 'var(--secondary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Verified Students</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Object.keys(marksheetsByStudent).length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No verified marksheets accessible yet.</p>
                        ) : (
                            Object.values(marksheetsByStudent).map(({ student, marksheets }) => {
                                const isExpanded = expandedStudent === student.id;
                                // Calculate CGPA from all courses in all marksheets
                                const allCourses = marksheets.flatMap(m => m.courses || []);
                                const cgpa = allCourses.length > 0 ? calculateCGPA(allCourses) : 0;

                                return (
                                    <div key={student.id} style={studentCardStyle}>
                                        {/* Student Header */}
                                        <div
                                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                        >
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div style={{ backgroundColor: '#d1fae5', padding: '0.5rem', borderRadius: '50%' }}>
                                                    <User size={20} color="var(--secondary-color)" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '1rem' }}>{student.name}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CGPA</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{cgpa}</div>
                                            </div>
                                        </div>

                                        {/* Expanded Marksheets */}
                                        {isExpanded && (
                                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem' }}>
                                                    Academic Records
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {marksheets.map(m => (
                                                        <div key={m.id} style={marksheetItemStyle}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Academic Year {m.year}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.courses?.length || 0} courses</div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                                        Year: {m.year}
                                                                    </div>
                                                                    <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{m.cgpa}</div>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                                                <button
                                                                    onClick={() => window.open(m.pdfUrl, '_blank')}
                                                                    style={verifyIPFSButtonStyle}
                                                                >
                                                                    <FileText size={14} /> Verify
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* PDF Viewer Modal */}
            {viewingPDF && (
                <div style={modalOverlay} onClick={() => setViewingPDF(null)}>
                    <div style={modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Official Marksheet</h3>
                            <button onClick={() => setViewingPDF(null)} style={{ fontSize: '1.5rem', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                        </div>
                        <iframe
                            src={viewingPDF}
                            style={{ width: '100%', height: '600px', border: 'none', borderRadius: 'var(--radius)' }}
                            title="Marksheet PDF"
                        />
                    </div>
                </div>
            )}
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
    transition: 'background-color 0.2s',
    cursor: 'pointer'
};

const studentCardStyle = {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '1px solid var(--border-color)',
    backgroundColor: '#f9fafb'
};

const marksheetItemStyle = {
    padding: '0.75rem',
    backgroundColor: 'white',
    borderRadius: 'var(--radius)',
    border: '1px solid #e5e7eb'
};

const viewPDFButtonStyle = {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem'
};

const verifyIPFSButtonStyle = {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: 'white',
    color: 'var(--primary-color)',
    border: '1px solid var(--primary-color)',
    borderRadius: 'var(--radius)',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem'
};

const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
};

const modalContent = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '1rem',
    maxWidth: '90%',
    width: '800px',
    maxHeight: '90vh'
};

export default CompanyDashboard;
