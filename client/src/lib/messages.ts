import type { SellerMessage } from '../types';
import { apiRequest } from './api';

export interface SellerMessagesResponse {
  items: SellerMessage[];
  unreadCount: number;
}

export function sendSellerMessage(
  token: string,
  payload: { sellerId: string; productId?: string; message: string }
) {
  return apiRequest<SellerMessage>('/api/seller/messages', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function fetchSellerMessages(token: string) {
  return apiRequest<SellerMessagesResponse>('/api/seller/messages', { token });
}

export function markSellerMessageRead(token: string, messageId: string) {
  return apiRequest<SellerMessage>(`/api/seller/messages/${encodeURIComponent(messageId)}/read`, {
    method: 'PUT',
    token,
  });
}
