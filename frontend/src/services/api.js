import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const csrfToken = document.cookie?.split('; ').find(r => r.startsWith('csrf-token='))?.split('=')[1];
    if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase())) {
      config.headers['x-csrf-token'] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
    }

    if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_TIMEOUT') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=1';
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const refreshToken = (data) => api.post('/auth/refresh', data);
export const logout = (data) => api.post('/auth/logout', data);
export const changePassword = (data) => api.put('/auth/password', data);

// Events
export const getCategories = () => api.get('/events/categories');
export const getEvents = (params) => api.get('/events', { params });
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const cancelEvent = (id) => api.delete(`/events/${id}`);
export const approveEvent = (id, status) => api.patch(`/events/${id}/approve`, { status });
export const getMyEvents = (params) => api.get('/events/my-events', { params });
export const getEventStats = (id) => api.get(`/events/${id}/stats`);

// Tickets
export const purchaseTickets = (data) => api.post('/tickets/purchase', data);
export const getMyTickets = (params) => api.get('/tickets/my-tickets', { params });

// Scanner
export const validateTicket = (ticketCode) => api.post('/scanner/validate', { ticket_code: ticketCode });
export const checkIn = (ticketCode) => api.post('/scanner/check-in', { ticket_code: ticketCode });

// Payments
export const requestPayment = (data) => api.post('/payments/request', data);
export const getPaymentStatus = (orderId) => api.get(`/payments/status/${orderId}`);

// Organizer
export const getOrganizerStats = () => api.get('/organizer/stats');
export const exportAttendees = (eventId) => api.get(`/organizer/export/${eventId}`, { responseType: 'blob' });
export const getSalesReport = (eventId, params) => api.get(`/organizer/sales/${eventId}`, { params });

// Admin
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const updateUserStatus = (id, isActive) => api.patch(`/admin/users/${id}/status`, { is_active: isActive });
export const getAdminEvents = (params) => api.get('/admin/events', { params });
export const getCommissions = (params) => api.get('/admin/commissions', { params });
export const markCommissionPaid = (id) => api.patch(`/admin/commissions/${id}/pay`);
export const getSettings = () => api.get('/admin/settings');

// Upload
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post('/notifications/read-all');

// Waitlist
export const joinWaitlist = (data) => api.post('/waitlist', data);
export const leaveWaitlist = (id) => api.delete(`/waitlist/${id}`);
export const getMyWaitlist = () => api.get('/waitlist');

// Affiliate
export const getMyAffiliate = () => api.get('/affiliate');
export const getAffiliateOrders = () => api.get('/affiliate/orders');

// Subscriptions
export const getMySubscription = () => api.get('/subscription');
export const subscribe = (plan) => api.post('/subscription', { plan });
export const cancelSubscription = () => api.delete('/subscription');

// Refunds
export const requestRefund = (data) => api.post('/refunds', data);
export const listRefunds = () => api.get('/refunds');
export const processRefund = (id, status) => api.patch(`/refunds/${id}`, { status });

// Organizer approval
export const listPendingOrganizers = () => api.get('/admin/organizers');
export const reviewOrganizer = (id, status) => api.patch(`/admin/organizers/${id}/review`, { status });

// Profile / Bank details
export const getMyProfile = () => api.get('/profile');
export const updateMyProfile = (data) => api.put('/profile', data);

// Commission override
export const updateOrganizerCommission = (id, commission_rate) => api.patch(`/admin/organizers/${id}/commission`, { commission_rate });

// Settings update
export const updatePlatformSettings = (settings) => api.put('/admin/settings', { settings });

// Ticket type toggle
export const toggleTicketType = (id, is_active) => api.patch(`/ticket-types/${id}/toggle`, { is_active });

// Discount codes
export const listDiscountCodes = () => api.get('/discount-codes');
export const createDiscountCode = (data) => api.post('/discount-codes', data);
export const updateDiscountCode = (id, data) => api.patch(`/discount-codes/${id}`, data);
export const deleteDiscountCode = (id) => api.delete(`/discount-codes/${id}`);

// Admin subscriptions
export const listAllSubscriptions = () => api.get('/admin/subscriptions');

// Scanner sync
export const syncEventTickets = (eventId) => api.get(`/scanner/sync/${eventId}`);
export const bulkCheckIn = (checkIns) => api.post('/scanner/bulk-checkin', { check_ins: checkIns });

export default api;
