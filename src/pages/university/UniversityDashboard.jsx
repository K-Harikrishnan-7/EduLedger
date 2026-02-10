import React, { useState } from 'react';
import { useBlockchain } from '../../context/MockBlockchainContext';
import { Upload, FileText, CheckCircle, User, Plus, Trash2, Eye } from 'lucide-react';
import { generateMarksheetPDF, downloadPDF } from '../../utils/pdfGenerator';
import { calculateCGPA, getAvailableGrades } from '../../utils/gradeCalculator';

const UniversityDashboard = () => {
    const { currentUser, getStudentsList, issueMarksheet, marksheets, users } = useBlockchain();
    const students = getStudentsList();

    // Form state
    const [formData, setFormData] = useState({
        studentId: '',
        year: new Date().getFullYear().toString(),
        courses: [{ courseCode: '', courseName: '', semester: '', credits: '', grade: '' }],
        cgpa: ''
    });

    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pdfPreview, setPdfPreview] = useState(null);

    const issuedMarksheets = marksheets.filter(m => m.universityId === currentUser.id);
    const grades = getAvailableGrades();

    // Add new course row
    const addCourse = () => {
        setFormData({
            ...formData,
            courses: [...formData.courses, { courseCode: '', courseName: '', semester: '', credits: '', grade: '' }]
        });
    };

    // Remove course row
    const removeCourse = (index) => {
        if (formData.courses.length === 1) {
            setMessage({ type: 'error', text: 'At least one course is required!' });
            setTimeout(() => setMessage(null), 2000);
            return;
        }
        const newCourses = formData.courses.filter((_, i) => i !== index);
        setFormData({ ...formData, courses: newCourses });
        updateCGPA(newCourses);
    };

    // Update course data
    const updateCourse = (index, field, value) => {
        const newCourses = [...formData.courses];
        newCourses[index][field] = value;
        setFormData({ ...formData, courses: newCourses });

        // Auto-calculate CGPA when grade or credits change
        if (field === 'grade' || field === 'credits') {
            updateCGPA(newCourses);
        }
    };

    // Update CGPA based on courses
    const updateCGPA = (courses) => {
        const validCourses = courses.filter(c => c.grade && c.credits);
        if (validCourses.length > 0) {
            const cgpa = calculateCGPA(validCourses);
            setFormData(prev => ({ ...prev, cgpa: cgpa.toString() }));
        }
    };

    // Preview PDF before submission
    const handlePreview = async () => {
        if (!validateForm()) return;

        const student = students.find(s => s.id === formData.studentId);
        if (!student) {
            setMessage({ type: 'error', text: 'Student not found!' });
            return;
        }

        try {
            setLoading(true);
            const pdfBlob = await generateMarksheetPDF({
                university: {
                    name: currentUser.name,
                    address: currentUser.address || 'University Address'
                },
                student: {
                    name: student.name,
                    rollNumber: student.rollNumber || 'N/A',
                    dob: student.dob || 'N/A',
                    department: student.department || 'N/A'
                },
                year: formData.year,
                courses: formData.courses,
                cgpa: formData.cgpa,
                issuedDate: new Date().toISOString().split('T')[0],
                verificationNote: `Digitally verified by ${currentUser.name}`
            });

            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPdfPreview({ url: pdfUrl, blob: pdfBlob });
            setLoading(false);
        } catch (error) {
            setLoading(false);
            setMessage({ type: 'error', text: 'PDF generation failed!' });
        }
    };

    // Validate form
    const validateForm = () => {
        if (!formData.studentId || !formData.year) {
            setMessage({ type: 'error', text: 'Please fill all required fields!' });
            setTimeout(() => setMessage(null), 3000);
            return false;
        }

        const incompleteCourses = formData.courses.filter(
            c => !c.courseCode || !c.courseName || !c.semester || !c.credits || !c.grade
        );

        if (incompleteCourses.length > 0) {
            setMessage({ type: 'error', text: 'Please complete all course details!' });
            setTimeout(() => setMessage(null), 3000);
            return false;
        }

        return true;
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setLoading(true);
            setMessage({ type: 'info', text: 'Generating PDF...' });

            const student = students.find(s => s.id === formData.studentId);

            // Generate PDF
            const pdfBlob = pdfPreview?.blob || await generateMarksheetPDF({
                university: {
                    name: currentUser.name,
                    address: currentUser.address || 'University Address'
                },
                student: {
                    name: student.name,
                    rollNumber: student.rollNumber || 'N/A',
                    dob: student.dob || 'N/A',
                    department: student.department || 'N/A'
                },
                year: formData.year,
                courses: formData.courses,
                cgpa: formData.cgpa,
                issuedDate: new Date().toISOString().split('T')[0],
                verificationNote: `Digitally verified by ${currentUser.name}`
            });

            // Create blob URL for PDF
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Issue marksheet with PDF URL
            const marksheet = issueMarksheet(formData.studentId, {
                year: formData.year,
                courses: formData.courses,
                cgpa: formData.cgpa,
                pdfUrl: pdfUrl,
                ipfsHash: `hash_${Date.now()}` // Mock hash for compatibility
            });

            setMessage({ type: 'success', text: 'Marksheet issued successfully!' });

            // Reset form
            setFormData({
                studentId: '',
                year: new Date().getFullYear().toString(),
                courses: [{ courseCode: '', courseName: '', semester: '', credits: '', grade: '' }],
                cgpa: ''
            });
            setPdfPreview(null);
            setLoading(false);

            setTimeout(() => setMessage(null), 5000);
        } catch (error) {
            setLoading(false);
            console.error('Marksheet submission error:', error);
            setMessage({ type: 'error', text: `Failed to issue marksheet! Error: ${error.message}` });
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>University Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Issue verified credentials to students.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: pdfPreview ? '1fr 1fr' : '1fr', gap: '2rem' }}>
                {/* Left Column: Issue Form */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Upload className="text-primary-600" size={24} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Issue New Marksheet</h3>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Student Selection */}
                        <div>
                            <label style={labelStyle}>Select Student *</label>
                            <select
                                style={inputStyle}
                                value={formData.studentId}
                                onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                required
                            >
                                <option value="">-- Choose Student --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} - {s.rollNumber || s.wallet}
                                    </option>
                                ))}
                            </select>
                        </div>



                        {/* Year */}
                        <div>
                            <label style={labelStyle}>Academic Year *</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={formData.year}
                                onChange={e => setFormData({ ...formData, year: e.target.value })}
                                required
                            />
                        </div>

                        {/* Courses */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={labelStyle}>Courses *</label>
                                <button type="button" onClick={addCourse} style={addButtonStyle}>
                                    <Plus size={16} /> Add Course
                                </button>
                            </div>

                            {formData.courses.map((course, index) => (
                                <div key={index} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 2fr 0.5fr 0.5fr 0.5fr auto',
                                    gap: '0.5rem',
                                    marginBottom: '0.75rem',
                                    alignItems: 'end'
                                }}>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="Code"
                                        value={course.courseCode}
                                        onChange={e => updateCourse(index, 'courseCode', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="Course Name"
                                        value={course.courseName}
                                        onChange={e => updateCourse(index, 'courseName', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        placeholder="Sem"
                                        min="1"
                                        max="8"
                                        value={course.semester}
                                        onChange={e => updateCourse(index, 'semester', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        placeholder="Credits"
                                        min="1"
                                        max="6"
                                        value={course.credits}
                                        onChange={e => updateCourse(index, 'credits', e.target.value)}
                                        required
                                    />
                                    <select
                                        style={inputStyle}
                                        value={course.grade}
                                        onChange={e => updateCourse(index, 'grade', e.target.value)}
                                        required
                                    >
                                        <option value="">Grade</option>
                                        {grades.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeCourse(index)}
                                        style={removeButtonStyle}
                                        disabled={formData.courses.length === 1}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* CGPA Display */}
                        <div style={{ backgroundColor: '#f0f9ff', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #bae6fd' }}>
                            <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Calculated CGPA</label>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                {formData.cgpa || '--'}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button type="button" onClick={handlePreview} style={previewButtonStyle} disabled={loading}>
                                <Eye size={16} /> Preview PDF
                            </button>
                            <button type="submit" style={buttonStyle} disabled={loading}>
                                {loading ? 'Processing...' : 'Issue Credential'}
                            </button>
                        </div>

                        {message && (
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                backgroundColor: message.type === 'success' ? '#ecfdf5' : message.type === 'error' ? '#fef2f2' : '#eff6ff',
                                color: message.type === 'success' ? '#047857' : message.type === 'error' ? '#b91c1c' : '#1e40af',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {message.type === 'success' && <CheckCircle size={16} />}
                                {message.text}
                            </div>
                        )}
                    </form>
                </div>

                {/* PDF Preview Column */}
                {pdfPreview && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.25rem' }}>PDF Preview</h3>
                            <button
                                onClick={() => downloadPDF(pdfPreview.blob, `marksheet_${formData.year}.pdf`)}
                                style={{ ...previewButtonStyle, padding: '0.5rem 1rem' }}
                            >
                                Download
                            </button>
                        </div>
                        <iframe
                            src={pdfPreview.url}
                            style={{ width: '100%', height: '600px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                            title="PDF Preview"
                        />
                    </div>
                )}

                {/* Recently Issued (full width when no preview) */}
                {!pdfPreview && (
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
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                    {m.courses?.length || 0} courses
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold' }}>CGPA: {m.cgpa}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Year: {m.year}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
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
    transition: 'background-color 0.2s',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
};

const previewButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'white',
    color: 'var(--primary-color)',
    border: '1px solid var(--primary-color)'
};

const addButtonStyle = {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--secondary-color)',
    color: 'white',
    fontWeight: '500',
    fontSize: '0.875rem',
    borderRadius: 'var(--radius)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
};

const removeButtonStyle = {
    padding: '0.625rem',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
