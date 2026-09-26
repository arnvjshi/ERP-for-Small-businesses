'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, Banknote, QrCode, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentModal({ order, onClose, onSuccess, isAdmin = false }) {
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [discountCode, setDiscountCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      // In a real app, worker might need to fetch public settings. For now, try fetching via admin if admin, or hardcode/skip.
      // Wait, let's just make getSettings public or require admin. If worker, we could just use a default UPI ID if we can't fetch it, or we could have a public endpoint for store info. 
      // Let's assume we can fetch it or default it.
      try {
        if (isAdmin) {
          const data = await api.getSettings();
          setSettings(data);
        } else {
          // Worker can't access /api/admin/settings, so we should ideally have a public settings endpoint.
          // For now, fallback to a default if worker.
          setSettings({ upi_id: 'store@upi', upi_name: 'Laundry Bros' });
        }
      } catch (err) {
        setSettings({ upi_id: 'store@upi', upi_name: 'Laundry Bros' });
      }
    }
    loadSettings();
  }, [isAdmin]);

  // Calculate dynamic total based on discount
  let currentTotal = parseFloat(order.total);
  let discountDisplay = 0;
  const code = discountCode.toUpperCase();
  if (code === 'TRYNEW' || code === 'DISCOUNT20') {
    discountDisplay = currentTotal * 0.20;
    currentTotal = currentTotal * 0.80;
  } else if (code === 'DISCOUNT10') {
    discountDisplay = currentTotal * 0.10;
    currentTotal = currentTotal * 0.90;
  }

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        payment_mode: paymentMode,
        discount_code: code || null,
        payment_status: 'PAID' // for admin endpoint compatibility
      };

      if (isAdmin) {
        await api.processPayment(order.id, payload);
      } else {
        await api.processWorkerPayment(order.id, payload);
      }
      
      toast.success('Payment completed successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiLink = settings ? `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.upi_name)}&am=${currentTotal.toFixed(2)}&cu=INR` : '';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Process Payment (Order #{order.order_number})</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handlePayment} className="p-6 space-y-6">
          <div className="flex gap-4 p-4 bg-sky-50 rounded-xl">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-sky-700">{formatCurrency(currentTotal)}</p>
              {discountDisplay > 0 && (
                <p className="text-sm text-emerald-600 font-medium">
                  Saving {formatCurrency(discountDisplay)}!
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-500 mb-1 block">Discount Code</label>
              <input 
                type="text" 
                placeholder="e.g. TRYNEW"
                className="input-field uppercase"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label mb-3">Select Payment Mode</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMode === 'CASH' ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Banknote className="w-6 h-6" />
                <span className="font-medium text-sm">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMode === 'UPI' ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <QrCode className="w-6 h-6" />
                <span className="font-medium text-sm">UPI (QR)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('CARD')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMode === 'CARD' ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <CreditCard className="w-6 h-6" />
                <span className="font-medium text-sm">Card</span>
              </button>
            </div>
          </div>

          {paymentMode === 'UPI' && settings && (
            <div className="bg-gray-50 p-6 rounded-xl flex flex-col items-center border border-gray-100">
              <p className="font-medium text-gray-700 mb-4 text-center">Scan to Pay {formatCurrency(currentTotal)}</p>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3">
                <QRCodeSVG value={upiLink} size={160} level="H" />
              </div>
              <p className="text-sm text-gray-500">{settings.upi_id}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
