'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatPricingType } from '@/lib/utils';
import { AlertCircle, Edit, Plus, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [editingService, setEditingService] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [newMinCharge, setNewMinCharge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Store settings state
  const [settings, setSettings] = useState({ upi_name: '', upi_id: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  // Add Service Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    pricing_type: 'PER_KG',
    unit: 'kg',
    category: 'Washing',
    rate: '',
    minimum_charge: '0',
    sort_order: 0
  });

  useEffect(() => {
    fetchServices();
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings(settings);
      toast.success('Store & Payment settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function fetchServices() {
    try {
      setLoading(true);
      const data = await api.getAdminServices();
      setServices(data);
    } catch (err) {
      setError('Failed to load services.');
    } finally {
      setLoading(false);
    }
  }

  const openEditModal = (service) => {
    setEditingService(service);
    setNewRate(service.current_price?.rate || '0');
    setNewMinCharge(service.current_price?.minimum_charge || '0');
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.updateServicePricing(editingService.id, {
        rate: parseFloat(newRate),
        minimum_charge: parseFloat(newMinCharge)
      });
      toast.success('Pricing updated successfully');
      setEditingService(null);
      await fetchServices();
    } catch (err) {
      toast.error(err.message || 'Failed to update pricing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createService({
        ...newService,
        rate: parseFloat(newService.rate),
        minimum_charge: parseFloat(newService.minimum_charge || '0')
      });
      toast.success('Service created successfully');
      setShowAddModal(false);
      setNewService({
        name: '', description: '', pricing_type: 'PER_KG', 
        unit: 'kg', category: 'Washing', rate: '', minimum_charge: '0', sort_order: 0
      });
      await fetchServices();
    } catch (err) {
      toast.error(err.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading pricing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Services & Pricing</h1>
          <p className="text-gray-500 mt-1">Manage dynamic pricing. Changes will only affect new orders.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Store Settings / UPI Config */}
      <div className="card p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Payment Configuration (UPI)</h2>
        <form onSubmit={handleSaveSettings} className="grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="label">Store/Payee Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={settings.upi_name}
              onChange={e => setSettings({...settings, upi_name: e.target.value})}
              placeholder="e.g. Laundry Bros"
              required
            />
          </div>
          <div>
            <label className="label">UPI ID</label>
            <input 
              type="text" 
              className="input-field" 
              value={settings.upi_id}
              onChange={e => setSettings({...settings, upi_id: e.target.value})}
              placeholder="e.g. store@upi"
              required
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header py-3 px-5">Service Name</th>
                <th className="table-header py-3 px-5">Category</th>
                <th className="table-header py-3 px-5">Pricing Type</th>
                <th className="table-header py-3 px-5 text-right">Current Rate</th>
                <th className="table-header py-3 px-5 text-right">Min Charge</th>
                <th className="table-header py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell px-5 font-medium text-gray-900">{service.name}</td>
                  <td className="table-cell px-5">
                    <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-xs">
                      {service.category || 'General'}
                    </span>
                  </td>
                  <td className="table-cell px-5 text-gray-600">
                    {formatPricingType(service.pricing_type)}
                  </td>
                  <td className="table-cell px-5 text-right font-medium text-gray-900">
                    {formatCurrency(service.current_price?.rate)} <span className="text-gray-400 text-xs font-normal">/ {service.unit}</span>
                  </td>
                  <td className="table-cell px-5 text-right text-gray-600">
                    {parseFloat(service.current_price?.minimum_charge) > 0 
                      ? formatCurrency(service.current_price.minimum_charge) 
                      : '-'}
                  </td>
                  <td className="table-cell px-5">
                    <div className="flex justify-center items-center gap-2">
                      <button 
                        onClick={() => openEditModal(service)}
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded transition-colors"
                        title="Update Price"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title="Price History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Update Pricing</h3>
            <p className="text-sm text-gray-500 mb-6">
              Updating the price for <span className="font-semibold text-gray-700">{editingService.name}</span>. 
              This will only affect new orders. Old invoices remain unchanged.
            </p>
            
            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div>
                <label className="label">New Rate (per {editingService.unit})</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    className="input-field pl-8" 
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Minimum Charge (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="input-field pl-8" 
                    value={newMinCharge}
                    onChange={e => setNewMinCharge(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave as 0 if not applicable.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingService(null)}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save New Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Service</h3>
            <p className="text-sm text-gray-500 mb-6">Create a new service with pricing and categorization.</p>
            
            <form onSubmit={handleAddService} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Service Name</label>
                  <input 
                    type="text" 
                    required
                    className="input-field" 
                    value={newService.name}
                    onChange={e => setNewService({...newService, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newService.category}
                    onChange={e => setNewService({...newService, category: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newService.description}
                    onChange={e => setNewService({...newService, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Pricing Type</label>
                  <select 
                    className="input-field"
                    value={newService.pricing_type}
                    onChange={e => setNewService({...newService, pricing_type: e.target.value})}
                  >
                    <option value="PER_KG">Per KG</option>
                    <option value="PER_PIECE">Per Piece</option>
                    <option value="FLAT">Flat Rate</option>
                    <option value="PER_UNIT">Per Unit</option>
                  </select>
                </div>
                <div>
                  <label className="label">Unit Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. kg, piece, load"
                    className="input-field" 
                    value={newService.unit}
                    onChange={e => setNewService({...newService, unit: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Rate (per unit)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      required
                      className="input-field pl-8" 
                      value={newService.rate}
                      onChange={e => setNewService({...newService, rate: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Minimum Charge (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      className="input-field pl-8" 
                      value={newService.minimum_charge}
                      onChange={e => setNewService({...newService, minimum_charge: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
