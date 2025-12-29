/**
 * Report Service
 * Handles CSV and PDF export functionality
 */

export interface ReportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
  description?: string;
}

class ReportService {
  /**
   * Export data to CSV
   */
  exportToCSV(data: ReportData, filename?: string): void {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.map(cell => {
        // Escape commas and quotes in CSV
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename || `${data.title}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export data to PDF (using browser print functionality)
   * For full PDF generation, integrate with jsPDF or similar library
   */
  exportToPDF(data: ReportData, filename?: string): void {
    // Create HTML table
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0066CC; margin-bottom: 10px; }
            .description { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #0066CC; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${data.title}</h1>
          ${data.description ? `<p class="description">${data.description}</p>` : ''}
          <p class="description">Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${data.headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.rows.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  /**
   * Generate appointments report
   */
  generateAppointmentsReport(appointments: any[]): ReportData {
    return {
      title: 'Appointments Report',
      description: `Total appointments: ${appointments.length}`,
      headers: ['ID', 'Patient Name', 'Doctor Name', 'Date', 'Time', 'Status', 'Type', 'Fee'],
      rows: appointments.map(apt => [
        apt.id || 'N/A',
        apt.patientName || 'N/A',
        apt.doctorName || 'N/A',
        apt.date || 'N/A',
        apt.time || 'N/A',
        apt.status || 'N/A',
        apt.type || 'N/A',
        apt.fee ? `TZS ${apt.fee.toLocaleString()}` : 'N/A',
      ]),
    };
  }

  /**
   * Generate revenue report
   */
  generateRevenueReport(transactions: any[]): ReportData {
    const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const completed = transactions.filter(t => t.status === 'COMPLETED').length;
    const pending = transactions.filter(t => t.status === 'PENDING').length;

    return {
      title: 'Revenue Report',
      description: `Total Revenue: TZS ${total.toLocaleString()} | Completed: ${completed} | Pending: ${pending}`,
      headers: ['Transaction ID', 'User', 'Amount', 'Currency', 'Method', 'Status', 'Date', 'Description'],
      rows: transactions.map(t => [
        t.id || 'N/A',
        t.userName || 'N/A',
        t.amount ? t.amount.toLocaleString() : '0',
        t.currency || 'TZS',
        t.provider || t.method || 'N/A',
        t.status || 'N/A',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
        t.description || 'N/A',
      ]),
    };
  }

  /**
   * Generate inventory report
   */
  generateInventoryReport(items: any[]): ReportData {
    const lowStock = items.filter(i => (i.stock || 0) < (i.reorderLevel || 10)).length;

    return {
      title: 'Inventory Report',
      description: `Total Items: ${items.length} | Low Stock Items: ${lowStock}`,
      headers: ['Item ID', 'Name', 'Category', 'Stock', 'Reorder Level', 'Price', 'Status'],
      rows: items.map(item => [
        item.id || 'N/A',
        item.name || 'N/A',
        item.category || 'N/A',
        item.stock || 0,
        item.reorderLevel || 0,
        item.price ? `TZS ${item.price.toLocaleString()}` : 'N/A',
        item.status || 'ACTIVE',
      ]),
    };
  }

  /**
   * Generate user activity report
   */
  generateUserActivityReport(logs: any[]): ReportData {
    return {
      title: 'User Activity Report',
      description: `Total activities: ${logs.length}`,
      headers: ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Description'],
      rows: logs.map(log => [
        log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A',
        log.userName || 'N/A',
        log.userRole || 'N/A',
        log.action || 'N/A',
        log.resourceType || 'N/A',
        log.description || 'N/A',
      ]),
    };
  }

  /**
   * Generate medication adherence report
   */
  generateMedicationAdherenceReport(schedules: any[], stats: any): ReportData {
    return {
      title: 'Medication Adherence Report',
      description: `Adherence Rate: ${stats.adherenceRate}% | Total Doses: ${stats.totalDoses} | Taken: ${stats.takenDoses} | Skipped: ${stats.skippedDoses}`,
      headers: ['Medication', 'Dosage', 'Frequency', 'Start Date', 'End Date', 'Status'],
      rows: schedules.map(schedule => [
        schedule.medicationName || 'N/A',
        schedule.dosage || 'N/A',
        schedule.frequency || 'N/A',
        schedule.startDate ? new Date(schedule.startDate).toLocaleDateString() : 'N/A',
        schedule.endDate ? new Date(schedule.endDate).toLocaleDateString() : 'Ongoing',
        schedule.isActive ? 'Active' : 'Inactive',
      ]),
    };
  }
}

export const reportService = new ReportService();
export default reportService;

