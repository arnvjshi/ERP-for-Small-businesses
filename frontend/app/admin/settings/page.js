'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, Save, Smartphone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({ upi_id: '', upi_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-12 text-center text-sky-600">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="page-title">Store Settings</h1>
        <p className="text-gray-500 mt-1">Manage global configuration like payment details.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-800 border-b pb-4">
          <Smartphone className="w-5 h-5 text-gray-400" /> UPI Payment Configuration
        </h2>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="label mb-1">Store UPI ID (VPA)</label>
            <input 
              type="text" 
              className="input-field max-w-md" 
              value={settings.upi_id}
              onChange={e => setSettings({...settings, upi_id: e.target.value})}
              placeholder="e.g. yourstore@upi"
              required
            />
            <p className="text-xs text-gray-500 mt-2">This ID will be used to generate the QR code in the payment modal.</p>
          </div>
          
          <div>
            <label className="label mb-1">Store Display Name</label>
            <input 
              type="text" 
              className="input-field max-w-md" 
              value={settings.upi_name}
              onChange={e => setSettings({...settings, upi_name: e.target.value})}
              placeholder="e.g. Laundry Bros"
              required
            />
            <p className="text-xs text-gray-500 mt-2">The name that appears on the customer's UPI app.</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Settings</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
