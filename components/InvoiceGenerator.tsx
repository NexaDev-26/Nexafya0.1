import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Mail, 
  Share2,
  X,
  Save,
  Calendar,
  Building2,
  User,
  Package
} from 'lucide-react';
import { Medicine, CartItem } from '../types';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../utils/errorHandler';
import { EmptyState } from './EmptyState';

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  paymentMethod?: string;
}

export const InvoiceGenerator: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Invoice>>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    notes: '',
    status: 'DRAFT',
  });

  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setFormData({
      ...formData,
      items: [...(formData.items || []), newItem],
    });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = {
      ...items[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18; // 18% VAT
    const total = subtotal + tax - (formData.discount || 0);

    setFormData({
      ...formData,
      items,
      subtotal,
      tax,
      total,
    });
  };

  const handleRemoveItem = (index: number) => {
    const items = formData.items?.filter((_, i) => i !== index) || [];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax - (formData.discount || 0);

    setFormData({
      ...formData,
      items,
      subtotal,
      tax,
      total,
    });
  };

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.items || formData.items.length === 0) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const invoiceData: Invoice = {
        id: editingInvoice?.id || Date.now().toString(),
        invoiceNumber: editingInvoice?.invoiceNumber || generateInvoiceNumber(),
        date: formData.date || new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        items: formData.items,
        subtotal: formData.subtotal || 0,
        tax: formData.tax || 0,
        discount: formData.discount || 0,
        total: formData.total || 0,
        notes: formData.notes,
        status: formData.status || 'DRAFT',
        paymentMethod: formData.paymentMethod,
      };

      // Save invoice (implement database method)
      // await db.createInvoice?.(invoiceData);
      
      notify('Invoice created successfully', 'success');
      setShowForm(false);
      setEditingInvoice(null);
      resetForm();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      notes: '',
      status: 'DRAFT',
    });
  };

  const handlePrint = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // Implement PDF generation
    notify('PDF download feature coming soon', 'info');
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    // Implement email sending
    notify('Email feature coming soon', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoice Generator</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage professional invoices</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingInvoice(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <FileText size={20} />
          New Invoice
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices created"
            description="Create your first invoice to get started"
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Create Invoice
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0A0F1C] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Invoice #</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white font-mono">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {invoice.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      TZS {invoice.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        invoice.status === 'PAID'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : invoice.status === 'SENT'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : invoice.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrint(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleEmailInvoice(invoice)}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Email"
                        >
                          <Mail size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-4xl w-full my-8 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingInvoice(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Items *
                  </label>
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Package size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items?.map((item, index) => (
                    <div key={item.id} className="p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="Item name"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            placeholder="Qty"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            placeholder="Unit Price"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            TZS {item.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="col-span-1">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="w-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(!formData.items || formData.items.length === 0) && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No items added. Click "Add Item" to start.
                  </div>
                )}
              </div>

              {/* Totals */}
              {formData.items && formData.items.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        TZS {formData.subtotal?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">VAT (18%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        TZS {formData.tax?.toLocaleString() || '0'}
                      </span>
                    </div>
                    {formData.discount && formData.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Discount</span>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          - TZS {formData.discount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        TZS {formData.total?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingInvoice(null);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      {previewInvoice && (
        <div className="hidden print:block fixed inset-0 bg-white p-8">
          <div className="max-w-4xl mx-auto">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-900 pb-4">
              <div>
                <h1 className="text-3xl font-bold">NexaFya</h1>
                <p className="text-gray-600">Healthcare Network</p>
                <p className="text-sm text-gray-500 mt-2">TIN: 100-200-300 | VRN: 40-1234567</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <p className="text-sm text-gray-600">#{previewInvoice.invoiceNumber}</p>
              </div>
            </div>

            {/* Customer & Date Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2">Bill To:</h3>
                <p>{previewInvoice.customerName}</p>
                {previewInvoice.customerAddress && <p>{previewInvoice.customerAddress}</p>}
                {previewInvoice.customerPhone && <p>{previewInvoice.customerPhone}</p>}
                {previewInvoice.customerEmail && <p>{previewInvoice.customerEmail}</p>}
              </div>
              <div className="text-right">
                <p><strong>Date:</strong> {new Date(previewInvoice.date).toLocaleDateString()}</p>
                {previewInvoice.dueDate && (
                  <p><strong>Due Date:</strong> {new Date(previewInvoice.dueDate).toLocaleDateString()}</p>
                )}
                <p><strong>Status:</strong> {previewInvoice.status}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
              <thead className="bg-gray-100 border-b-2 border-gray-900">
                <tr>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Quantity</th>
                  <th className="text-right p-2">Unit Price</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {previewInvoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-2">{item.name}</td>
                    <td className="text-right p-2">{item.quantity}</td>
                    <td className="text-right p-2">TZS {item.unitPrice.toLocaleString()}</td>
                    <td className="text-right p-2">TZS {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="ml-auto w-64 space-y-2 mb-8">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>TZS {previewInvoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (18%):</span>
                <span>TZS {previewInvoice.tax.toLocaleString()}</span>
              </div>
              {previewInvoice.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>- TZS {previewInvoice.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t-2 border-gray-900 pt-2">
                <span>Total:</span>
                <span>TZS {previewInvoice.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Notes & Footer */}
            {previewInvoice.notes && (
              <div className="mb-8">
                <h3 className="font-bold mb-2">Notes:</h3>
                <p className="text-gray-600">{previewInvoice.notes}</p>
              </div>
            )}

            <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
              <p>Thank you for your business!</p>
              <p>NexaFya Healthcare Network | www.nexafya.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

