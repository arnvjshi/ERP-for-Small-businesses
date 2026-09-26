'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatStatus, getStatusColor, formatDate, cn, getPaymentColor } from '@/lib/utils';
import { Search, AlertCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders(search = '') {
    try {
      setLoading(true);
      const data = await api.getAdminOrders(search ? { search } : {});
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(searchTerm);
  };

  if (loading && orders.length === 0) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-sky-600">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Orders Management</h1>
          <p className="text-gray-500 mt-1">View and manage all customer orders.</p>
        </div>
      </div>

      <div className="card p-4 flex gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Order ID, customer, or phone..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header py-3 px-5">Order ID</th>
                <th className="table-header py-3 px-5">Date</th>
                <th className="table-header py-3 px-5">Customer</th>
                <th className="table-header py-3 px-5">Status</th>
                <th className="table-header py-3 px-5">Payment</th>
                <th className="table-header py-3 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell px-5 font-medium">
                    <Link href={`/admin/orders/${order.id}`} className="text-sky-600 hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="table-cell px-5 text-gray-500 text-sm">{formatDate(order.created_at)}</td>
                  <td className="table-cell px-5">
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                  </td>
                  <td className="table-cell px-5">
                    <span className={cn('status-badge', getStatusColor(order.status))}>
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td className="table-cell px-5 flex flex-col gap-1 items-start">
                    <span className={cn('status-badge', getPaymentColor(order.payment_status))}>
                      {formatStatus(order.payment_status)}
                    </span>
                    {order.payment_mode && (
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        VIA {order.payment_mode}
                      </span>
                    )}
                  </td>
                  <td className="table-cell px-5 text-right font-medium text-gray-900">
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <ShoppingBag className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                    <p>No orders found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
