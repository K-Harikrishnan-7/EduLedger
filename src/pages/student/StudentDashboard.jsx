import React, { useState, useEffect } from 'react';
import { JsonRpcProvider, Contract } from 'ethers';
import { useBlockchain } from '../../context/AppContext';
import { useWeb3 } from '../../context/Web3Context';
import { Award, ShieldCheck, XCircle, CheckCircle, Clock, FileText, Wallet, AlertCircle, AlertTriangle } from 'lucide-react';
import { resolveIPFSUrl } from '../../services/ipfsService';
import AcademicCredentialSBTArtifact from '../../contracts/artifacts/contracts/AcademicCredentialSBT.sol/AcademicCredentialSBT.json';
import MarksheetTokenCard from '../../components/MarksheetTokenCard';
import ConsentManagerArtifact from '../../contracts/artifacts/contracts/ConsentManager.sol/ConsentManager.json';
import contractAddresses from '../../contracts/addresses.json';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const HARDHAT_RPC = 'http://127.0.0.1:8545';

const StudentDashboard = () => {
    const { currentUser, authHeaders } = useBlockchain();
    const { isConnected, connectWallet, isConnecting, shortAccount, account, error, chainId, isWalletMatch, contracts } = useWeb3();
    const [activeTab, setActiveTab] = useState('credentials');
    const [viewingPDF, setViewingPDF] = useState(null);
    const [consentLoading, setConsentLoading] = useState(null);

    // ── ON-CHAIN CREDENTIALS — read using student's registered wallet (not MetaMask) ──
    const [onChainCredentials, setOnChainCredentials] = useState([]);
    const [loadingCredentials, setLoadingCredentials] = useState(true);

    const loadOnChainCredentials = async () => {
        // Use the student's wallet address stored in DB — not MetaMask account
        const studentWallet = currentUser?.wallet_address;
        if (!studentWallet) {
            setLoadingCredentials(false);
            return;
        }
        setLoadingCredentials(true);
        try {
            // Read-only provider — no MetaMask needed to read from chain
            const provider = new JsonRpcProvider(HARDHAT_RPC);
            const credContract = new Contract(
                contractAddresses.localhost.AcademicCredentialSBT,
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
                            // Embedded metadata (dev mode without Pinata)
                            const json = decodeURIComponent(escape(atob(uri.split(',')[1])));
                            metadata = JSON.parse(json);
                        } else {
                            // IPFS or HTTP URI
                            const metaUrl = resolveIPFSUrl(uri);
                            const res = await fetch(metaUrl);
                            metadata = await res.json();
                        }
                    } catch { /* metadata unavailable */ }

                    const attr = (key) =>
                        metadata.attributes?.find(a => a.trait_type === key)?.value || '';

                    return {
                        id: id.toString(),
                        tokenId: id.toString(),
                        metadataURI: cred.metadataURI,
                        issuedDate: cred.issuedDate
                            ? new Date(Number(cred.issuedDate) * 1000).toLocaleDateString()
                            : 'N/A',
                        isRevoked: cred.isRevoked,
                        description: metadata.description || metadata.name || 'Academic Credential',
                        year: attr('Academic Year'),
                        department: attr('Department'),
                        cgpa: attr('CGPA'),
                        rollNumber: attr('Roll Number'),
                        studentName: attr('Student Name'),
                        pdfUrl: metadata.credential_pdf
                            ? resolveIPFSUrl(metadata.credential_pdf)
                            : metadata.external_url
                                ? resolveIPFSUrl(metadata.external_url)
                                : null,
                    };
                })
            );
            setOnChainCredentials(creds.filter(c => !c.isRevoked));
        } catch (err) {
            console.error('Failed to load on-chain credentials:', err);
        } finally {
            setLoadingCredentials(false);
        }
    };

    // Load credentials on mount using DB wallet — no MetaMask dependency
    useEffect(() => { loadOnChainCredentials(); }, [currentUser?.wallet_address]);

    // ── CONSENT REQUESTS (from backend DB) ──────────────────────────────────
    const [requests, setRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const loadRequests = async () => {
        try {
            const token = localStorage.getItem('eduleger_token');
            if (!token) return;
            const res = await fetch(`${API_BASE}/consent/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.map(r => ({
                    id: r.id,
                    status: r.status,
                    on_chain_id: r.token_id || null,
                    companyName: r.company?.user?.name || r.company?.name || 'Unknown Company',
                    requestDate: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
                })));
            } else {
                const err = await res.json().catch(() => ({}));
                console.error('Consent fetch failed:', res.status, err);
            }
        } catch (err) {
            console.error('Consent fetch error:', err);
        } finally {
            setLoadingRequests(false);
        }
    };

    // Re-fetch whenever logged-in user changes
    useEffect(() => { loadRequests(); }, [currentUser?.id]);

    // Poll every 10 seconds so new requests appear automatically
    useEffect(() => {
        const interval = setInterval(loadRequests, 10000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const pendingRequests = requests.filter(r => r.status === 'pending');

    const handleViewPDF = (pdfUrl) => {
        if (pdfUrl) window.open(pdfUrl, '_blank');
        else alert('PDF not available — may not be pinned to IPFS yet.');
    };

    const registeredWallet = currentUser?.wallet_address;
    const walletOk = isConnected && isWalletMatch(registeredWallet);
    const wrongWallet = isConnected && !isWalletMatch(registeredWallet);
    const shortExpected = registeredWallet
        ? `${registeredWallet.slice(0, 6)}...${registeredWallet.slice(-4)}`
        : null;

    const handleConsent = async (req, action) => {
        if (!walletOk) {
            alert('Please connect your registered MetaMask wallet first.');
            return;
        }
        setConsentLoading(req.id);
        try {
            // Step 1: On-chain transaction
            if (req.on_chain_id && contracts?.consent) {
                try {
                    let tx;
                    if (action === 'approved') {
                        tx = await contracts.consent.approveConsent(req.on_chain_id, 30); // 30-day consent
                    } else {
                        tx = await contracts.consent.revokeConsent(req.on_chain_id);
                    }
                    await tx.wait();
                    console.log(`✅ On-chain ${action} for consent ${req.on_chain_id}`);
                } catch (txErr) {
                    console.error('On-chain consent action failed:', txErr.message);
                    alert(`On-chain transaction failed: ${txErr.message.slice(0, 120)}`);
                    return;
                }
            }

            // Step 2: DB sync
            const endpoint = action === 'approved' ? 'approve' : 'revoke';
            const res = await fetch(`${API_BASE}/consent/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ consent_id: req.id }),
            });
            if (res.ok) await loadRequests();
        } catch (err) {
            console.error('Consent action failed:', err.message);
        } finally {
            setConsentLoading(null);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Student Dashboard</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome, {currentUser.name}. Manage your academic portfolio.</p>
            </div>

            {/* SBT Wallet (read-only, from DB) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Wallet size={16} />
                    <strong>Your SBT Wallet:</strong>&nbsp;
                    <code style={{ backgroundColor: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                        {registeredWallet ? `${registeredWallet.slice(0, 6)}...${registeredWallet.slice(-4)}` : 'Not registered'}
                    </code>
                    &nbsp;— Credentials load automatically from blockchain
                </div>
            </div>

            {/* MetaMask Wallet (for signing consent) */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem',
                backgroundColor: walletOk ? '#d1fae5' : wrongWallet ? '#fef2f2' : '#fef3c7',
                border: `1px solid ${walletOk ? '#6ee7b7' : wrongWallet ? '#fecaca' : '#fcd34d'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Wallet size={16} />
                    {walletOk && <><strong>Signing Wallet:</strong> {shortAccount} &nbsp;|&nbsp; Consent actions <strong style={{ color: '#059669' }}>enabled ⛓</strong></>}
                    {wrongWallet && <><AlertTriangle size={14} style={{ color: '#b91c1c' }} /> <strong style={{ color: '#b91c1c' }}>Wrong account!</strong> Switch to <code style={{ backgroundColor: '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{shortExpected}</code> in MetaMask</>}
                    {!isConnected && <>Connect MetaMask (your student wallet <code>{shortExpected}</code>) to approve/reject consent</>}
                </div>
                {!isConnected && (
                    <button onClick={connectWallet} disabled={isConnecting} style={{ padding: '0.4rem 0.9rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                )}
            </div>


            {error && (
                <div style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.875rem' }}>
                    ⚠️ {error}
                </div>
            )}

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
                <div>
                    {loadingCredentials ? (
                        /* ── Loading from chain ── */
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⛓️</div>
                            <p>Reading credentials from blockchain...</p>
                        </div>
                    ) : onChainCredentials.length === 0 ? (
                        /* ── No tokens yet ── */
                        <div style={{
                            textAlign: 'center', padding: '3rem 2rem',
                            backgroundColor: 'var(--surface-color)',
                            borderRadius: '1rem', border: '1px solid var(--border-color)'
                        }}>
                            <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No credentials yet</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No SBTs found for wallet <code style={{ backgroundColor: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                                    {currentUser.wallet_address
                                        ? `${currentUser.wallet_address.slice(0, 6)}...${currentUser.wallet_address.slice(-4)}`
                                        : 'unknown'}
                                </code>.<br />
                                Ask your university to issue your marksheet.
                            </p>
                        </div>
                    ) : (
                        /* ── Credential Cards (from blockchain) ── */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'flex-start' }}>
                            {onChainCredentials.map(cred => (
                                <MarksheetTokenCard key={cred.id} credential={cred} contractAddress={contractAddresses.localhost.AcademicCredentialSBT} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
                    {loadingRequests ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading consent requests...</p>
                    ) : requests.length === 0 ? (
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
                                            onClick={() => handleConsent(req, 'rejected')}
                                            disabled={consentLoading === req.id}
                                            style={{
                                                padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
                                                border: '1px solid var(--danger-color)', color: 'var(--danger-color)',
                                                backgroundColor: 'white', display: 'flex', alignItems: 'center',
                                                gap: '0.25rem', cursor: 'pointer'
                                            }}
                                        >
                                            <XCircle size={16} /> {consentLoading === req.id ? '...' : 'Reject'}
                                        </button>
                                        <button
                                            onClick={() => handleConsent(req, 'approved')}
                                            disabled={consentLoading === req.id}
                                            style={{
                                                padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
                                                backgroundColor: 'var(--secondary-color)', color: 'white',
                                                border: 'none', display: 'flex', alignItems: 'center',
                                                gap: '0.25rem', cursor: 'pointer'
                                            }}
                                        >
                                            <CheckCircle size={16} /> {consentLoading === req.id ? '...' : 'Approve (30d)'}
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

export default StudentDashboard;
