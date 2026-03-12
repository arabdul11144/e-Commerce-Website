import type { Product } from '../types';
import { apiRequest } from './api';

export interface AdminPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface AdminDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  activeUsers: number;
  trends: {
    revenue: number;
    orders: number;
    products: number;
    activeUsers: number;
  };
  revenueOverview: Array<{
    name: string;
    total: number;
  }>;
  salesByCategory: Array<{
    name: string;
    sales: number;
  }>;
  recentOrders: Array<{
    id: string;
    customer: string;
    date: string;
    total: number;
    status: string;
  }>;
}

export interface AdminProductSummary {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface AdminProductsResponse {
  items: Product[];
  summary: AdminProductSummary;
  pagination: AdminPagination;
}

export interface AdminOrderRow {
  id: string;
  customer: string;
  email: string;
  date: string;
  total: number;
  items: number;
  status: string;
  payment: string;
}

export interface AdminOrderDetailsResponse {
  id?: string;
  _id?: string;
  total?: number;
  status?: string;
  paymentStatus?: string;
  contactEmail?: string;
  shippingAddress?: {
    fullName?: string;
  };
  items?: Array<{
    quantity?: number;
  }>;
}

export interface AdminOrdersResponse {
  items: AdminOrderRow[];
  statusCounts: Record<string, number>;
  pagination: AdminPagination;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  orders: number;
  spent: number;
  status: 'active' | 'blocked';
  joined: string;
  avatar?: string;
}

export interface AdminUsersResponse {
  items: AdminUserRow[];
  pagination: AdminPagination;
}

interface AdminQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  paymentStatus?: string;
  role?: string;
}

function buildQueryString(options: AdminQueryOptions) {
  const searchParams = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function fetchAdminStats(token: string) {
  return apiRequest<AdminDashboardStats>('/api/admin/stats', { token });
}

export function fetchAdminProducts(token: string, options: AdminQueryOptions = {}) {
  return apiRequest<AdminProductsResponse>(
    `/api/admin/products${buildQueryString(options)}`,
    { token }
  );
}

export function createAdminProduct(token: string, payload: Partial<Product>) {
  return apiRequest<Product>('/api/admin/products', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateAdminProduct(
  token: string,
  productId: string,
  payload: Partial<Product>
) {
  return apiRequest<Product>(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminProduct(token: string, productId: string) {
  return apiRequest<{ message: string }>(
    `/api/admin/products/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export function fetchAdminOrders(token: string, options: AdminQueryOptions = {}) {
  return apiRequest<AdminOrdersResponse>(
    `/api/admin/orders${buildQueryString(options)}`,
    { token }
  );
}

export function updateAdminOrder(
  token: string,
  orderId: string,
  payload: { status?: string; paymentStatus?: string }
) {
  return apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function fetchAdminOrderDetails(token: string, orderId: string) {
  return apiRequest<AdminOrderDetailsResponse>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    { token }
  );
}

export function fetchAdminUsers(token: string, options: AdminQueryOptions = {}) {
  return apiRequest<AdminUsersResponse>(
    `/api/admin/users${buildQueryString(options)}`,
    { token }
  );
}

export function updateAdminUser(
  token: string,
  userId: string,
  payload: { role?: string; status?: string }
) {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}
