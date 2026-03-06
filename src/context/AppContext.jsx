import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useApp = () => useContext(AppContext);
export const useBlockchain = () => useContext(AppContext); // backward-compatible alias

export const AppProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        // Restore session on page reload
        const stored = localStorage.getItem('eduleger_user');
        return stored ? JSON.parse(stored) : null;
    });

    const [marksheets, setMarksheets] = useState([]);
    const [consentRequests, setConsentRequests] = useState([]);

    // Helper: get auth headers
    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('eduleger_token')}`,
    });

    // ─── AUTH ────────────────────────────────────────────────────────────────
    const login = async (username, password) => {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) return { success: false, message: data.error || 'Invalid credentials' };

            localStorage.setItem('eduleger_token', data.token);
            const user = {
                id: data.userId,
                role: data.role,
                name: data.name || username,
                email: data.email,
                wallet_address: data.wallet_address,
                universityId: data.universityId,
                studentId: data.studentId,
                companyId: data.companyId,
                enrollment_no: data.enrollment_no,
            };
            localStorage.setItem('eduleger_user', JSON.stringify(user));
            setCurrentUser(user);
            return { success: true, role: data.role };
        } catch {
            return { success: false, message: 'Cannot connect to server. Is the backend running?' };
        }
    };

    const logout = () => {
        localStorage.removeItem('eduleger_token');
        localStorage.removeItem('eduleger_user');
        setCurrentUser(null);
        // Signal Web3Context to reset wallet state so a different role doesn't inherit it
        window.dispatchEvent(new CustomEvent('eduleger:logout'));
    };

    // ─── MARKSHEETS (kept for blockchain integration) ─────────────────────
    const issueMarksheet = (studentId, data) => {
        const newMarksheet = {
            id: `m${Date.now()}`,
            studentId,
            universityId: currentUser?.universityId,
            year: data.year,
            courses: data.courses || [],
            cgpa: data.cgpa,
            degree: data.degree,
            department: data.department,
            issuedDate: new Date().toISOString().split('T')[0],
            ipfsHash: data.ipfsHash || `local_${Date.now()}`,
            pdfUrl: data.pdfUrl || '',
            tokenId: data.tokenId || null,
            mintedOnChain: data.mintedOnChain || false,
            digitalSignature: `Digitally verified by ${currentUser?.name}`,
        };
        setMarksheets(prev => [...prev, newMarksheet]);
        return newMarksheet;
    };

    // ─── CONSENT (off-chain via DB API) ──────────────────────────────────
    const requestConsent = async (studentId) => {
        const res = await fetch(`${API_BASE}/consent/request`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ student_id: studentId }),
        });
        return res.json();
    };

    const respondToConsent = async (consentId, action) => {
        const endpoint = action === 'approved' ? 'approve' : 'revoke';
        const res = await fetch(`${API_BASE}/consent/${endpoint}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ consent_id: consentId }),
        });
        return res.json();
    };

    // ─── QUERIES ─────────────────────────────────────────────────────────
    const getStudentMarksheets = (studentId) =>
        marksheets.filter(m => m.studentId === studentId);

    const getCompanyRequests = (companyId) =>
        consentRequests.filter(r => r.companyId === companyId);

    const getStudentRequests = (studentId) =>
        consentRequests.filter(r => r.studentId === studentId);

    const getAccessibleMarksheets = (companyId) => {
        const approved = consentRequests.filter(
            r => r.companyId === companyId && r.status === 'approved'
        );
        return approved.flatMap(req =>
            marksheets
                .filter(m => m.studentId === req.studentId)
                .map(m => ({ ...m }))
        );
    };

    // Fetch students from backend (university sees only its own)
    const getStudentsList = useCallback(async (department_id) => {
        try {
            const query = department_id ? `?department_id=${department_id}` : '';
            const res = await fetch(`${API_BASE}/university/students${query}`, { headers: authHeaders() });
            return res.ok ? await res.json() : [];
        } catch {
            return [];
        }
    }, [authHeaders]);

    // Fetch degrees from backend
    const getDegrees = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/university/degrees`);
            return res.ok ? await res.json() : [];
        } catch {
            return [];
        }
    }, []);

    // Fetch departments for a university
    const getDepartments = useCallback(async (universityId) => {
        try {
            const res = await fetch(`${API_BASE}/university/departments?university_id=${universityId}`);
            return res.ok ? await res.json() : [];
        } catch {
            return [];
        }
    }, []);

    return (
        <AppContext.Provider value={{
            currentUser,
            login,
            logout,
            marksheets,
            issueMarksheet,
            consentRequests,
            requestConsent,
            respondToConsent,
            getStudentMarksheets,
            getStudentRequests,
            getAccessibleMarksheets,
            getCompanyRequests,
            getStudentsList,
            getDegrees,
            getDepartments,
            authHeaders,
        }}>
            {children}
        </AppContext.Provider>
    );
};

// Backward-compatible alias
export const MockBlockchainProvider = AppProvider;
