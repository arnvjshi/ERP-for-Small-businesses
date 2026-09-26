/**
 * Utility functions for the frontend.
 */

/**
 * Format a number as Indian Rupee currency.
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,250.00"
 */
export function formatCurrency(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a date string for display.
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g. "26 Sep 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date and time string for display.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status badge color classes.
 * @param {string} status
 * @returns {string} Tailwind classes
 */
export function getStatusColor(status) {
  switch (status) {
    case 'RECEIVED':
      return 'bg-gray-100 text-gray-700';
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'READY_FOR_PICKUP':
      return 'bg-emerald-100 text-emerald-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Get payment status badge color classes.
 */
export function getPaymentColor(status) {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800';
    case 'PARTIALLY_PAID':
      return 'bg-orange-100 text-orange-700';
    case 'REFUNDED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Format order status for human display.
 */
export function formatStatus(status) {
  switch (status) {
    case 'RECEIVED': return 'Received';
    case 'CONFIRMED': return 'Confirmed';
    case 'IN_PROGRESS': return 'In Progress';
    case 'READY_FOR_PICKUP': return 'Ready for Pickup';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    case 'PENDING': return 'Pending';
    case 'PAID': return 'Paid';
    case 'PARTIALLY_PAID': return 'Partially Paid';
    case 'REFUNDED': return 'Refunded';
    default: return status;
  }
}

/**
 * Format pricing type for display.
 */
export function formatPricingType(type) {
  switch (type) {
    case 'PER_KG': return 'Per KG';
    case 'PER_PIECE': return 'Per Piece';
    case 'FLAT': return 'Flat Rate';
    case 'PER_UNIT': return 'Per Unit';
    default: return type;
  }
}

/**
 * CN — classname merge utility (simplified).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
