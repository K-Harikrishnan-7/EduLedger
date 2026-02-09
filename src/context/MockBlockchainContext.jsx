import React, { createContext, useContext, useState, useEffect } from 'react';

const MockBlockchainContext = createContext();

export const useBlockchain = () => useContext(MockBlockchainContext);

export const MockBlockchainProvider = ({ children }) => {
  // --- MOCK DATA ---
  const [users] = useState([
    { id: 'u1', name: 'Stanford University', role: 'university', wallet: '0xUniversity', password: 'pass' },
    { id: 'u2', name: 'MIT', role: 'university', wallet: '0xMIT', password: 'pass' },
    { id: 's1', name: 'Harikrishnan', role: 'student', wallet: '0xStudent1', password: 'pass' },
    { id: 's2', name: 'Harish', role: 'student', wallet: '0xStudent2', password: 'pass' },
    { id: 'c1', name: 'Google', role: 'company', wallet: '0xGoogle', password: 'pass' },
    { id: 'c2', name: 'Microsoft', role: 'company', wallet: '0xMicrosoft', password: 'pass' },
  ]);

  const [currentUser, setCurrentUser] = useState(null); // Simulated login

  const [marksheets, setMarksheets] = useState([
    {
      id: 'm1',
      studentId: 's1',
      universityId: 'u1',
      course: 'Computer Science',
      gpa: '3.8',
      year: '2023',
      issuedDate: '2023-05-20',
      tokenHash: '0xabc123...',
    }
  ]);

  const [consentRequests, setConsentRequests] = useState([
    {
      id: 'r1',
      companyId: 'c1',
      studentId: 's1',
      status: 'pending', // pending, approved, rejected
      requestDate: '2023-10-01',
    }
  ]);

  // --- ACTIONS ---

  const login = (id, password, role) => {
    const user = users.find(u => u.id === id && u.role === role);
    if (user && user.password === password) {
      setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const logout = () => setCurrentUser(null);

  const issueMarksheet = (studentId, data) => {
    const newMarksheet = {
      id: `m${Date.now()}`,
      studentId,
      universityId: currentUser.id,
      ...data,
      issuedDate: new Date().toISOString().split('T')[0],
      tokenHash: `0x${Math.random().toString(16).slice(2)}`,
    };
    setMarksheets(prev => [...prev, newMarksheet]);
    return newMarksheet;
  };

  const requestConsent = (studentId) => {
    const newRequest = {
      id: `r${Date.now()}`,
      companyId: currentUser.id,
      studentId,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0],
    };
    setConsentRequests(prev => [...prev, newRequest]);
  };

  const respondToConsent = (requestId, status) => {
    setConsentRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, status } : req
    ));
  };

  const getStudentMarksheets = (studentId) => {
    return marksheets.filter(m => m.studentId === studentId);
  };

  const getCompanyRequests = (companyId) => {
    return consentRequests.filter(r => r.companyId === companyId);
  };

  const getStudentRequests = (studentId) => {
    const requests = consentRequests.filter(r => r.studentId === studentId);
    // Enrich with company name
    return requests.map(r => ({
      ...r,
      companyName: users.find(u => u.id === r.companyId)?.name || 'Unknown Company'
    }));
  };

  const getAccessibleMarksheets = (companyId) => {
    // Find requests approved for this company
    const approvedRequests = consentRequests.filter(r => r.companyId === companyId && r.status === 'approved');

    // Get marksheets for those students
    // Flatten list
    const accessible = [];
    approvedRequests.forEach(req => {
      const studentMarks = marksheets.filter(m => m.studentId === req.studentId);
      const student = users.find(u => u.id === req.studentId);
      studentMarks.forEach(sm => {
        accessible.push({ ...sm, studentName: student?.name });
      });
    });
    return accessible;
  };

  const getStudentsList = () => users.filter(u => u.role === 'student');


  return (
    <MockBlockchainContext.Provider value={{
      users,
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
      getStudentsList
    }}>
      {children}
    </MockBlockchainContext.Provider>
  );
};
