'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatStatus, getStatusColor, formatDate, cn } from '@/lib/utils';
import { 
  ClipboardList, Clock, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function WorkerDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [dashData, ordersData] = await Promise.all([
        api.getWorkerDashboard(),
        api.getWorkerOrders() // Fetches actionable orders by default
      ]);
      setMetrics(dashData);
      setOrders(ordersData);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.updateWorkerOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${formatStatus(newStatus)}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="page-title">Worker Dashboard</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl"></div>)}
        </div>
        <div className="skeleton h-96 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="page-title">Worker Dashboard</h1>
          <p className="text-gray-500 mt-1">Operational view. Prioritize orders needing action.</p>
        </div>
        <button onClick={fetchData} className="btn-secondary !px-3 flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard 
          title="Today's Orders" 
          value={metrics.todays_orders} 
          icon={ClipboardList} 
          color="indigo"
        />
        <MetricCard 
          title="Pending / Need Action" 
          value={metrics.pending_work} 
          icon={AlertCircle} 
          color="amber"
        />
        <MetricCard 
          title="In Progress" 
          value={metrics.in_progress} 
          icon={Clock} 
          color="sky"
        />
      </div>

      {/* Actionable Orders Table */}
      <div className="card overflow-hidden bg-white">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="section-title text-gray-800">Actionable Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header py-3 px-5">Order ID</th>
                <th className="table-header py-3 px-5">Customer</th>
                <th className="table-header py-3 px-5">Current Status</th>
                <th className="table-header py-3 px-5">Time Received</th>
                <th className="table-header py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell px-5 font-medium">
                    {order.order_number}
                  </td>
                  <td className="table-cell px-5">
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                  </td>
                  <td className="table-cell px-5">
                    <span className={cn('status-badge', getStatusColor(order.status))}>
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td className="table-cell px-5 text-gray-500 text-sm">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="table-cell px-5 text-right">
                    <ActionButtons 
                      orderId={order.id} 
                      status={order.status} 
                      onUpdate={handleStatusUpdate} 
                    />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500 text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    All caught up! No actionable orders at the moment.
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

function ActionButtons({ orderId, status, onUpdate }) {
  if (status === 'RECEIVED') {
    return (
      <button onClick={() => onUpdate(orderId, 'CONFIRMED')} className="btn-primary !px-3 !py-1.5 text-xs">
        Confirm
      </button>
    );
  }
  if (status === 'CONFIRMED') {
    return (
      <button onClick={() => onUpdate(orderId, 'IN_PROGRESS')} className="btn-primary !px-3 !py-1.5 text-xs !bg-blue-600 hover:!bg-blue-700">
        Start Work
      </button>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <button onClick={() => onUpdate(orderId, 'READY_FOR_PICKUP')} className="btn-primary !px-3 !py-1.5 text-xs !bg-emerald-600 hover:!bg-emerald-700">
        Mark Ready
      </button>
    );
  }
  if (status === 'READY_FOR_PICKUP') {
    return (
      <button onClick={() => onUpdate(orderId, 'COMPLETED')} className="btn-primary !px-3 !py-1.5 text-xs !bg-green-600 hover:!bg-green-700">
        Complete
      </button>
    );
  }
  return null;
}

function MetricCard({ title, value, icon: Icon, color = 'sky' }) {
  const colorMap = {
    sky: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="metric-card flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
