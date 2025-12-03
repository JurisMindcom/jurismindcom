import jsPDF from 'jspdf';

interface PDFGeneratorOptions {
  title?: string;
  margins?: { top: number; right: number; bottom: number; left: number };
  fontSize?: { heading: number; body: number };
}

const defaultOptions: Required<PDFGeneratorOptions> = {
  title: 'Legal Document',
  margins: { top: 25, right: 20, bottom: 25, left: 20 },
  fontSize: { heading: 16, body: 11 },
};

export const generateLegalPDF = (
  content: string,
  options: PDFGeneratorOptions = {}
): Blob => {
  const opts = { ...defaultOptions, ...options };
  
  // Create A4 PDF (210x297mm)
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - opts.margins.left - opts.margins.right;
  
  // Set white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Set black text color
  doc.setTextColor(0, 0, 0);
  
  let currentY = opts.margins.top;
  
  // Process content line by line
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Check if we need a new page
    if (currentY > pageHeight - opts.margins.bottom - 10) {
      doc.addPage();
      currentY = opts.margins.top;
      // White background for new page
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setTextColor(0, 0, 0);
    }

    // Detect if line is a heading (starts with caps or has specific patterns)
    const isHeading = /^[A-Z][A-Z\s]+:?$/.test(line.trim()) || 
                      /^(SECTION|ARTICLE|PART|CHAPTER)\s/i.test(line.trim()) ||
                      /^---/.test(line.trim()) ||
                      line.includes('LEGAL NOTICE') ||
                      line.includes('POWER OF ATTORNEY') ||
                      line.includes('FIRST INFORMATION REPORT');
    
    const isSubHeading = /^\d+\.\s/.test(line.trim()) || /^[A-Z][a-z]+:/.test(line.trim());
    const isSeparator = /^[-=]+$/.test(line.trim());
    
    if (isSeparator) {
      // Draw a horizontal line
      doc.setDrawColor(0, 0, 0);
      doc.line(opts.margins.left, currentY, pageWidth - opts.margins.right, currentY);
      currentY += 5;
    } else if (isHeading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(opts.fontSize.heading);
      
      // Center headings
      const textWidth = doc.getStringUnitWidth(line.trim()) * opts.fontSize.heading / doc.internal.scaleFactor;
      const centerX = (pageWidth - textWidth) / 2;
      
      doc.text(line.trim(), Math.max(centerX, opts.margins.left), currentY);
      currentY += opts.fontSize.heading * 0.5 + 3;
    } else if (isSubHeading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(opts.fontSize.body + 1);
      
      const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth);
      doc.text(wrappedLines, opts.margins.left, currentY);
      currentY += wrappedLines.length * (opts.fontSize.body * 0.4) + 4;
    } else if (line.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(opts.fontSize.body);
      
      // Wrap text to fit content width
      const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth);
      doc.text(wrappedLines, opts.margins.left, currentY);
      currentY += wrappedLines.length * (opts.fontSize.body * 0.4) + 2;
    } else {
      // Empty line - add some spacing
      currentY += 3;
    }
  }

  // Return as blob
  return doc.output('blob');
};

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const savePDFToDocuments = async (
  blob: Blob,
  filename: string,
  userId: string,
  supabase: any
): Promise<{ success: boolean; error?: string; documentId?: string }> => {
  try {
    const fileName = `${Date.now()}-${filename.replace(/\s+/g, '_')}.pdf`;
    const filePath = `${userId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, blob, { contentType: 'application/pdf' });

    if (uploadError) throw uploadError;

    // Create document record
    const { data, error } = await supabase.from('documents').insert({
      user_id: userId,
      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      file_type: 'application/pdf',
      file_size: blob.size,
      storage_path: filePath,
    }).select().single();

    if (error) throw error;

    return { success: true, documentId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export default generateLegalPDF;
