import React, { useState } from 'react';
import { Award, FileText, ShieldCheck, CheckCircle } from 'lucide-react';
import CredentialNFTModal from './CredentialNFTModal';

const MarksheetTokenCard = ({ credential, contractAddress }) => {
    const [modalOpen, setModalOpen] = useState(false);

    const cardStyle = {
        width: '320px',
        height: '220px',
        margin: '1rem 1rem 1rem 0',
        cursor: 'pointer',
        borderRadius: '1rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        backgroundColor: '#fff',
    };

    return (
        <>
            {/* ── Card ── */}
            <div
                style={cardStyle}
                onClick={() => setModalOpen(true)}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px -8px rgba(79,70,229,0.25)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
                }}
            >
                {/* Art banner */}
                <div style={{
                    height: '110px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #3b82f6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', position: 'relative'
                }}>
                    <Award size={52} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} />
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 10px', borderRadius: '999px',
                        fontSize: '0.7rem', fontWeight: 700
                    }}>
                        Token #{credential.id || credential.tokenId || '???'}
                    </div>
                </div>

                {/* Info */}
                <div style={{ padding: '0.875rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                            <ShieldCheck size={12} /> Verified Credential (SBT)
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {credential.description || 'Academic Transcript'}
                        </div>
                        {credential.studentName && (
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                                {credential.studentName}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.72rem', fontWeight: 600 }}>
                            <CheckCircle size={11} /> On-Chain · Active
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={11} /> Click to view
                        </div>
                    </div>
                </div>
            </div>

            {/* ── NFT Detail Modal ── */}
            {modalOpen && (
                <CredentialNFTModal
                    credential={credential}
                    contractAddress={contractAddress}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </>
    );
};

export default MarksheetTokenCard;
