const BASE_URL = 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const apiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: getAuthHeaders(),
    ...options
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
};

// Auth API
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
};

// Dashboard API
export const dashboardApi = {
  getOverview: () => apiRequest('/dashboard/overview'),
  getRecentActivity: () => apiRequest('/dashboard/recent-activity'),
  getUsers: () => apiRequest('/dashboard/users'),
  getUserDetails: (userId: number) => apiRequest(`/dashboard/users/${userId}`)
};

// Repair API
export const repairApi = {
  getRequests: () => apiRequest('/repair/admin/requests'),
  updateRequestStatus: (requestId: number, status: string) =>
    apiRequest(`/repair/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  deleteRequest: (requestId: number) =>
    apiRequest(`/repair/admin/requests/${requestId}`, { method: 'DELETE' }),
  
  getServices: () => apiRequest('/repair/admin/services'),
  createService: (service: any) =>
    apiRequest('/repair/admin/services', {
      method: 'POST',
      body: JSON.stringify(service)
    }),
  updateService: (serviceId: number, service: any) =>
    apiRequest(`/repair/admin/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(service)
    }),
  deleteService: (serviceId: number) =>
    apiRequest(`/repair/admin/services/${serviceId}`, { method: 'DELETE' }),
  
  getTimeSlots: () => apiRequest('/repair/admin/time-slots'),
  createTimeSlot: (timeSlot: any) =>
    apiRequest('/repair/admin/time-slots', {
      method: 'POST',
      body: JSON.stringify(timeSlot)
    }),
  deleteTimeSlot: (timeSlotId: number) =>
    apiRequest(`/repair/admin/time-slots/${timeSlotId}`, { method: 'DELETE' }),
  
  getMechanicCharge: () => apiRequest('/repair/admin/mechanic-charge'),
  updateMechanicCharge: (charge: number) =>
    apiRequest('/repair/admin/mechanic-charge', {
      method: 'PUT',
      body: JSON.stringify({ charge })
    })
};

// Rental API
export const rentalApi = {
  getRequests: () => apiRequest('/rental/admin/requests'),
  updateRequestStatus: (requestId: number, status: string) =>
    apiRequest(`/rental/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  deleteRequest: (requestId: number) =>
    apiRequest(`/rental/admin/requests/${requestId}`, { method: 'DELETE' }),
  
  getBicycles: () => apiRequest('/rental/admin/bicycles'),
  createBicycle: (formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    return fetch(`${BASE_URL}/rental/admin/bicycles`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
  },
  updateBicycle: (bicycleId: number, bicycle: any) =>
    apiRequest(`/rental/admin/bicycles/${bicycleId}`, {
      method: 'PUT',
      body: JSON.stringify(bicycle)
    }),
  deleteBicycle: (bicycleId: number) =>
    apiRequest(`/rental/admin/bicycles/${bicycleId}`, { method: 'DELETE' })
};

// Coupon API
export const couponApi = {
  getCoupons: () => apiRequest('/coupon/admin'),
  createCoupon: (coupon: any) =>
    apiRequest('/coupon/admin', {
      method: 'POST',
      body: JSON.stringify(coupon)
    }),
  deleteCoupon: (couponId: number) =>
    apiRequest(`/coupon/admin/${couponId}`, { method: 'DELETE' })
};

// Promotional Cards API
export const promotionalApi = {
  getCards: () => apiRequest('/promotional/admin'),
  createCard: (formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    return fetch(`${BASE_URL}/promotional/admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
  },
  updateCard: (cardId: number, formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    return fetch(`${BASE_URL}/promotional/admin/${cardId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
  },
  deleteCard: (cardId: number) =>
    apiRequest(`/promotional/admin/${cardId}`, { method: 'DELETE' })
};