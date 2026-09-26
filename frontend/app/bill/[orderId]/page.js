'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, getPaymentColor, formatStatus, cn } from '@/lib/utils';
import { ShirtIcon, Printer, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function BillPage() {
  const { orderId } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBill() {
      try {
        const data = await api.getBill(orderId);
        setBill(data);
      } catch (err) {
        setError('Invoice not found or you do not have permission to view it.');
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center"><div className="animate-pulse text-sky-600 font-medium">Loading Invoice...</div></div>;
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/track" className="btn-primary">Back to Tracking</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      
      {/* Action Bar (Hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center no-print">
        <Link href={`/track?id=${bill.order_number}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">
          &larr; Back to Order
        </Link>
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm">
          <Printer className="w-4 h-4" /> Print Invoice
        </button>
      </div>

      {/* Invoice Document */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
        
        {/* Header */}
        <div className="p-8 sm:p-12 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShirtIcon className="w-8 h-8 text-sky-600" strokeWidth={1.8} />
              <span className="text-2xl font-bold text-gray-900">Laundry Bros</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Professional Laundry & Care Services.<br />
              123 Wash Street, Clean City
            </p>
          </div>
          <div className="sm:text-right">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
            <p className="text-sm text-gray-500 font-medium">#{bill.invoice_number}</p>
            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <p>Date: <span className="font-medium text-gray-900">{formatDate(bill.created_at)}</span></p>
              <p>Order: <span className="font-medium text-gray-900">{bill.order_number}</span></p>
            </div>
          </div>
        </div>

        {/* Customer & Status Info */}
        <div className="px-8 sm:px-12 py-8 grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Billed To</h3>
            <p className="text-base font-semibold text-gray-900">{bill.customer_name}</p>
            <p className="text-sm text-gray-600 mt-1">{bill.customer_phone}</p>
          </div>
          <div className="sm:text-right">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Status</h3>
              <div className="flex items-center gap-2 justify-end sm:justify-end">
                <span className={cn('px-3 py-1 rounded-md text-xs font-semibold inline-block', getPaymentColor(bill.payment_status))}>
                  {formatStatus(bill.payment_status)}
                </span>
                {bill.payment_status === 'PAID' && bill.payment_mode && (
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                    {bill.payment_mode}
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Status</h3>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-semibold inline-block">
                {formatStatus(bill.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="px-8 sm:px-12 pb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="py-4 font-semibold text-gray-900 text-sm">Service</th>
                  <th className="py-4 font-semibold text-gray-900 text-sm text-right">Qty/Weight</th>
                  <th className="py-4 font-semibold text-gray-900 text-sm text-right">Rate</th>
                  <th className="py-4 font-semibold text-gray-900 text-sm text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bill.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-4 text-sm text-gray-800">
                      <p className="font-medium">{item.service_name}</p>
                      {item.minimum_charge_snapshot > 0 && parseFloat(item.total) === parseFloat(item.minimum_charge_snapshot) && (
                        <p className="text-xs text-sky-600 mt-0.5">Minimum charge applied</p>
                      )}
                    </td>
                    <td className="py-4 text-sm text-gray-600 text-right">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-4 text-sm text-gray-600 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="px-8 sm:px-12 py-8 bg-gray-50 border-t border-gray-100 flex justify-end">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {parseFloat(bill.discount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(bill.tax)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
              <span className="text-base font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-sky-700">{formatCurrency(bill.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 sm:px-12 py-8 border-t border-gray-100 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-900 mb-1">Thank you for your business!</p>
          <p>For any queries, please contact support@laundrybros.com or call 1800-LAUNDRY.</p>
        </div>

      </div>
    </main>
  );
}
