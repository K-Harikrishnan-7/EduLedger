import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../../context/AppContext';
import { useWeb3 } from '../../context/Web3Context';
import { Search, ShieldCheck, Clock, User, FileText, Wallet, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import ConsentManagerArtifact from '../../contracts/artifacts/contracts/ConsentManager.sol/ConsentManager.json';
import contractAddresses from '../../contracts/addresses.json';
import { Contract, JsonRpcProvider } from 'ethers';
import { resolveIPFSUrl } from '../../services/ipfsService';
import AcademicCredentialSBTArtifact from '../../contracts/artifacts/contracts/AcademicCredentialSBT.sol/AcademicCredentialSBT.json';
import CredentialNFTModal from '../../components/CredentialNFTModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const EXPECTED_CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '31337';
const CONTRACT_NETWORK = EXPECTED_CHAIN_ID === '11155111' ? 'sepolia' : 'localhost';

const CompanyDashboard = () => {
    const { currentUser, authHeaders } = useBlockchain();
    const { isConnected, connectWallet, isConnecting, shortAccount, account, error, chainId, isWalletMatch, contracts } = useWeb3();

    const [enrollmentInput, setEnrollmentInput] = useState('');
    const [message, setMessage] = useState(null);
    const [txStep, setTxStep] = useState('');
    const [consentRequests, setConsentRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [studentCredentials, setStudentCredentials] = useState({});
    const [loadingCreds, setLoadingCreds] = useState({});
    const [viewingPDF, setViewingPDF] = useState(null);

    const registeredWallet = currentUser?.wallet_address;
    const walletOk = isConnected && isWalletMatch(registeredWallet);
    const wrongWallet = isConnected && !isWalletMatch(registeredWallet);

    const loadRequests = async () => {
        try {
            const token = localStorage.getItem('eduleger_token');
            if (!token) return;
            const res = await fetch(`${API_BASE}/consent/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setConsentRequests(await res.json());
        } catch { /* silent */ } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => { loadRequests(); }, [currentUser?.id]);

    const myRequests = consentRequests;
    const approvedRequests = consentRequests.filter(r => r.status === 'approved');

    const marksheetsByStudent = {};
    approvedRequests.forEach(r => {
        if (!marksheetsByStudent[r.student_id]) {
            marksheetsByStudent[r.student_id] = {
                studentName: r.student_name || r.student_enrollment || r.student_id,
                studentId: r.student_id,
                walletAddress: r.student_wallet || null
            };
        }
    });

    const loadStudentCredentials = async (studentId, studentWallet) => {
        if (!studentWallet || typeof studentWallet !== 'string' || !studentWallet.startsWith('0x')) {
            alert('Student wallet address missing or invalid.');
            return;
        }

        setLoadingCreds(prev => ({ ...prev, [studentId]: true }));
        try {
            const provider = new JsonRpcProvider(RPC_URL);
            const credContract = new Contract(
                contractAddresses[CONTRACT_NETWORK].AcademicCredentialSBT,
                AcademicCredentialSBTArtifact.abi,
                provider
            );

            const tokenIds = await credContract.getStudentCredentials(studentWallet);
            const creds = await Promise.all(
                tokenIds.map(async (id) => {
                    const cred = await credContract.getCredential(id);
                    let metadata = {};
                    try {
                        const uri = cred.metadataURI;
                        if (uri.startsWith('data:application/json;base64,')) {
                            const json = decodeURIComponent(escape(atob(uri.split(',')[1])));
                            metadata = JSON.parse(json);
                        } else {
                            const metaUrl = resolveIPFSUrl(uri);
                            const res = await fetch(metaUrl);
                            metadata = await res.json();
                        }
                    } catch { /* ignore */ }

                    // Helper to extract specific trait
                    const attr = (traitType) =>
                        metadata.attributes?.find(a => a.trait_type === traitType)?.value || '';

                    return {
                        id: id.toString(),
                        tokenId: id.toString(), // ensure tokenId is always present
                        isRevoked: cred.isRevoked,
                        description: metadata.description || metadata.name || 'Academic Credential',
                        studentName: attr('Student Name'),
                        rollNumber: attr('Roll Number'),
                        department: attr('Department'),
                        cgpa: attr('CGPA'),
                        year: attr('Academic Year'),
                        degree: attr('Degree') || 'B.Tech',
                        issuedDate: cred.issuedDate
                            ? new Date(Number(cred.issuedDate) * 1000).toLocaleDateString()
                            : 'N/A',
                        pdfUrl: metadata.credential_pdf ? resolveIPFSUrl(metadata.credential_pdf) : (metadata.external_url ? resolveIPFSUrl(metadata.external_url) : null),
                    };
                })
            );

            setStudentCredentials(prev => ({
                ...prev,
                [studentId]: creds.filter(c => !c.isRevoked)
            }));
        } catch (err) {
            console.error('Failed to load student credentials:', err);
            alert('Failed to load credentials from blockchain.');
        } finally {
            setLoadingCreds(prev => ({ ...prev, [studentId]: false }));
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!enrollmentInput.trim()) return;
        if (!walletOk) {
            setMessage({ type: 'error', text: 'Connect the correct MetaMask account first (see wallet banner).' });
            return;
        }
        setMessage(null);
        setTxStep('');

        try {
            setTxStep('🔍 Resolving student wallet...');
            const token = localStorage.getItem('eduleger_token');
            const walletRes = await fetch(
                `${API_BASE}/consent/student-wallet?enrollment_no=${enrollmentInput.trim()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const walletData = await walletRes.json();
            if (!walletRes.ok) {
                setMessage({ type: 'error', text: walletData.error || 'Student not found.' });
                setTxStep('');
                return;
            }

            const studentWallet = walletData.wallet_address;
            const studentName = walletData.student_name;

            setTxStep('📝 Sending on-chain consent request (approve in MetaMask)...');
            let onChainId = null;
            try {
                const consentContract = contracts?.consent;
                if (!consentContract) throw new Error('ConsentManager contract not loaded');

                const tx = await consentContract.requestConsent(studentWallet, currentUser.name);
                setTxStep('⏳ Waiting for block confirmation...');
                const receipt = await tx.wait();

                const event = receipt.logs?.find(l => l.fragment?.name === 'ConsentRequested');
                onChainId = event?.args?.consentId ?? null;
            } catch (txErr) {
                console.error('On-chain tx failed:', txErr.message);
                setMessage({ type: 'error', text: `Transaction failed: ${txErr.message.slice(0, 150)}` });
                setTxStep('');
                return;
            }

            setTxStep('💾 Saving to database...');
            const dbRes = await fetch(`${API_BASE}/consent/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enrollment_no: enrollmentInput.trim(), on_chain_id: onChainId }),
            });
            const dbData = await dbRes.json();
            if (!dbRes.ok) {
                setMessage({ type: 'error', text: dbData.error || 'Saved on-chain but DB sync failed.' });
            } else {
                setMessage({ type: 'success', text: `✅ Consent request sent to ${studentName} on-chain!` });
                setEnrollmentInput('');
                loadRequests();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Cannot reach server.' });
        } finally {
            setTxStep('');
            setTimeout(() => setMessage(null), 6000);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Company Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Verify future employees.</p>
            </div>

            <WalletBanner
                isConnected={isConnected}
                walletOk={walletOk}
                wrongWallet={wrongWallet}
                shortAccount={shortAccount}
                registeredWallet={registeredWallet}
                connectWallet={connectWallet}
                isConnecting={isConnecting}
                error={error}
                chainId={chainId}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Search size={24} style={{ color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Request Verification Access</h3>
                    </div>

                    <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Enter the Student Enrollment Number to send an on-chain consent request (requires MetaMask).
                        </p>

                        <div>
                            <label style={labelStyle}>Student Enrollment Number</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. STU2024001"
                                value={enrollmentInput}
                                onChange={e => setEnrollmentInput(e.target.value)}
                            />
                        </div>

                        <button type="submit" style={{ ...buttonStyle, opacity: walletOk ? 1 : 0.6 }} disabled={!walletOk}>
                            {walletOk ? 'Send On-Chain Consent Request ⛓' : 'Connect Correct Wallet First'}
                        </button>

                        {txStep && (
                            <div style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#eff6ff', color: '#1e40af', fontSize: '0.875rem' }}>
                                {txStep}
                            </div>
                        )}
                        {message && (
                            <div style={{
                                padding: '0.75rem', borderRadius: 'var(--radius)',
                                backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                color: message.type === 'success' ? '#047857' : '#b91c1c',
                                border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                                fontSize: '0.875rem',
                            }}>
                                {message.text}
                            </div>
                        )}
                    </form>

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <Clock size={20} style={{ color: '#d97706' }} />
                            <h3 style={{ fontSize: '1.125rem' }}>Pending Requests</h3>
                        </div>
                        {loadingRequests ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
                        ) : myRequests.filter(r => r.status === 'pending').length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending requests.</p>
                        ) : (
                            myRequests.filter(r => r.status === 'pending').map(req => (
                                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <span style={{ fontSize: '0.875rem' }}>
                                            {req.student_name || req.student_enrollment || req.student_id}
                                        </span>
                                        {req.on_chain_id && (
                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#6366f1', backgroundColor: '#ede9fe', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                                                ⛓ on-chain
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Pending</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={24} style={{ color: 'var(--secondary-color)' }} />
                        <h3 style={{ fontSize: '1.25rem' }}>Verified Students</h3>
                    </div>

                    {Object.keys(marksheetsByStudent).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>
                            No verified access yet.<br />
                            <span style={{ fontSize: '0.8rem' }}>Request consent from a student and wait for approval.</span>
                        </p>
                    ) : (
                        Object.values(marksheetsByStudent).map(({ studentName, studentId, walletAddress }) => (
                            <div key={studentId} style={{ ...studentCardStyle, cursor: Object.keys(studentCredentials).includes(studentId) ? 'default' : 'pointer' }} onClick={() => loadStudentCredentials(studentId, walletAddress)}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ backgroundColor: '#d1fae5', padding: '0.5rem', borderRadius: '50%' }}>
                                            <User size={20} color="var(--secondary-color)" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{studentName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#059669' }}>✅ Consent approved</div>
                                        </div>
                                    </div>
                                </div>

                                {studentCredentials[studentId] && (
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {studentCredentials[studentId].length === 0 ? (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No valid credentials found on-chain.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                                {studentCredentials[studentId].map(cred => (
                                                    <div
                                                        key={cred.id}
                                                        onClick={() => setViewingPDF(cred)}
                                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cred.description || 'Academic Credential'}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#6366f1', marginTop: '0.2rem' }}>⛓ Token #{cred.id || cred.tokenId}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* NFT Detail Modal */}
            {viewingPDF && (
                <CredentialNFTModal
                    credential={viewingPDF}
                    contractAddress={contractAddresses[CONTRACT_NETWORK].AcademicCredentialSBT}
                    onClose={() => setViewingPDF(null)}
                />
            )}
        </div>
    );
};

const WalletBanner = ({ isConnected, walletOk, wrongWallet, shortAccount, registeredWallet, connectWallet, isConnecting, error, chainId }) => {
    const shortExpected = registeredWallet
        ? `${registeredWallet.slice(0, 6)}...${registeredWallet.slice(-4)}`
        : null;

    let bg = '#fef3c7', border = '#fcd34d', text = null;
    if (walletOk) { bg = '#d1fae5'; border = '#6ee7b7'; }
    if (wrongWallet) { bg = '#fef2f2'; border = '#fecaca'; }

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', backgroundColor: bg, border: `1px solid ${border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Wallet size={16} />
                    {walletOk && <><strong>Wallet:</strong> {shortAccount} &nbsp;|&nbsp; On-chain consent <strong style={{ color: '#059669' }}>enabled ⛓</strong></>}
                    {wrongWallet && <><AlertTriangle size={14} style={{ color: '#b91c1c' }} /> <strong style={{ color: '#b91c1c' }}>Wrong account!</strong> Switch MetaMask to <code style={{ backgroundColor: '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{shortExpected}</code></>}
                    {!isConnected && <><span>Connect MetaMask to send on-chain consent</span></>}
                </div>
                {!isConnected && (
                    <button onClick={connectWallet} disabled={isConnecting} style={walletBtnStyle}>
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                )}
            </div>
            {error && (
                <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.875rem' }}>
                    ⚠️ {error}
                </div>
            )}
            {(() => {
                const normalizedChainId = chainId != null ? chainId.toString() : null;
                const expectedChainId = EXPECTED_CHAIN_ID.toString();
                const isWrongNetwork = isConnected && normalizedChainId && normalizedChainId !== expectedChainId;
                return isWrongNetwork;
            })() && (
                <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', fontSize: '0.875rem' }}>
                    ⚠️ Wrong network! Switch MetaMask to <strong>{EXPECTED_CHAIN_ID === '11155111' ? 'Sepolia (Chain 11155111)' : 'Hardhat Local (Chain 31337)'}</strong>.
                </div>
            )}
        </>
    );
};

const cardStyle = { backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)', height: 'fit-content' };
const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--text-main)' };
const inputStyle = { width: '100%', padding: '0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: '600', borderRadius: 'var(--radius)', border: 'none', marginTop: '0.5rem', cursor: 'pointer' };
const studentCardStyle = { padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: '#f9fafb', marginBottom: '0.75rem' };
const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '2rem'
};

const modalContent = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '1rem',
    width: '100%',
    maxWidth: '800px',
    boxShadow: 'var(--shadow-lg)'
};

const walletBtnStyle = { padding: '0.5rem 1rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' };

export default CompanyDashboard;
