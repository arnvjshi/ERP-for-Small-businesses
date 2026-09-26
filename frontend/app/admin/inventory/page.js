'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { AlertCircle, Package, Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminInventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
      const data = await api.getInventory();
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  if (loading && items.length === 0) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-sky-600">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track consumables, packaging, and supplies.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
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
                <th className="table-header py-3 px-5">Item Name</th>
                <th className="table-header py-3 px-5 text-right">Current Stock</th>
                <th className="table-header py-3 px-5 text-right">Min. Stock</th>
                <th className="table-header py-3 px-5 text-right">Cost/Unit</th>
                <th className="table-header py-3 px-5 text-center">Status</th>
                <th className="table-header py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const stock = parseFloat(item.current_stock);
                const minStock = parseFloat(item.minimum_stock);
                const isLow = stock <= minStock;
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell px-5 font-medium text-gray-900">{item.name}</td>
                    <td className="table-cell px-5 text-right font-medium">
                      <span className={cn(isLow ? 'text-red-600' : 'text-gray-900')}>
                        {stock} {item.unit}
                      </span>
                    </td>
                    <td className="table-cell px-5 text-right text-gray-500">{minStock} {item.unit}</td>
                    <td className="table-cell px-5 text-right text-gray-600">{formatCurrency(item.cost_per_unit)}</td>
                    <td className="table-cell px-5 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="table-cell px-5 text-center">
                      <button className="btn-secondary !px-3 !py-1.5 text-xs">Adjust</button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                    <p>No inventory items found.</p>
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
