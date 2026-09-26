'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatStatus, getStatusColor, formatDate, cn } from '@/lib/utils';
import { Search, Filter, AlertCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function WorkerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const data = await api.getWorkerOrders({
        search: search || undefined,
        status_filter: statusFilter || undefined,
      });
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Manage Orders</h1>
        <p className="text-gray-500 mt-1">View and process laundry orders.</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Order ID, Customer Name or Phone..." 
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <div className="relative w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                className="input-field pl-9 appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : loading && orders.length === 0 ? (
        <div className="card p-8 flex justify-center items-center h-64">
          <div className="animate-pulse text-sky-600 font-medium flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 animate-bounce" /> Loading Orders...
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header py-4 px-5">Order ID</th>
                  <th className="table-header py-4 px-5">Customer</th>
                  <th className="table-header py-4 px-5">Date</th>
                  <th className="table-header py-4 px-5">Status</th>
                  <th className="table-header py-4 px-5">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell px-5 font-medium">
                      <Link href={`/worker/orders/${order.id}`} className="text-sky-600 hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="table-cell px-5">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-sm text-gray-500">{order.customer_phone}</p>
                    </td>
                    <td className="table-cell px-5 text-sm text-gray-600">{formatDate(order.created_at)}</td>
                    <td className="table-cell px-5">
                      <span className={cn('status-badge', getStatusColor(order.status))}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="table-cell px-5 flex flex-col gap-1 items-start">
                      <span className={`status-badge ${
                        order.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        order.payment_status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {formatStatus(order.payment_status)}
                      </span>
                      {order.payment_mode && (
                        <span className="text-[10px] uppercase font-bold text-gray-400">
                          VIA {order.payment_mode}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <ShoppingBag className="w-12 h-12 mb-3 text-gray-300" />
                        <p className="text-lg font-medium text-gray-900 mb-1">No orders found</p>
                        <p className="text-sm">Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
