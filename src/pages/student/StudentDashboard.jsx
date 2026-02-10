import React, { useState } from 'react';
import { useBlockchain } from '../../context/MockBlockchainContext';
import { Award, ShieldCheck, XCircle, CheckCircle, Clock, Download, ExternalLink, FileText } from 'lucide-react';
import { calculateCGPA } from '../../utils/gradeCalculator';

const StudentDashboard = () => {
    const { currentUser, getStudentMarksheets, getStudentRequests, respondToConsent } = useBlockchain();
    const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'requests'
    const [viewingPDF, setViewingPDF] = useState(null);

    const marksheets = getStudentMarksheets(currentUser.id);
    const requests = getStudentRequests(currentUser.id);
    const pendingRequests = requests.filter(r => r.status === 'pending');

    // Calculate overall CGPA from all courses in all marksheets
    const allCourses = marksheets.flatMap(m => m.courses || []);
    const cgpa = allCourses.length > 0 ? calculateCGPA(allCourses) : null;

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
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Student Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Manage your academic portfolio.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                <button
                    onClick={() => setActiveTab('credentials')}
                    style={{ ...tabStyle, ...(activeTab === 'credentials' ? activeTabStyle : {}) }}
                >
                    <Award size={18} />
                    My Credentials
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    style={{ ...tabStyle, ...(activeTab === 'requests' ? activeTabStyle : {}) }}
                >
                    <ShieldCheck size={18} />
                    Consent Requests
                    {pendingRequests.length > 0 && (
                        <span style={{
                            backgroundColor: 'var(--danger-color)',
                            color: 'white',
                            fontSize: '0.75rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            marginLeft: '0.5rem'
                        }}>{pendingRequests.length}</span>
                    )}
                </button>
            </div>

            {/* Content */}
            {activeTab === 'credentials' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {marksheets.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No credentials issued to you yet.</p>
                    ) : (
                        marksheets.map(m => (
                            <div key={m.id} style={credentialCardStyle}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <div style={{ backgroundColor: '#e0e7ff', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <Award size={24} color="var(--primary-color)" />
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Official Marksheet</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    Academic Year {m.year} • {m.courses?.length || 0} courses
                                </p>

                                {/* CGPA Display */}
                                <div style={{
                                    backgroundColor: '#f0f9ff',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius)',
                                    marginBottom: '1rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CGPA</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{m.cgpa}</div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        onClick={() => handleViewPDF(m.pdfUrl)}
                                        style={viewButtonStyle}
                                    >
                                        <FileText size={14} /> View PDF
                                    </button>
                                    <button
                                        onClick={() => window.open(m.pdfUrl, '_blank')}
                                        style={verifyButtonStyle}
                                    >
                                        <Download size={14} /> Download
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
                    {requests.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No consent requests yet.</p>
                    ) : (
                        requests.slice().reverse().map(req => (
                            <div key={req.id} style={requestCardStyle}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <h3 style={{ fontSize: '1.125rem' }}>{req.companyName}</h3>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '4px',
                                            backgroundColor: req.status === 'pending' ? '#fef3c7' : req.status === 'approved' ? '#d1fae5' : '#fee2e2',
                                            color: req.status === 'pending' ? '#d97706' : req.status === 'approved' ? '#059669' : '#b91c1c',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold'
                                        }}>{req.status}</span>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Requested access to your academic records.</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <Clock size={12} /> {req.requestDate}
                                    </div>
                                </div>

                                {req.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => respondToConsent(req.id, 'rejected')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius)',
                                                border: '1px solid var(--danger-color)',
                                                color: 'var(--danger-color)',
                                                backgroundColor: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                        <button
                                            onClick={() => respondToConsent(req.id, 'approved')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius)',
                                                backgroundColor: 'var(--secondary-color)',
                                                color: 'white',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* PDF Viewer Modal */}
            {viewingPDF && (
                <div style={modalOverlay} onClick={() => setViewingPDF(null)}>
                    <div style={modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Marksheet PDF</h3>
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
const tabStyle = {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    marginBottom: '-1px'
};

const activeTabStyle = {
    color: 'var(--primary-color)',
    borderBottom: '2px solid var(--primary-color)'
};

const credentialCardStyle = {
    backgroundColor: 'var(--surface-color)',
    padding: '1.5rem',
    borderRadius: '1rem',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)',
    transition: 'transform 0.2s',
};

const requestCardStyle = {
    backgroundColor: 'var(--surface-color)',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)'
};

const viewButtonStyle = {
    flex: 1,
    padding: '0.625rem',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem'
};

const verifyButtonStyle = {
    flex: 1,
    padding: '0.625rem',
    backgroundColor: 'white',
    color: 'var(--primary-color)',
    border: '1px solid var(--primary-color)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem'
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

export default StudentDashboard;
