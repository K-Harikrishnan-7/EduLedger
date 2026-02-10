import React, { createContext, useContext, useState, useEffect } from 'react';

const MockBlockchainContext = createContext();

export const useBlockchain = () => useContext(MockBlockchainContext);

export const MockBlockchainProvider = ({ children }) => {
  // --- MOCK DATA ---
  const [users] = useState([
    // Universities with complete details
    {
      id: 'u1',
      name: 'Rajalakshmi Engineering College',
      address: 'Rajalakshmi Nagar, Thandalam, Tamil Nadu 602105',
      role: 'university',
      wallet: '0xUniversity',
      password: 'pass'
    },
    {
      id: 'u2',
      name: 'MIT',
      address: '77 Massachusetts Ave, Cambridge, MA 02139',
      role: 'university',
      wallet: '0xMIT',
      password: 'pass'
    },
    // Students with complete profiles
    {
      id: 's1',
      name: 'Harikrishnan',
      rollNumber: 'STU2023001',
      dob: '2005-05-15',
      batchYear: '2022',
      department: 'Computer Science and Engineering',
      role: 'student',
      wallet: '0xStudent1',
      password: 'pass'
    },
    {
      id: 's2',
      name: 'Harish',
      rollNumber: 'STU2023002',
      dob: '2005-08-22',
      batchYear: '2022',
      department: 'Electronics and Communication Engineering',
      role: 'student',
      wallet: '0xStudent2',
      password: 'pass'
    },
    // Companies
    { id: 'c1', name: 'Google', role: 'company', wallet: '0xGoogle', password: 'pass' },
    { id: 'c2', name: 'Microsoft', role: 'company', wallet: '0xMicrosoft', password: 'pass' },
  ]);

  const [currentUser, setCurrentUser] = useState(null); // Simulated login

  const [marksheets, setMarksheets] = useState([]);

  const [consentRequests, setConsentRequests] = useState([]);

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
      year: data.year,
      courses: data.courses || [],
      cgpa: data.cgpa,
      issuedDate: new Date().toISOString().split('T')[0],
      ipfsHash: data.ipfsHash || `Qm${Math.random().toString(36).slice(2)}`,
      pdfUrl: data.pdfUrl || '',
      tokenHash: `0x${Math.random().toString(16).slice(2)}`,
      digitalSignature: `Digitally verified by ${currentUser.name}`
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
