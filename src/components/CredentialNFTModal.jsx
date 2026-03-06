import React, { useState } from 'react';
import {
    Award, ShieldCheck, CheckCircle, FileText, X, ExternalLink,
    Hash, Calendar, User, BookOpen, GraduationCap, Star, Globe,
    Copy, Check
} from 'lucide-react';

const CredentialNFTModal = ({ credential, onClose, contractAddress }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [copied, setCopied] = useState(null);

    if (!credential) return null;

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 1500);
        });
    };

    const shortAddr = (addr) =>
        addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : '—';

    const attributes = [
        { label: 'Student Name', value: credential.studentName, icon: <User size={14} /> },
        { label: 'Roll Number', value: credential.rollNumber, icon: <Hash size={14} /> },
        { label: 'Department', value: credential.department, icon: <BookOpen size={14} /> },
        { label: 'Academic Year', value: credential.year, icon: <Calendar size={14} /> },
        { label: 'CGPA', value: credential.cgpa, icon: <Star size={14} /> },
        { label: 'Degree', value: credential.degree || 'B.Tech', icon: <GraduationCap size={14} /> },
    ].filter(a => a.value);

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>

                {/* ── HEADER BAR ── */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={logoBadgeStyle}>
                            <Award size={20} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                EduLedger · Verified Credential
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                                {credential.description || 'Academic Transcript'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* ── BODY ── */}
                <div style={bodyStyle}>

                    {/* LEFT — NFT Card Art */}
                    <div style={leftPanelStyle}>
                        {/* Visual NFT art panel */}
                        <div style={nftArtStyle}>
                            <div style={nftGlowStyle} />
                            <Award size={80} color="rgba(255,255,255,0.9)" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))' }} />
                            <div style={tokenBadgeStyle}>
                                Token #{credential.tokenId || credential.id || '?'}
                            </div>
                            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                                    Soulbound Token (SBT)
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                                    {credential.studentName || 'Student Credential'}
                                </div>
                            </div>
                        </div>

                        {/* Status pills */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                            <StatusPill icon={<CheckCircle size={12} />} text="On-Chain" color="#059669" bg="#d1fae5" />
                            <StatusPill icon={<ShieldCheck size={12} />} text="Verified" color="#4f46e5" bg="#e0e7ff" />
                            <StatusPill icon={<Globe size={12} />} text="Non-Transferable" color="#b45309" bg="#fef3c7" />
                        </div>

                        {/* PDF Button */}
                        {credential.pdfUrl && (
                            <button
                                onClick={() => window.open(credential.pdfUrl, '_blank')}
                                style={pdfBtnStyle}
                            >
                                <ExternalLink size={14} />
                                Open Marksheet PDF
                            </button>
                        )}
                    </div>

                    {/* RIGHT — Details */}
                    <div style={rightPanelStyle}>

                        {/* Tabs */}
                        <div style={tabBarStyle}>
                            {['details', 'blockchain', 'pdf'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{ ...tabBtnStyle, ...(activeTab === tab ? tabActiveBtnStyle : {}) }}
                                >
                                    {tab === 'details' && 'Details'}
                                    {tab === 'blockchain' && 'Blockchain'}
                                    {tab === 'pdf' && 'Marksheet PDF'}
                                </button>
                            ))}
                        </div>

                        {/* ── TAB: Details ── */}
                        {activeTab === 'details' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={sectionCard}>
                                    <div style={sectionTitle}>Academic Attributes</div>
                                    <div style={attrGrid}>
                                        {attributes.map(attr => (
                                            <div key={attr.label} style={attrCell}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                                    {attr.icon} {attr.label}
                                                </div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827' }}>
                                                    {attr.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={sectionCard}>
                                    <div style={sectionTitle}>Issue Information</div>
                                    <InfoRow label="Issue Date" value={credential.issuedDate || '—'} />
                                    <InfoRow label="Token Standard" value="ERC-5192 (Soulbound)" />
                                    <InfoRow label="Token ID" value={`#${credential.tokenId || credential.id || '?'}`} />
                                    <InfoRow label="Status" value={credential.isRevoked ? '⛔ Revoked' : '✅ Active'} />
                                </div>
                            </div>
                        )}

                        {/* ── TAB: Blockchain ── */}
                        {activeTab === 'blockchain' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={sectionCard}>
                                    <div style={sectionTitle}>On-Chain Data</div>
                                    <BlockchainRow
                                        label="Token ID"
                                        value={`#${credential.tokenId || credential.id}`}
                                        copyKey="tokenId"
                                        copyValue={credential.tokenId || credential.id}
                                        copied={copied}
                                        onCopy={copyToClipboard}
                                    />
                                    {contractAddress && (
                                        <BlockchainRow
                                            label="Contract"
                                            value={shortAddr(contractAddress)}
                                            copyKey="contract"
                                            copyValue={contractAddress}
                                            copied={copied}
                                            onCopy={copyToClipboard}
                                        />
                                    )}
                                    <BlockchainRow
                                        label="Token Type"
                                        value="AcademicCredentialSBT"
                                        copyKey="type"
                                        copyValue="AcademicCredentialSBT"
                                        copied={copied}
                                        onCopy={copyToClipboard}
                                    />
                                    <BlockchainRow
                                        label="Metadata URI"
                                        value={credential.metadataURI
                                            ? shortAddr(credential.metadataURI)
                                            : '—'}
                                        copyKey="metaUri"
                                        copyValue={credential.metadataURI}
                                        copied={copied}
                                        onCopy={copyToClipboard}
                                    />
                                </div>

                                <div style={{ ...sectionCard, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 600, fontSize: '0.875rem' }}>
                                        <ShieldCheck size={16} />
                                        Verified on Blockchain
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: '#374151', marginTop: '0.5rem', lineHeight: 1.6 }}>
                                        This credential is a Soulbound Token (SBT) — it is permanently bound to the student's wallet and cannot be transferred or forged. Its authenticity is verifiable on-chain at any time.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: PDF ── */}
                        {activeTab === 'pdf' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                                {credential.pdfUrl ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FileText size={14} /> Official Marksheet Document
                                            </div>
                                            <button
                                                onClick={() => window.open(credential.pdfUrl, '_blank')}
                                                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                            >
                                                <ExternalLink size={12} /> Open in new tab
                                            </button>
                                        </div>
                                        <iframe
                                            src={`${credential.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                            style={{ flex: 1, width: '100%', minHeight: '400px', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}
                                            title="Marksheet PDF"
                                        />
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9ca3af', gap: '0.75rem', padding: '3rem' }}>
                                        <FileText size={48} />
                                        <p style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                                            PDF not available. The marksheet may not have been pinned to IPFS yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Helper sub-components ── */

const StatusPill = ({ icon, text, color, bg }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: bg, color, fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>
        {icon} {text}
    </div>
);

const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#111827' }}>{value}</span>
    </div>
);

const BlockchainRow = ({ label, value, copyKey, copyValue, copied, onCopy }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#111827' }}>{value}</span>
            {copyValue && (
                <button
                    onClick={() => onCopy(copyValue, copyKey)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === copyKey ? '#059669' : '#9ca3af', padding: 0 }}
                    title="Copy"
                >
                    {copied === copyKey ? <Check size={13} /> : <Copy size={13} />}
                </button>
            )}
        </div>
    </div>
);

/* ── Styles ── */

const overlayStyle = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
};

const modalStyle = {
    backgroundColor: '#fff',
    borderRadius: '1.25rem',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '92vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
};

const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1rem 1.5rem',
    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
    flexShrink: 0
};

const logoBadgeStyle = {
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)'
};

const closeBtn = {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
    color: '#fff', cursor: 'pointer', width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const bodyStyle = {
    display: 'flex', flex: 1, overflow: 'hidden'
};

const leftPanelStyle = {
    width: '260px', flexShrink: 0,
    padding: '1.25rem',
    borderRight: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    overflowY: 'auto'
};

const nftArtStyle = {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #3b82f6 100%)',
    borderRadius: '1rem',
    height: '220px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
};

const nftGlowStyle = {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)'
};

const tokenBadgeStyle = {
    position: 'absolute', top: '10px', right: '10px',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
    color: '#fff', fontSize: '0.7rem', fontWeight: 700,
    padding: '3px 10px', borderRadius: '999px'
};

const pdfBtnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '0.6rem', borderRadius: '0.75rem',
    background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
    color: '#fff', border: 'none', cursor: 'pointer',
    fontSize: '0.8rem', fontWeight: 600, width: '100%',
    marginTop: 'auto'
};

const rightPanelStyle = {
    flex: 1, padding: '1.25rem',
    display: 'flex', flexDirection: 'column', gap: '1rem',
    overflowY: 'auto'
};

const tabBarStyle = {
    display: 'flex', gap: '0.25rem',
    borderBottom: '2px solid #e5e7eb',
    flexShrink: 0
};

const tabBtnStyle = {
    padding: '0.5rem 1rem', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
    color: '#6b7280', borderRadius: '4px 4px 0 0'
};

const tabActiveBtnStyle = {
    color: '#4f46e5', borderBottom: '2px solid #4f46e5', fontWeight: 600
};

const sectionCard = {
    border: '1px solid #e5e7eb', borderRadius: '0.875rem',
    padding: '1rem', background: '#fff'
};

const sectionTitle = {
    fontSize: '0.75rem', fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '0.75rem'
};

const attrGrid = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'
};

const attrCell = {
    backgroundColor: '#f9fafb', borderRadius: '0.5rem',
    padding: '0.6rem 0.75rem', border: '1px solid #f3f4f6'
};

export default CredentialNFTModal;
