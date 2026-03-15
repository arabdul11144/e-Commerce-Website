import type { Product, Seller } from '../types';
import { apiRequest } from './api';

export interface SellerSession extends Seller {
  token: string;
}

export interface SellerRegisterPayload {
  businessName: string;
  activeBankAccount: string;
  profileImage?: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
  password: string;
}

export interface SellerProfilePayload {
  businessName: string;
  activeBankAccount: string;
  profileImage?: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
}

export function loginSeller(email: string, password: string) {
  return apiRequest<SellerSession>('/api/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerSeller(payload: SellerRegisterPayload) {
  return apiRequest<SellerSession>('/api/seller/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSellerProfile(token: string) {
  return apiRequest<Seller>('/api/seller/profile', { token });
}

export function updateSellerProfile(token: string, payload: SellerProfilePayload) {
  return apiRequest<Seller>('/api/seller/profile', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateSellerProfileImage(
  token: string,
  payload: { image?: string; removeImage?: boolean }
) {
  return apiRequest<Seller>('/api/seller/profile/image', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function changeSellerPassword(
  token: string,
  payload: { currentPassword: string; newPassword: string }
) {
  return apiRequest<{ message: string }>('/api/seller/profile/password', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export function uploadSellerProductImage(token: string, image: string) {
  return apiRequest<{ url: string }>('/api/seller/products/upload-image', {
    method: 'POST',
    token,
    body: JSON.stringify({ image }),
  });
}

export function fetchSellerProducts(token: string) {
  return apiRequest<{ items: Product[] }>('/api/seller/products', { token });
}
