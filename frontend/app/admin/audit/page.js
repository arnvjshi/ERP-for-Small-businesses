'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  if (loading && logs.length === 0) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-sky-600">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Review system activity and administrative actions.</p>
        </div>
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
                <th className="table-header py-3 px-5">Timestamp</th>
                <th className="table-header py-3 px-5">User</th>
                <th className="table-header py-3 px-5">Action</th>
                <th className="table-header py-3 px-5">Entity Type</th>
                <th className="table-header py-3 px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                  <td className="table-cell px-5 text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="table-cell px-5 font-medium text-gray-900">{log.user}</td>
                  <td className="table-cell px-5 text-gray-700">{log.action}</td>
                  <td className="table-cell px-5 text-gray-500">{log.entity_type} (ID: {log.entity_id})</td>
                  <td className="table-cell px-5 text-gray-500">{log.details || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                    <p>No audit logs found.</p>
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
