'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicNavbar from '@/components/navbar/PublicNavbar';
import { api } from '@/lib/api';
import { formatCurrency, formatPricingType } from '@/lib/utils';
import { Plus, Minus, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const [orderItems, setOrderItems] = useState([]); // { service_id, quantity, garment_type }

  useEffect(() => {
    async function fetchServices() {
      try {
        const data = await api.getServices();
        setServices(data || []);
      } catch (err) {
        setError('Failed to load services. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };

  const getOrderItem = (serviceId) => {
    return orderItems.find(item => item.service_id === serviceId);
  };

  const updateQuantity = (service, change) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.service_id === service.id);
      let newQty = 0;
      
      // Default step handling based on unit
      const step = service.unit.toLowerCase() === 'kg' ? 0.5 : 1;

      if (existing) {
        newQty = Math.max(0, parseFloat(existing.quantity) + (change * step));
      } else if (change > 0) {
        newQty = step;
      }

      if (newQty <= 0) {
        return prev.filter(item => item.service_id !== service.id);
      }

      if (existing) {
        return prev.map(item => 
          item.service_id === service.id ? { ...item, quantity: newQty.toFixed(1) } : item
        );
      } else {
        return [...prev, { service_id: service.id, quantity: newQty.toFixed(1) }];
      }
    });
  };

  const setExactQuantity = (serviceId, value) => {
    const qty = parseFloat(value);
    setOrderItems(prev => {
      if (isNaN(qty) || qty <= 0) {
        return prev.filter(item => item.service_id !== serviceId);
      }
      const existing = prev.find(item => item.service_id === serviceId);
      if (existing) {
        return prev.map(item => 
          item.service_id === serviceId ? { ...item, quantity: value } : item
        );
      } else {
        return [...prev, { service_id: serviceId, quantity: value }];
      }
    });
  };

  // Calculate estimated total on frontend
  const calculateEstimate = () => {
    let total = 0;
    orderItems.forEach(item => {
      const service = services.find(s => s.id === item.service_id);
      if (!service) return;
      
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(service.rate);
      const minCharge = parseFloat(service.minimum_charge);

      let lineTotal = 0;
      if (service.pricing_type === 'PER_KG') {
        lineTotal = Math.max(qty * rate, minCharge);
      } else if (service.pricing_type === 'PER_PIECE' || service.pricing_type === 'PER_UNIT') {
        lineTotal = qty * rate;
      } else if (service.pricing_type === 'FLAT') {
        lineTotal = rate;
      }
      
      total += lineTotal;
    });
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          address: customer.address || undefined
        },
        items: orderItems.map(item => ({
          service_id: item.service_id,
          quantity: parseFloat(item.quantity)
        }))
      };

      const res = await api.createOrder(payload);
      toast.success(res.message);
      router.push(`/track?id=${res.order_number}`);
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="pt-24 pb-20 px-4 min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Place an Order</h1>
            <p className="text-gray-500 mt-2">Select your services and enter your details below.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Col - Forms */}
            <div className="flex-1 space-y-8">
              
              {/* Customer Details */}
              <section className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-sm">1</span>
                  Your Details
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name *</label>
                    <input type="text" name="name" required className="input-field" value={customer.name} onChange={handleCustomerChange} placeholder="e.g. Arnav Joshi" />
                  </div>
                  <div>
                    <label className="label">Phone Number *</label>
                    <input type="tel" name="phone" required className="input-field" value={customer.phone} onChange={handleCustomerChange} placeholder="10-digit number" />
                  </div>
                  <div>
                    <label className="label">Email (Optional)</label>
                    <input type="email" name="email" className="input-field" value={customer.email} onChange={handleCustomerChange} placeholder="For digital receipts" />
                  </div>
                  <div>
                    <label className="label">Address (Optional)</label>
                    <input type="text" name="address" className="input-field" value={customer.address} onChange={handleCustomerChange} placeholder="Full address" />
                  </div>
                </div>
              </section>

              {/* Services */}
              <section className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-sm">2</span>
                  Select Services
                </h2>
                
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="skeleton h-24 w-full"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map(service => {
                      const item = getOrderItem(service.id);
                      const qty = item ? item.quantity : '';
                      
                      return (
                        <div key={service.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${item ? 'border-sky-300 bg-sky-50/30' : 'border-gray-200 hover:border-sky-200'}`}>
                          <div>
                            <h3 className="font-semibold text-gray-900">{service.name}</h3>
                            <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span>{formatCurrency(service.rate)} / {service.unit}</span>
                              {parseFloat(service.minimum_charge) > 0 && (
                                <span className="text-sky-600">Min: {formatCurrency(service.minimum_charge)}</span>
                              )}
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{formatPricingType(service.pricing_type)}</span>
                            </div>
                            {service.description && <p className="text-xs text-gray-400 mt-1">{service.description}</p>}
                          </div>
                          
                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(service, -1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input 
                              type="number" 
                              value={qty} 
                              onChange={(e) => setExactQuantity(service.id, e.target.value)}
                              placeholder="0"
                              className="w-16 text-center input-field !py-1"
                              step={service.unit.toLowerCase() === 'kg' ? "0.1" : "1"}
                              min="0"
                            />
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(service, 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

            </div>

            {/* Right Col - Order Summary */}
            <div className="lg:w-80 shrink-0">
              <div className="card p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-gray-900">
                  <ShoppingBag className="w-5 h-5 text-sky-600" />
                  Order Summary
                </div>
                
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                    Select services to see estimated bill.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                      {orderItems.map(item => {
                        const service = services.find(s => s.id === item.service_id);
                        if (!service) return null;
                        
                        let lineTotal = 0;
                        const qty = parseFloat(item.quantity) || 0;
                        const rate = parseFloat(service.rate);
                        const min = parseFloat(service.minimum_charge);
                        
                        if (service.pricing_type === 'PER_KG') {
                          lineTotal = Math.max(qty * rate, min);
                        } else {
                          lineTotal = qty * rate;
                        }

                        return (
                          <div key={item.service_id} className="text-sm flex justify-between">
                            <div className="text-gray-600">
                              <span className="block font-medium text-gray-800">{service.name}</span>
                              <span className="text-xs">{item.quantity} {service.unit} × {formatCurrency(service.rate)}</span>
                              {service.pricing_type === 'PER_KG' && (qty * rate) < min && (
                                <span className="block text-xs text-sky-600">Min charge applied</span>
                              )}
                            </div>
                            <span className="font-medium text-gray-900">{formatCurrency(lineTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 space-y-2 mb-6">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(calculateEstimate())}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Tax</span>
                        <span>₹0.00</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-100">
                        <span>Estimated Total</span>
                        <span>{formatCurrency(calculateEstimate())}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-center">
                        * Final bill will be calculated by the backend upon processing.
                      </p>
                    </div>

                    <button 
                      onClick={handleSubmit} 
                      disabled={submitting || orderItems.length === 0 || !customer.name || !customer.phone}
                      className="btn-primary w-full flex justify-center items-center gap-2"
                    >
                      {submitting ? 'Placing Order...' : 'Submit Order'}
                      {!submitting && <ArrowRight className="w-4 h-4" />}
                    </button>
                    {(!customer.name || !customer.phone) && orderItems.length > 0 && (
                      <p className="text-xs text-red-500 mt-2 text-center">Please fill in required customer details.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
