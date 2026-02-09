import React, { useState } from 'react';
import { useBlockchain } from '../../context/MockBlockchainContext';
import { Upload, FileText, CheckCircle, User } from 'lucide-react';

const UniversityDashboard = () => {
    const { currentUser, getStudentsList, issueMarksheet, marksheets } = useBlockchain();
    const students = getStudentsList();

    // Local state for form
    const [formData, setFormData] = useState({
        studentId: '',
        course: '',
        gpa: '',
        year: new Date().getFullYear().toString()
    });

    const [message, setMessage] = useState(null);

    const issuedMarksheets = marksheets.filter(m => m.universityId === currentUser.id);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.studentId || !formData.course || !formData.gpa) return;

        issueMarksheet(formData.studentId, {
            course: formData.course,
            gpa: formData.gpa,
            year: formData.year
        });

        setMessage({ type: 'success', text: 'Marksheet issued successfully on chain!' });
        setFormData({
            studentId: '',
            course: '',
            gpa: '',
            year: new Date().getFullYear().toString()
        });

        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>University Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Issue verified credentials to students.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Issue Form */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Upload className="text-primary-600" size={24} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Issue New Marksheet</h3>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Select Student</label>
                            <select
                                style={inputStyle}
                                value={formData.studentId}
                                onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                required
                            >
                                <option value="">-- Choose Student --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.wallet})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Course / Degree</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. B.Sc. Computer Science"
                                value={formData.course}
                                onChange={e => setFormData({ ...formData, course: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>GPA / Grade</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="e.g. 3.8"
                                    value={formData.gpa}
                                    onChange={e => setFormData({ ...formData, gpa: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Year</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    value={formData.year}
                                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" style={buttonStyle}>
                            Issue Credential
                        </button>

                        {message && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                color: message.type === 'success' ? '#047857' : '#b91c1c',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <CheckCircle size={16} />
                                {message.text}
                            </div>
                        )}
                    </form>
                </div>

                {/* Right Column: Recent Activity / Issued List */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <FileText size={24} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Recently Issued</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {issuedMarksheets.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No marksheets issued yet.</p>
                        ) : (
                            issuedMarksheets.slice().reverse().map(m => {
                                const student = students.find(s => s.id === m.studentId);
                                return (
                                    <div key={m.id} style={itemStyle}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                                            <User size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '500' }}>{student?.name || 'Unknown Student'}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{m.course}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold' }}>{m.gpa}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Year: {m.year}</div>
                                        </div>
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
    border: '1px solid var(--border-color)'
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

const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border-color)',
};

export default UniversityDashboard;
