import React, { useState, useRef, useEffect } from 'react';
import { useBlockchain } from '../../context/AppContext';
import { useWeb3 } from '../../context/Web3Context';
import { Upload, FileText, User, Wallet, CheckCircle, X } from 'lucide-react';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../../services/ipfsService';
import { generateCredentialMetadata } from '../../utils/metadataGenerator';

const UniversityDashboard = () => {
    const { currentUser, getStudentsList, issueMarksheet, marksheets } = useBlockchain();
    const { isConnected, contracts, connectWallet, isConnecting, shortAccount, account, error, chainId, isWalletMatch } = useWeb3();
    const fileInputRef = useRef(null);

    // Cascading selectors
    const [degrees, setDegrees] = useState([]);
    const [selectedDegree, setSelectedDegree] = useState('');
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [students, setStudents] = useState([]);

    const [studentId, setStudentId] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const EXPECTED_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '31337';
    const token = () => localStorage.getItem('eduleger_token');

    // Load degrees on mount
    useEffect(() => {
        fetch(`${API_BASE}/university/degrees`)
            .then(r => r.json())
            .then(data => setDegrees(Array.isArray(data) ? data : []))
            .catch(() => setDegrees([]));
    }, []);

    useEffect(() => {
        console.log("Department Effect Triggered", { selectedDegree, universityId: currentUser?.universityId });
        if (!selectedDegree || !currentUser?.universityId) return;
        setSelectedDept('');
        setStudentId('');

        const deg = degrees.find(d => d.name === selectedDegree);
        const query = deg ? `&degree_id=${deg.id}` : '';
        const url = `${API_BASE}/university/departments?university_id=${currentUser.universityId}${query}`;

        console.log("Fetching departments from:", url);

        fetch(url)
            .then(r => r.json())
            .then(data => {
                console.log("Departments Response:", data);
                setDepartments(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.error("Departments Fetch Error:", err);
                setDepartments([]);
            });
    }, [selectedDegree, degrees, currentUser, API_BASE]);

    // Load students when department is selected
    useEffect(() => {
        if (!selectedDept) return;
        setStudentId('');

        const dept = departments.find(d => d.name === selectedDept);
        if (dept) {
            getStudentsList(dept.id).then(setStudents).catch(() => setStudents([]));
        } else {
            setStudents([]);
        }
    }, [selectedDept, departments, getStudentsList]);

    // Use universityId (not generic user id) for filtering
    const issuedMarksheets = marksheets.filter(m => m.universityId === currentUser?.universityId);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setMessage({ type: 'error', text: 'Only PDF files are accepted.' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'File size must be under 10 MB.' });
            return;
        }
        setSelectedFile(file);
        setFilePreviewUrl(URL.createObjectURL(file));
        setMessage(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileChange({ target: { files: [file] } });
    };

    const clearFile = () => {
        setSelectedFile(null);
        setFilePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!studentId) { setMessage({ type: 'error', text: 'Please select a student.' }); return; }
        if (!selectedFile) { setMessage({ type: 'error', text: 'Please upload a marksheet PDF.' }); return; }

        const student = students.find(s => s.id === studentId);
        if (!student) { setMessage({ type: 'error', text: 'Selected student not found.' }); return; }

        setLoading(true);

        try {
            let pdfUrl = URL.createObjectURL(selectedFile);
            let ipfsHash = `local_${Date.now()}`;
            let metadataUri = null;
            let tokenId = null;
            let ipfsUsed = false;

            // ── Step 1: Try IPFS upload (Pinata) — optional ───────────────────
            if (import.meta.env.VITE_PINATA_JWT) {
                setLoadingStep('📤 Uploading PDF to IPFS...');
                try {
                    const pdfResult = await uploadFileToIPFS(
                        selectedFile,
                        `marksheet_${student.rollNumber || student.id}_${year}.pdf`
                    );
                    if (pdfResult.success) {
                        ipfsHash = pdfResult.ipfsHash;
                        pdfUrl = pdfResult.gatewayUrl;

                        setLoadingStep('📋 Uploading metadata to IPFS...');
                        const metadata = generateCredentialMetadata(
                            { name: student.name, rollNumber: student.rollNumber || student.id, department: selectedDept, degree: selectedDegree },
                            { year, description },
                            ipfsHash
                        );
                        const metaResult = await uploadJSONToIPFS(metadata, `meta_${student.id}_${year}`);
                        if (metaResult.success) {
                            metadataUri = metaResult.ipfsUrl;
                            ipfsUsed = true;
                        }
                    }
                } catch (ipfsErr) {
                    console.warn('IPFS upload failed, falling back to embedded metadata:', ipfsErr.message);
                }
            }

            // ── Step 2: Build embedded metadata if IPFS wasn't used ──────────
            if (!metadataUri) {
                const metadata = generateCredentialMetadata(
                    { name: student.name, rollNumber: student.rollNumber || student.id, department: selectedDept, degree: selectedDegree },
                    { year, description },
                    ipfsHash
                );
                // Encode as data URI so it's always readable on-chain
                const jsonStr = JSON.stringify(metadata);
                const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
                metadataUri = `data:application/json;base64,${b64}`;
            }

            // ── Step 3: Mint SBT ──────────────────────────────────────────────
            if (isConnected && contracts?.credential && student.wallet) {
                setLoadingStep(`⛓️ Minting Soulbound Token on ${EXPECTED_CHAIN_ID === '11155111' ? 'Sepolia' : 'Hardhat'}...`);
                try {
                    const tx = await contracts.credential.mintCredential(student.wallet, metadataUri);
                    setLoadingStep('⏳ Waiting for block confirmation...');
                    const receipt = await tx.wait();
                    const event = receipt.logs?.find(l => l.fragment?.name === 'CredentialIssued');
                    tokenId = event ? event.args?.tokenId?.toString() : 'minted';
                    console.log('✅ SBT minted! Token:', tokenId, '| To:', student.wallet);
                } catch (txErr) {
                    console.error('SBT mint failed:', txErr.message);
                    setMessage({ type: 'error', text: `Mint failed: ${txErr.message.slice(0, 120)}` });
                    setLoading(false);
                    setLoadingStep('');
                    return;
                }
            } else if (!isConnected) {
                setMessage({ type: 'error', text: 'Please connect MetaMask to mint an SBT.' });
                setLoading(false);
                setLoadingStep('');
                return;
            } else if (!student.wallet) {
                setMessage({ type: 'error', text: `Student "${student.name}" has no registered wallet address. Please update it in the database.` });
                setLoading(false);
                setLoadingStep('');
                return;
            }

            // Save record locally
            issueMarksheet(studentId, {
                year, description,
                fileName: selectedFile.name,
                pdfUrl, ipfsHash,
                tokenId,
                mintedOnChain: !!tokenId,
            });

            setMessage({
                type: 'success',
                text: tokenId
                    ? `✅ SBT minted! Token #${tokenId} → ${student.name}'s wallet${ipfsUsed ? ' | Metadata on IPFS' : ' | Metadata embedded'}`
                    : '✅ Marksheet uploaded!'
            });

            setSelectedDegree('');
            setSelectedDept('');
            setStudentId('');
            setYear(new Date().getFullYear().toString());
            setDescription('');
            clearFile();
            setTimeout(() => setMessage(null), 8000);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: `Upload failed: ${err.message}` });
        } finally {
            setLoading(false);
            setLoadingStep('');
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>University Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Upload verified marksheets to students.</p>
            </div>

            {/* Wallet Banner */}
            {(() => {
                const registeredWallet = currentUser?.wallet_address;
                const walletOk = isConnected && isWalletMatch(registeredWallet);
                const wrongWallet = isConnected && !isWalletMatch(registeredWallet);
                const shortExpected = registeredWallet ? `${registeredWallet.slice(0, 6)}...${registeredWallet.slice(-4)}` : null;
                return (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem',
                        backgroundColor: walletOk ? '#d1fae5' : wrongWallet ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${walletOk ? '#6ee7b7' : wrongWallet ? '#fecaca' : '#fcd34d'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <Wallet size={16} />
                            {walletOk && <><strong>Wallet:</strong> {shortAccount} &nbsp;|&nbsp; SBT minting <strong style={{ color: '#059669' }}>ENABLED ⛓</strong></>}
                            {wrongWallet && <><strong style={{ color: '#b91c1c' }}>⚠ Wrong account!</strong>&nbsp; Switch MetaMask to <code style={{ backgroundColor: '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{shortExpected}</code> (Account 1 in Hardhat)</>}
                            {!isConnected && <>Connect MetaMask to enable on-chain SBT minting</>}
                        </div>
                        {error && <span style={{ fontSize: '0.8rem', color: '#b91c1c' }}>⚠️ {error}</span>}
                        {isConnected && chainId && String(chainId) !== String(EXPECTED_CHAIN_ID) && (
                            <span style={{ fontSize: '0.8rem', color: '#92400e' }}
                            >⚠️ Switch to {EXPECTED_CHAIN_ID === '11155111' ? 'Sepolia (11155111)' : 'Hardhat Local (31337)'}</span>
                        )}
                        {!isConnected && (
                            <button onClick={connectWallet} disabled={isConnecting} style={walletBtnStyle}>
                                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        )}
                    </div>
                );
            })()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                {/* Upload Form */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Upload size={24} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Upload Marksheet</h3>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Step 1: Degree */}
                        <div>
                            <label style={labelStyle}>Degree *</label>
                            <select
                                style={inputStyle}
                                value={selectedDegree}
                                onChange={e => setSelectedDegree(e.target.value)}
                                required
                            >
                                <option value="">-- Select Degree --</option>
                                {degrees.map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Step 2: Department (enabled after degree) */}
                        <div>
                            <label style={labelStyle}>Department *</label>
                            <select
                                style={{ ...inputStyle, opacity: selectedDegree ? 1 : 0.5 }}
                                value={selectedDept}
                                onChange={e => setSelectedDept(e.target.value)}
                                disabled={!selectedDegree}
                                required
                            >
                                <option value="">-- Select Department --</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                            {!selectedDegree && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Select a degree first</p>
                            )}
                        </div>

                        {/* Step 3: Student (enabled after department) */}
                        <div>
                            <label style={labelStyle}>Select Student *</label>
                            <select
                                style={{ ...inputStyle, opacity: selectedDept ? 1 : 0.5 }}
                                value={studentId}
                                onChange={e => setStudentId(e.target.value)}
                                disabled={!selectedDept}
                                required
                            >
                                <option value="">-- Choose Student --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.rollNumber || s.id})
                                    </option>
                                ))}
                            </select>
                            {!selectedDept && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Select a department first</p>
                            )}
                        </div>

                        {/* Academic Year */}
                        <div>
                            <label style={labelStyle}>Academic Year *</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                min="2000" max="2100"
                                required
                            />
                        </div>

                        {/* Description (optional) */}
                        <div>
                            <label style={labelStyle}>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. Final Year Consolidated Marksheet"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        {/* PDF Upload Drop Zone */}
                        <div>
                            <label style={labelStyle}>Marksheet PDF *</label>
                            {selectedFile ? (
                                <div style={fileSelectedStyle}>
                                    <FileText size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {selectedFile.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                    <button type="button" onClick={clearFile} style={clearBtnStyle}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    style={dropZoneStyle}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                                        <strong style={{ color: 'var(--primary-color)' }}>Click to upload</strong> or drag & drop
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>PDF only, max 10 MB</p>
                                    <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                                </div>
                            )}
                        </div>

                        {/* Status / Progress */}
                        {loading && loadingStep && (
                            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#eff6ff', color: '#1e40af', fontSize: '0.875rem' }}>
                                {loadingStep}
                            </div>
                        )}

                        {message && (
                            <div style={{
                                padding: '0.75rem', borderRadius: 'var(--radius)',
                                backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                color: message.type === 'success' ? '#047857' : '#b91c1c',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
                            }}>
                                {message.type === 'success' && <CheckCircle size={16} />}
                                {message.text}
                            </div>
                        )}

                        <button type="submit" style={buttonStyle} disabled={loading || !selectedFile}>
                            {loading ? 'Uploading...' : 'Upload & Issue Credential'}
                        </button>
                    </form>
                </div>

                {/* PDF Preview Removed */}

                {/* Recently Issued (always shown) */}
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
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={20} style={{ color: 'var(--primary-color)' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{student?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {m.description || 'Marksheet'} • Year {m.year}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                            {m.mintedOnChain && (
                                                <span style={{ fontSize: '0.7rem', color: '#6366f1', backgroundColor: '#ede9fe', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                                                    ⛓ SBT #{m.tokenId}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => window.open(m.pdfUrl, '_blank')}
                                                style={{ fontSize: '0.75rem', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                            >
                                                View PDF
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div >
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
    boxSizing: 'border-box'
};

const dropZoneStyle = {
    border: '2px dashed var(--border-color)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'border-color 0.2s',
};

const fileSelectedStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    border: '1px solid #a5b4fc',
    borderRadius: 'var(--radius)',
    backgroundColor: '#f5f3ff',
};

const clearBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    padding: '0.25rem',
};

const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    fontWeight: '600',
    borderRadius: 'var(--radius)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
};

const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border-color)',
};

const walletBtnStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
};

export default UniversityDashboard;
