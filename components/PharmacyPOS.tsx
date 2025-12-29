import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  X, 
  Trash2, 
  CreditCard, 
  Receipt,
  User,
  QrCode,
  CheckCircle
} from 'lucide-react';
import { Medicine, CartItem } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface PharmacyPOSProps {
  user: any;
}

export const PharmacyPOS: React.FC<PharmacyPOSProps> = ({ user }) => {
  const { notify } = useNotification();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'TIGO_PESA' | 'AIRTEL_MONEY' | 'CARD'>('CASH');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await db.getMedicines();
      setMedicines(data.filter(m => m.inStock && (m.stock || 0) > 0));
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (medicine: Medicine) => {
    const existingItem = cart.find(item => item.id === medicine.id);
    
    if (existingItem) {
      // Check stock availability
      if (existingItem.quantity >= (medicine.stock || 0)) {
        notify('Insufficient stock available', 'warning');
        return;
      }
      setCart(cart.map(item =>
        item.id === medicine.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if ((medicine.stock || 0) < 1) {
        notify('This item is out of stock', 'warning');
        return;
      }
      setCart([...cart, { ...medicine, quantity: 1 }]);
    }
    notify(`${medicine.name} added to cart`, 'success');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        const medicine = medicines.find(m => m.id === id);
        if (newQuantity < 1) return item;
        if (medicine && newQuantity > (medicine.stock || 0)) {
          notify('Insufficient stock', 'warning');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    notify('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    notify('Cart cleared', 'info');
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateSubtotal = () => {
    return calculateTotal();
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; // 18% VAT
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      notify('Cart is empty', 'warning');
      return;
    }

    setProcessing(true);
    try {
      // Process payment (integrate with payment service)
      const orderData = {
        items: cart.map(item => ({
          medicineId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        customerId: selectedCustomer || null,
        paymentMethod,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateGrandTotal(),
        pharmacyId: user.id,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      // Save order to database
      await db.createOrder?.(orderData);

      // Update inventory
      for (const item of cart) {
        await db.updateMedicineStock?.(item.id, item.quantity);
      }

      notify('Sale completed successfully!', 'success', {
        action: {
          label: 'Print Receipt',
          onClick: () => handlePrintReceipt(orderData),
        },
      });

      // Clear cart and reset
      setCart([]);
      setSelectedCustomer('');
      setPaymentMethod('CASH');
    } catch (error) {
      handleError(error, notify);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = (orderData: any) => {
    // Implement receipt printing
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="dashboard" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Process in-store sales</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Cart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* Products Grid */}
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Products</h2>
            {filteredMedicines.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No products found"
                description={searchQuery ? `No products match "${searchQuery}"` : "No products available"}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                {filteredMedicines.map(medicine => (
                  <button
                    key={medicine.id}
                    onClick={() => addToCart(medicine)}
                    disabled={(medicine.stock || 0) === 0}
                    className="p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="font-bold text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {medicine.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {medicine.category}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        TZS {medicine.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Stock: {medicine.stock || 0}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 sticky top-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart size={20} />
                Cart ({cart.length})
              </h2>
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Cart is empty"
                description="Add products to cart to start a sale"
              />
            ) : (
              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        TZS {item.price.toLocaleString()} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <>
                <div className="space-y-2 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      TZS {calculateSubtotal().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">VAT (18%)</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      TZS {calculateTax().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      TZS {calculateGrandTotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="TIGO_PESA">Tigo Pesa</option>
                    <option value="AIRTEL_MONEY">Airtel Money</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={processing || cart.length === 0}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Complete Sale
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
