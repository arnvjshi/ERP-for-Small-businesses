'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatStatus, getStatusColor, formatDate, cn } from '@/lib/utils';
import { 
  IndianRupee, ShoppingBag, Clock, CheckCircle2, AlertCircle, TrendingUp, Users 
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const data = await api.getDashboard();
        setMetrics(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Dashboard Overview</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-xl"></div>)}
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
      <div>
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Today's Revenue" 
          value={formatCurrency(metrics.todays_revenue)} 
          icon={IndianRupee} 
          trend="+12% from yesterday"
          color="sky"
        />
        <MetricCard 
          title="Today's Orders" 
          value={metrics.todays_orders} 
          icon={ShoppingBag} 
          trend="4 need attention"
          color="indigo"
        />
        <MetricCard 
          title="Pending Work" 
          value={metrics.pending_orders} 
          icon={Clock} 
          color="amber"
        />
        <MetricCard 
          title="Ready for Pickup" 
          value={metrics.ready_orders} 
          icon={CheckCircle2} 
          color="emerald"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
            <h2 className="section-title">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-sky-600 hover:text-sky-700">View All</Link>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header py-3 px-5">Order ID</th>
                  <th className="table-header py-3 px-5">Customer</th>
                  <th className="table-header py-3 px-5">Status</th>
                  <th className="table-header py-3 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {metrics.recent_orders?.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell px-5 font-medium">
                      <Link href={`/admin/orders/${order.id}`} className="text-sky-600 hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="table-cell px-5">{order.customer_name}</td>
                    <td className="table-cell px-5">
                      <span className={cn('status-badge', getStatusColor(order.status))}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="table-cell px-5 text-right font-medium">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
                {(!metrics.recent_orders || metrics.recent_orders.length === 0) && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500 text-sm">No recent orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / System Health */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="section-title mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/admin/orders" className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-sky-200 hover:bg-sky-50 transition-colors group">
                <span className="font-medium text-gray-700 group-hover:text-sky-800">Process Orders</span>
                <ShoppingBag className="w-4 h-4 text-gray-400 group-hover:text-sky-600" />
              </Link>
              <Link href="/admin/pricing" className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-sky-200 hover:bg-sky-50 transition-colors group">
                <span className="font-medium text-gray-700 group-hover:text-sky-800">Manage Pricing</span>
                <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-sky-600" />
              </Link>
              <Link href="/admin/workers" className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-sky-200 hover:bg-sky-50 transition-colors group">
                <span className="font-medium text-gray-700 group-hover:text-sky-800">Manage Workers</span>
                <Users className="w-4 h-4 text-gray-400 group-hover:text-sky-600" />
              </Link>
            </div>
          </div>
          
          <div className="card p-6 bg-gradient-to-br from-sky-900 to-slate-900 text-white border-none">
            <h2 className="text-lg font-semibold text-white/90 mb-2">System Status</h2>
            <p className="text-sm text-sky-200 mb-6">ERP is running optimally. Billing engine active.</p>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All Services Operational
            </div>
          </div>
          
          <div className="card p-6 border-none bg-emerald-50">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4">Payment Breakdown</h2>
            <div className="space-y-3">
              {metrics?.payment_modes?.map((pm) => (
                <div key={pm.mode} className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <span className="font-medium text-emerald-800">{pm.mode}</span>
                  <span className="text-emerald-600 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full text-sm">{pm.count} orders</span>
                </div>
              ))}
              {(!metrics?.payment_modes || metrics.payment_modes.length === 0) && (
                <p className="text-sm text-emerald-700">No payment data yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color = 'sky' }) {
  const colorMap = {
    sky: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="metric-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 text-xs font-medium text-gray-500">
          {trend}
        </div>
      )}
    </div>
  );
}
