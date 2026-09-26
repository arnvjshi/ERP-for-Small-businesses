'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicNavbar from '@/components/navbar/PublicNavbar';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, formatStatus, cn } from '@/lib/utils';
import { Search, AlertCircle, CheckCircle, Clock, Package, CheckCircle2, Truck, FileText } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [orderId, setOrderId] = useState(initialId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-search if ID is in URL
  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleSearch = async (idToSearch) => {
    const id = idToSearch || orderId;
    if (!id) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const data = await api.trackOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Order not found. Please check your Order ID.');
    } finally {
      setLoading(false);
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    handleSearch(orderId);
  };

  const getStepStatus = (stepStatus) => {
    if (!order) return 'upcoming';
    
    const statuses = ['RECEIVED', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED'];
    if (order.status === 'CANCELLED') return 'cancelled';
    
    const currentIndex = statuses.indexOf(order.status);
    const stepIndex = statuses.indexOf(stepStatus);
    
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <main className="pt-24 pb-20 px-4 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto">
        
        {/* Search Box */}
        <div className="card p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Track Your Order</h1>
          <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="input-field pl-10 h-12"
                placeholder="Enter Order ID (e.g. ORD-2026-...)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary h-12 whitespace-nowrap">
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 flex items-center gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Results */}
        {order && (
          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <h2 className="text-xl font-bold text-gray-900">{order.order_number}</h2>
                <p className="text-sm text-gray-500 mt-1">Placed on {formatDate(order.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(order.status))}>
                  {formatStatus(order.status)}
                </span>
                <Link href={`/bill/${order.order_number}`} className="text-sm text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> View Invoice
                </Link>
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className="p-6 sm:p-10 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-8">Order Status</h3>
              
              {order.status === 'CANCELLED' ? (
                <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <p className="font-medium">Order Cancelled</p>
                    <p className="text-sm mt-0.5">This order has been cancelled.</p>
                  </div>
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
                  {[
                    { status: 'RECEIVED', icon: CheckCircle, title: 'Order Received', desc: 'We have received your order request.' },
                    { status: 'CONFIRMED', icon: Package, title: 'Order Confirmed', desc: 'Order details verified and confirmed.' },
                    { status: 'IN_PROGRESS', icon: Clock, title: 'In Progress', desc: 'Your clothes are being cleaned with care.' },
                    { status: 'READY_FOR_PICKUP', icon: CheckCircle2, title: 'Ready for Pickup', desc: 'Your clothes are clean and ready to be collected.' },
                    { status: 'COMPLETED', icon: CheckCircle2, title: 'Completed', desc: 'Order completed and delivered.' },
                  ].map((step, idx) => {
                    const stepState = getStepStatus(step.status);
                    
                    let iconColor = 'text-gray-400';
                    let bgColor = 'bg-gray-50';
                    let borderColor = 'border-gray-200';
                    
                    if (stepState === 'completed') {
                      iconColor = 'text-white';
                      bgColor = 'bg-sky-600';
                      borderColor = 'border-sky-600';
                    } else if (stepState === 'current') {
                      iconColor = 'text-sky-600';
                      bgColor = 'bg-white';
                      borderColor = 'border-sky-600';
                    }

                    return (
                      <div key={idx} className="relative pl-8">
                        <div className={cn(
                          "absolute -left-[17px] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white",
                          borderColor, stepState === 'completed' && bgColor
                        )}>
                          {stepState === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <step.icon className={cn("w-4 h-4", iconColor)} />
                          )}
                        </div>
                        <div>
                          <h4 className={cn("font-medium", stepState === 'upcoming' ? 'text-gray-500' : 'text-gray-900')}>
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Payment Summary */}
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status</span>
                <span className={cn('px-2.5 py-1 rounded text-xs font-medium', getStatusColor(order.payment_status))}>
                  {formatStatus(order.payment_status)}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <>
      <PublicNavbar />
      <Suspense fallback={<div className="pt-32 text-center text-gray-500">Loading...</div>}>
        <TrackOrderContent />
      </Suspense>
    </>
  );
}
