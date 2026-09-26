'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, Users, Plus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    try {
      setLoading(true);
      const data = await api.getWorkers();
      setWorkers(data);
    } catch (err) {
      setError(err.message || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  }

  if (loading && workers.length === 0) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-sky-600">Loading workers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Worker Management</h1>
          <p className="text-gray-500 mt-1">Manage operational staff accounts.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Worker
        </button>
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
                <th className="table-header py-3 px-5">Name</th>
                <th className="table-header py-3 px-5">Username</th>
                <th className="table-header py-3 px-5">Email</th>
                <th className="table-header py-3 px-5">Status</th>
                <th className="table-header py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell px-5 font-medium text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-500" />
                    {worker.full_name}
                  </td>
                  <td className="table-cell px-5 text-gray-600">{worker.username}</td>
                  <td className="table-cell px-5 text-gray-600">{worker.email || 'N/A'}</td>
                  <td className="table-cell px-5">
                    {worker.is_active ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">Inactive</span>
                    )}
                  </td>
                  <td className="table-cell px-5 text-center">
                    <button className="text-sm font-medium text-sky-600 hover:text-sky-800 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                    <p>No workers found.</p>
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
