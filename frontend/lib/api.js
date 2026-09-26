/**
 * API client for communicating with the Laundry Bros backend.
 * All API calls go through this module.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Try refresh
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ detail: 'Request failed' }));
          throw new ApiError(retryResponse.status, error.detail || 'Request failed');
        }
        return retryResponse.json();
      }
      this.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new ApiError(response.status, error.detail || 'Request failed');
    }

    return response.json();
  }

  async tryRefreshToken() {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ─── Auth ──────────────────────────────────────────────────────────
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  logout() {
    this.clearTokens();
  }

  // ─── Public ────────────────────────────────────────────────────────
  async getServices() {
    return this.request('/api/services');
  }

  async createOrder(orderData) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async trackOrder(orderNumber, phone = null) {
    let url = `/api/orders/${orderNumber}/track`;
    if (phone) url += `?phone=${phone}`;
    return this.request(url);
  }

  async getBill(orderNumber) {
    return this.request(`/api/orders/${orderNumber}/bill`);
  }

  // ─── Admin ─────────────────────────────────────────────────────────
  async getDashboard() {
    return this.request('/api/admin/dashboard');
  }

  async getAnalytics(days = 30) {
    return this.request(`/api/admin/analytics?days=${days}`);
  }

  async getAdminOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/admin/orders${query ? '?' + query : ''}`);
  }

  async getAdminOrder(orderId) {
    return this.request(`/api/admin/orders/${orderId}`);
  }

  async updateOrderStatus(orderId, status, notes = null) {
    return this.request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async updatePaymentStatus(orderId, paymentStatus) {
    return this.request(`/api/admin/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
  }

  async getAdminServices() {
    return this.request('/api/admin/services');
  }

  async createService(serviceData) {
    return this.request('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceId, serviceData) {
    return this.request(`/api/admin/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(serviceData),
    });
  }

  async updateServicePricing(serviceId, pricingData) {
    return this.request(`/api/admin/services/${serviceId}/pricing`, {
      method: 'POST',
      body: JSON.stringify(pricingData),
    });
  }

  async getServicePricingHistory(serviceId) {
    return this.request(`/api/admin/services/${serviceId}/pricing`);
  }

  async deleteService(serviceId) {
    return this.request(`/api/admin/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  async getInventory() {
    return this.request('/api/admin/inventory');
  }

  async createInventoryItem(itemData) {
    return this.request('/api/admin/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateInventoryItem(itemId, itemData) {
    return this.request(`/api/admin/inventory/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(itemData),
    });
  }

  async adjustStock(itemId, quantity, reason = null) {
    return this.request(`/api/admin/inventory/${itemId}/stock`, {
      method: 'POST',
      body: JSON.stringify({ quantity, reason }),
    });
  }

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/admin/audit-logs${query ? '?' + query : ''}`);
  }

  async getWorkers() {
    return this.request('/api/admin/workers');
  }

  async createWorker(workerData) {
    return this.request('/api/admin/workers', {
      method: 'POST',
      body: JSON.stringify(workerData),
    });
  }

  async updateWorker(workerId, workerData) {
    return this.request(`/api/admin/workers/${workerId}`, {
      method: 'PATCH',
      body: JSON.stringify(workerData),
    });
  }

  async getSettings() {
    return this.request('/api/admin/settings');
  }

  async updateSettings(settingsData) {
    return this.request('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsData),
    });
  }

  async processPayment(orderId, paymentData) {
    return this.request(`/api/admin/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify(paymentData),
    });
  }

  async processWorkerPayment(orderId, paymentData) {
    return this.request(`/api/worker/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // ─── Worker ────────────────────────────────────────────────────────
  async getWorkerDashboard() {
    return this.request('/api/worker/dashboard');
  }

  async getWorkerOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/worker/orders${query ? '?' + query : ''}`);
  }

  async getWorkerOrder(orderId) {
    return this.request(`/api/worker/orders/${orderId}`);
  }

  async updateWorkerOrderStatus(orderId, status, notes = null) {
    return this.request(`/api/worker/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const api = new ApiClient();
export { ApiError };
