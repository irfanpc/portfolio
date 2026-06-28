const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function modifyPdf() {
    try {
        const filePath = 'public/assets/resume.pdf';
        const existingPdfBytes = fs.readFileSync(filePath);

        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        pdfDoc.setTitle('Mohd Irfan Resume');
        pdfDoc.setAuthor('Mohd Irfan');
        pdfDoc.setSubject('Resume');

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, pdfBytes);
        
        console.log("PDF metadata updated successfully!");
    } catch (e) {
        console.error("Failed to update PDF:", e);
    }
}

modifyPdf();
