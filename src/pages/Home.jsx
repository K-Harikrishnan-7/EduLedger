import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../context/MockBlockchainContext';
import { GraduationCap, Building2, Briefcase } from 'lucide-react';

const Home = () => {
    const { login } = useBlockchain();
    const navigate = useNavigate();

    const handleLogin = (role) => {
        navigate(`/login?role=${role}`);
    };

    return (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
                Verify Credentials on Chain
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '4rem', maxWidth: '600px', margin: '0 auto 4rem auto' }}>
                A decentralized platform for universities to issue marksheets and companies to verify them with student consent.
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Student Card */}
                <div className="role-card" style={cardStyle} onClick={() => handleLogin('student')}>
                    <div style={iconContainerStyle}>
                        <GraduationCap size={40} color="white" />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Student</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Access your wallet, view marksheets, and manage consent.</p>
                </div>

                {/* University Card */}
                <div className="role-card" style={cardStyle} onClick={() => handleLogin('university')}>
                    <div style={{ ...iconContainerStyle, backgroundColor: '#ea580c' }}>
                        <Building2 size={40} color="white" />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>University</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Issue academic credentials and marksheets to students.</p>
                </div>

                {/* Company Card */}
                <div className="role-card" style={cardStyle} onClick={() => handleLogin('company')}>
                    <div style={{ ...iconContainerStyle, backgroundColor: '#059669' }}>
                        <Briefcase size={40} color="white" />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Company</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Request access and verify candidate credentials.</p>
                </div>
            </div>
        </div>
    );
};

const cardStyle = {
    backgroundColor: 'var(--surface-color)',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: 'var(--shadow)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid transparent'
};

const iconContainerStyle = {
    backgroundColor: 'var(--primary-color)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem auto'
};

export default Home;
