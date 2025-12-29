/**
 * PDF Export Utility
 * Generates PDFs for various documents (prescriptions, invoices, reports, etc.)
 */

export interface PDFExportOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

/**
 * Export HTML content to PDF
 */
export const exportToPDF = async (
  content: HTMLElement | string,
  filename: string,
  options?: PDFExportOptions
): Promise<void> => {
  // For now, use browser print functionality
  // In production, you'd integrate with a library like jsPDF, pdfmake, or a backend service
  
  if (typeof content === 'string') {
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = content;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    window.print();
    document.body.removeChild(container);
  } else {
    // Show print dialog
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = content.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
  }
};

/**
 * Generate PDF from data structure
 */
export const generatePDFFromData = async (
  data: any,
  template: 'prescription' | 'invoice' | 'report' | 'health-record',
  filename: string
): Promise<void> => {
  // This would generate HTML based on template and data, then export to PDF
  // For now, return a placeholder implementation
  
  const html = generateHTMLFromTemplate(data, template);
  await exportToPDF(html, filename);
};

/**
 * Generate HTML from template and data
 */
const generateHTMLFromTemplate = (data: any, template: string): string => {
  switch (template) {
    case 'prescription':
      return generatePrescriptionHTML(data);
    case 'invoice':
      return generateInvoiceHTML(data);
    case 'report':
      return generateReportHTML(data);
    case 'health-record':
      return generateHealthRecordHTML(data);
    default:
      return '<div>PDF Template Not Found</div>';
  }
};

const generatePrescriptionHTML = (data: any): string => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">NexaFya</h1>
        <p style="color: #6b7280; margin: 5px 0;">Healthcare Network</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="color: #111827; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">PRESCRIPTION</h2>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Patient:</strong> ${data.patientName || 'N/A'}</p>
        <p><strong>Doctor:</strong> ${data.doctorName || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(data.date || Date.now()).toLocaleDateString()}</p>
        ${data.diagnosis ? `<p><strong>Diagnosis:</strong> ${data.diagnosis}</p>` : ''}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Medication</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Dosage</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Frequency</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Duration</th>
          </tr>
        </thead>
        <tbody>
          ${(data.items || []).map((item: any) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${item.name || item.medicineName || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${item.dosage || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${item.frequency || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${item.duration || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${data.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
      
      <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
        <p>This is a digital prescription from NexaFya Healthcare Network</p>
        <p>For questions, contact your healthcare provider</p>
      </div>
    </div>
  `;
};

const generateInvoiceHTML = (data: any): string => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">NexaFya</h1>
        <p style="color: #6b7280; margin: 5px 0;">Healthcare Network</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="color: #111827; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">INVOICE</h2>
        <p><strong>Invoice #:</strong> ${data.invoiceNumber || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(data.date || Date.now()).toLocaleDateString()}</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <p><strong>Bill To:</strong></p>
          <p>${data.customerName || 'N/A'}</p>
          ${data.customerAddress ? `<p>${data.customerAddress}</p>` : ''}
          ${data.customerPhone ? `<p>${data.customerPhone}</p>` : ''}
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Description</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Quantity</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Price</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(data.items || []).map((item: any) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${item.name || 'N/A'}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">${item.quantity || 0}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">TZS ${(item.unitPrice || 0).toLocaleString()}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">TZS ${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="text-align: right; margin-top: 20px;">
        <p><strong>Subtotal:</strong> TZS ${(data.subtotal || 0).toLocaleString()}</p>
        <p><strong>Tax:</strong> TZS ${(data.tax || 0).toLocaleString()}</p>
        <p style="font-size: 20px; font-weight: bold; color: #2563eb;"><strong>Total:</strong> TZS ${(data.total || 0).toLocaleString()}</p>
      </div>
    </div>
  `;
};

const generateReportHTML = (data: any): string => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">${data.title || 'Health Report'}</h1>
        <p style="color: #6b7280; margin: 5px 0;">${new Date(data.date || Date.now()).toLocaleDateString()}</p>
      </div>
      <div>${data.content || 'Report content goes here'}</div>
    </div>
  `;
};

const generateHealthRecordHTML = (data: any): string => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Health Record</h1>
      </div>
      <div>
        <p><strong>Patient:</strong> ${data.patientName || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(data.date || Date.now()).toLocaleDateString()}</p>
        <p><strong>Type:</strong> ${data.type || 'N/A'}</p>
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      </div>
    </div>
  `;
};

