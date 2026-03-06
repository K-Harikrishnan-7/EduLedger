import fs from 'fs';

let code = fs.readFileSync('src/pages/company/CompanyDashboard.jsx', 'utf8');

if (!code.includes('const [viewingPDF, setViewingPDF]')) {
    code = code.replace(
        'const [loadingCreds, setLoadingCreds] = useState({});',
        'const [loadingCreds, setLoadingCreds] = useState({});\\n    const [viewingPDF, setViewingPDF] = useState(null);'
    );
}

if (!code.includes('viewingPDF && (')) {
    const modalJSX = `
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
};`;

    code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};/, '</div>\n            </div>\n' + modalJSX);
}

if (!code.includes('modalOverlay = {') && !code.includes('modalOverlay =')) {
    code = code.replace(
        'const walletBtnStyle = {',
        `const modalOverlay = {
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

const walletBtnStyle = {`
    );
}

code = code.replace(
    /onClick=\{\(\) => cred\.pdfUrl \? window\.open\(cred\.pdfUrl, '_blank'\) : alert\('PDF not available.'\)\}/g,
    "onClick={() => cred.pdfUrl ? setViewingPDF(cred.pdfUrl) : alert('PDF not available.')}"
);

fs.writeFileSync('src/pages/company/CompanyDashboard.jsx', code);
console.log('Injected modal logic successfully!');
