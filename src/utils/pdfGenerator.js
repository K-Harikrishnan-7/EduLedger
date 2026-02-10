import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import recLogo from '../assets/rec-logo.png';

/**
 * Generate professional academic marksheet PDF
 * @param {Object} data - Marksheet data
 * @returns {Promise<Blob>} - PDF blob
 */
export const generateMarksheetPDF = async (data) => {
    const {
        university = {},
        student = {},
        year,
        courses = [],
        cgpa,
        issuedDate,
        ipfsHash = '',
        verificationNote = 'This is a digitally verified academic credential.',
        collegeLogo = null
    } = data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // ============ HEADER ============
    // College Logo - Left side
    try {
        const logoWidth = 45;
        const logoHeight = 16;
        doc.addImage(recLogo, 'PNG', 15, yPosition + 2, logoWidth, logoHeight);
    } catch (error) {
        console.error('Logo rendering failed:', error);
    }

    // University Name (Next to logo, aligned)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(university.name || 'University Name', 65, yPosition + 8);

    // University Address (Below name, aligned with name)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(university.address || 'University Address', 65, yPosition + 14);

    yPosition += 22;

    // Document Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ACADEMIC MARKSHEET', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 3;

    // Horizontal line
    doc.setLineWidth(0.5);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    yPosition += 10;

    // ============ STUDENT INFORMATION ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT INFORMATION', 15, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Calculate academic period (4-year engineering program)
    const endYear = parseInt(year) || new Date().getFullYear();
    const startYear = endYear - 4;
    const academicPeriod = `${startYear}-${endYear}`;

    const studentInfo = [
        [`Name: ${student.name || 'N/A'}`, `Roll Number: ${student.rollNumber || 'N/A'}`],
        [`Date of Birth: ${student.dob || 'N/A'}`, `Department: ${student.department || 'N/A'}`],
        [`Academic Period: ${academicPeriod}`, '']
    ];

    studentInfo.forEach(row => {
        doc.text(row[0], 20, yPosition);
        doc.text(row[1], pageWidth / 2 + 10, yPosition);
        yPosition += 6;
    });

    yPosition += 5;

    // ============ COURSE DETAILS TABLE ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COURSE DETAILS', 15, yPosition);
    yPosition += 5;

    // Prepare table data
    const tableData = courses.map((course, index) => [
        index + 1,
        course.courseCode || 'N/A',
        course.courseName || 'N/A',
        course.semester || 'N/A',
        course.credits || 'N/A',
        course.grade || 'N/A'
    ]);

    // Use autoTable as a function call
    autoTable(doc, {
        startY: yPosition,
        head: [['S.No', 'Course Code', 'Course Name', 'Semester', 'Credits', 'Grade']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            halign: 'center'
        },
        columnStyles: {
            2: { halign: 'left', cellWidth: 60 } // Course name left-aligned and wider
        },
        margin: { left: 15, right: 15 }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // ============ CGPA SECTION ============
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, pageWidth - 30, 15, 'F');

    doc.text(`Cumulative Grade Points Average (CGPA): ${cgpa || 'N/A'}`, 20, yPosition + 10);

    yPosition += 15;

    // ============ FOOTER SECTION - Right Bottom ============
    const footerY = pageHeight - 30;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(verificationNote, pageWidth - 15, footerY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Issued on: ${issuedDate || new Date().toISOString().split('T')[0]}`, pageWidth - 15, footerY + 6, { align: 'right' });

    // ============ QR CODE (if hash available) ============
    if (ipfsHash) {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(ipfsHash, {
                width: 80,
                margin: 1
            });

            // Add QR code in bottom left
            doc.addImage(qrCodeDataUrl, 'PNG', 15, pageHeight - 35, 25, 25);

            doc.setFontSize(7);
            doc.text('Scan to Verify', 18, pageHeight - 8);
        } catch (error) {
            console.error('QR Code generation failed:', error);
        }
    }

    // ============ PAGE BORDER ============
    doc.setDrawColor(200, 200, 200); // Light gray color
    doc.setLineWidth(0.3); // Thinner line
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16); // More margin to avoid overlap

    // ============ FOOTER ============
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
        'This is a computer-generated document and does not require a physical signature.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    // Return PDF as blob
    return doc.output('blob');
};

/**
 * Download PDF to user's device
 * @param {Blob} pdfBlob - PDF blob
 * @param {string} filename - Filename for download
 */
export const downloadPDF = (pdfBlob, filename = 'marksheet.pdf') => {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
