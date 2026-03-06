/**
 * Generate ERC-721 compatible metadata JSON for an academic credential
 */
export const generateCredentialMetadata = (studentData, marksheetData, pdfIpfsHash) => {
    return {
        name: `Academic Credential – ${studentData.name}`,
        description: `Consolidated Academic Marksheet issued by Rajalakshmi Engineering College for ${studentData.name} (${studentData.rollNumber}).`,
        image: 'ipfs://QmRecLogoPlaceholder',               // replace with real REC logo IPFS hash
        external_url: pdfIpfsHash ? `ipfs://${pdfIpfsHash}` : undefined,
        attributes: [
            { trait_type: 'Student Name', value: studentData.name },
            { trait_type: 'Roll Number', value: studentData.rollNumber },
            { trait_type: 'Department', value: studentData.department || 'N/A' },
            { trait_type: 'University', value: 'Rajalakshmi Engineering College' },
            { trait_type: 'CGPA', value: marksheetData.cgpa != null ? String(marksheetData.cgpa) : '' },
            { trait_type: 'Academic Year', value: marksheetData.year || '' },
            { trait_type: 'Total Courses', value: String(marksheetData.courses?.length ?? 0) },
            { trait_type: 'Issue Date', value: new Date().toISOString().split('T')[0] },
        ],
        credential_pdf: pdfIpfsHash ? `ipfs://${pdfIpfsHash}` : null,
        verification_hash: generateVerificationHash(studentData, marksheetData),
    };
};

/** Simple deterministic hash for data integrity verification */
const generateVerificationHash = (studentData, marksheetData) => {
    const payload = JSON.stringify({
        rollNumber: studentData.rollNumber,
        cgpa: marksheetData.cgpa,
        year: marksheetData.year,
        courses: marksheetData.courses?.map(c => ({ code: c.courseCode, grade: c.grade })),
    });
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // convert to 32-bit int
    }
    return `0x${Math.abs(hash).toString(16).padStart(8, '0')}`;
};
