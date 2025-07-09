export const StatusUtils = {
  getStatusColor: (status: string): string => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'waiting_payment': return '#17a2b8';
      case 'active': return '#28a745';
      case 'arranging_delivery': return '#6f42c1';
      case 'active_rental': return '#28a745';
      case 'completed': return '#6c757d';
      case 'expired': return '#dc3545';
      default: return '#6c757d';
    }
  },

  getStatusText: (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'waiting_payment': return 'Waiting for Payment';
      case 'active': return 'Active';
      case 'arranging_delivery': return 'Arranging Delivery';
      case 'active_rental': return 'Active Rental';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      default: return status.replace('_', ' ').toUpperCase();
    }
  },

  getStatusIcon: (status: string): string => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'waiting_payment': return 'card-outline';
      case 'active': return 'checkmark-circle-outline';
      case 'arranging_delivery': return 'car-outline';
      case 'active_rental': return 'bicycle-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'expired': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  },

  getTimeRemaining: (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s remaining`;
  }
};