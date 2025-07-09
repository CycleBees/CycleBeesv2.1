// Status color mapping
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending': return '#ffc107';
    case 'approved': return '#28a745';
    case 'waiting_payment': return '#17a2b8';
    case 'arranging_delivery': return '#6f42c1';
    case 'active': 
    case 'active_rental': return '#28a745';
    case 'completed': return '#6c757d';
    case 'expired': return '#dc3545';
    default: return '#6c757d';
  }
};

// Status text formatting
export const getStatusText = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending': return 'Pending';
    case 'approved': return 'Approved';
    case 'waiting_payment': return 'Waiting for Payment';
    case 'arranging_delivery': return 'Arranging Delivery';
    case 'active': return 'Active';
    case 'active_rental': return 'Active Rental';
    case 'completed': return 'Completed';
    case 'expired': return 'Expired';
    default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Filter requests by status
export const filterByStatus = <T extends { status: string }>(
  items: T[], 
  filterStatus: string
): T[] => {
  if (filterStatus === 'all') {
    return items;
  }
  return items.filter(item => item.status.toLowerCase() === filterStatus);
};

// Count items by status
export const getStatusCount = <T extends { status: string }>(
  items: T[], 
  status: string
): number => {
  return items.filter(item => item.status.toLowerCase() === status).length;
};

// Get status filter configuration for different modules
export const getStatusFilters = (
  items: any[], 
  type: 'repair' | 'rental' | 'general' = 'general'
) => {
  const baseFilters = [
    { key: 'all', label: 'All Requests', count: items.length },
    { key: 'pending', label: 'Pending', count: getStatusCount(items, 'pending') },
    { key: 'approved', label: 'Approved', count: getStatusCount(items, 'approved') },
    { key: 'waiting_payment', label: 'Waiting Payment', count: getStatusCount(items, 'waiting_payment') },
    { key: 'completed', label: 'Completed', count: getStatusCount(items, 'completed') },
    { key: 'expired', label: 'Expired', count: getStatusCount(items, 'expired') }
  ];

  if (type === 'rental') {
    baseFilters.splice(4, 0, 
      { key: 'arranging_delivery', label: 'Arranging Delivery', count: getStatusCount(items, 'arranging_delivery') },
      { key: 'active_rental', label: 'Active Rental', count: getStatusCount(items, 'active_rental') }
    );
  } else if (type === 'repair') {
    baseFilters.splice(4, 0,
      { key: 'active', label: 'Active', count: getStatusCount(items, 'active') }
    );
  }

  return baseFilters;
};

// Date formatting utility
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

// Currency formatting utility
export const formatCurrency = (amount: number): string => {
  return `₹${amount}`;
};