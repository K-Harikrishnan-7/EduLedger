import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useBlockchain } from '../context/MockBlockchainContext';
import { GraduationCap, Briefcase, Building2, LogOut } from 'lucide-react';

const MainLayout = () => {
    const { currentUser, logout } = useBlockchain();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isLanding = location.pathname === '/';

    return (
        <div className="layout-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                backgroundColor: 'var(--surface-color)',
                borderBottom: '1px solid var(--border-color)',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-color)', padding: '0.5rem', borderRadius: '0.5rem', color: 'white' }}>
                        <GraduationCap size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>EduLedger</h1>
                </div>

                {currentUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '500' }}>{currentUser.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{currentUser.role}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted)'
                            }}
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                )}
            </header>

            <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <Outlet />
            </main>

            <footer style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                borderTop: '1px solid var(--border-color)'
            }}>
                © 2026 EduLedger. Decentralized Academic Credentials.
            </footer>
        </div>
    );
};

export default MainLayout;
