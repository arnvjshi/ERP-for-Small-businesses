'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatStatus, getStatusColor, formatDate, cn } from '@/lib/utils';
import { AlertCircle, User, Calendar, Receipt, ChevronLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PaymentModal from '@/components/PaymentModal';

export default function WorkerOrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      setLoading(true);
      const data = await api.getWorkerOrder(id);
      setOrder(data);
    } catch (err) {
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.updateWorkerOrderStatus(id, newStatus);
      toast.success(`Order marked as ${formatStatus(newStatus)}`);
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  if (loading) return <div className="animate-pulse p-8 text-sky-600">Loading order...</div>;
  if (error || !order) return <div className="p-8 text-red-600">{error}</div>;

  const canConfirm = order.status === 'RECEIVED';
  const canStart = order.status === 'CONFIRMED';
  const canCompleteWork = order.status === 'IN_PROGRESS';
  const canReady = order.status === 'IN_PROGRESS';

  return (
    <div className="space-y-6">
      {showPaymentModal && (
        <PaymentModal 
          order={order} 
          isAdmin={false} 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchOrder();
          }}
        />
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <Link href="/worker/orders" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.order_number}</h1>
          <span className={cn('status-badge text-sm px-3 py-1', getStatusColor(order.status))}>
            {formatStatus(order.status)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {canConfirm && (
            <button onClick={() => handleUpdateStatus('CONFIRMED')} className="btn-secondary">Confirm Order</button>
          )}
          {canStart && (
            <button onClick={() => handleUpdateStatus('IN_PROGRESS')} className="btn-primary">Start Work</button>
          )}
          {canReady && (
            <button onClick={() => handleUpdateStatus('READY_FOR_PICKUP')} className="btn-primary bg-sky-600 hover:bg-sky-700">Mark Ready</button>
          )}
          {order.status === 'READY_FOR_PICKUP' && order.payment_status === 'PENDING' && (
            <button onClick={() => setShowPaymentModal(true)} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex gap-2">
              <CreditCard className="w-4 h-4" /> Collect Payment
            </button>
          )}
          {order.status === 'READY_FOR_PICKUP' && order.payment_status === 'PAID' && (
            <button onClick={() => handleUpdateStatus('COMPLETED')} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex gap-2">
              <CheckCircle2 className="w-4 h-4" /> Complete Order
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <User className="w-5 h-5 text-gray-400" /> Customer Details
          </h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500 w-24 inline-block">Name:</span> <span className="font-medium">{order.customer.name}</span></p>
            <p><span className="text-gray-500 w-24 inline-block">Phone:</span> {order.customer.phone}</p>
            {order.customer.email && <p><span className="text-gray-500 w-24 inline-block">Email:</span> {order.customer.email}</p>}
            {order.customer.address && <p><span className="text-gray-500 w-24 inline-block">Address:</span> {order.customer.address}</p>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <Calendar className="w-5 h-5 text-gray-400" /> Order Details
          </h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500 w-28 inline-block">Created:</span> {formatDate(order.created_at)}</p>
            <p><span className="text-gray-500 w-28 inline-block">Last Updated:</span> {formatDate(order.updated_at)}</p>
            <p><span className="text-gray-500 w-28 inline-block">Payment:</span> <span className="font-medium">{formatStatus(order.payment_status)}</span></p>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
              <Link href={`/bill/${order.order_number}`} className="btn-secondary !py-2 !px-4 text-sm inline-flex items-center gap-2">
                <Receipt className="w-4 h-4" /> View Invoice
              </Link>
              {order.payment_status === 'PENDING' && order.status !== 'READY_FOR_PICKUP' && (
                <button onClick={() => setShowPaymentModal(true)} className="btn-primary !py-2 !px-4 text-sm inline-flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Collect Payment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-semibold text-gray-800">Order Items</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-header py-3 px-5">Service</th>
              <th className="table-header py-3 px-5 text-right">Quantity</th>
              <th className="table-header py-3 px-5 text-right">Rate</th>
              <th className="table-header py-3 px-5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {order.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="table-cell px-5">
                  <p className="font-medium text-gray-900">{item.service_name_snapshot}</p>
                  <p className="text-xs text-gray-500">{item.pricing_type_snapshot}</p>
                </td>
                <td className="table-cell px-5 text-right">{item.quantity} {item.unit}</td>
                <td className="table-cell px-5 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="table-cell px-5 text-right font-medium">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span><span className="text-lg text-sky-700">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
