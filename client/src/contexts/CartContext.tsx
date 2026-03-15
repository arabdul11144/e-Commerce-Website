import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { apiRequest, getErrorMessage } from '../lib/api';
import type { CartItem, Product } from '../types';
import { normalizeProduct } from '../utils/product';

interface CartResponseItem {
  product?: Product | null;
  quantity?: number;
}

interface CartResponse {
  items?: CartResponseItem[];
}

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  isLoading: boolean;
  isMutating: (productId: string) => boolean;
  refreshCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateCartItem: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(value: unknown, fallback = 1) {
  const nextValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(nextValue));
}

function mapCartItems(response: CartResponse): CartItem[] {
  return (response.items ?? [])
    .map((item) => {
      if (!item.product) {
        return null;
      }

      const product = normalizeProduct(item.product);
      const quantity = normalizeQuantity(item.quantity, 0);

      if (!product.id || quantity <= 0) {
        return null;
      }

      return {
        product,
        quantity,
      };
    })
    .filter((item): item is CartItem => item !== null);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const refreshCart = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setCartItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest<CartResponse>('/api/cart', { token });
      setCartItems(mapCartItems(response));
    } catch {
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    refreshCart().catch(() => undefined);
  }, [refreshCart]);

  const trackPendingState = useCallback((productId: string, isPending: boolean) => {
    setPendingIds((currentIds) => {
      if (isPending) {
        return currentIds.includes(productId)
          ? currentIds
          : [...currentIds, productId];
      }

      return currentIds.filter((id) => id !== productId);
    });
  }, []);

  const isMutating = useCallback(
    (productId: string) => pendingIds.includes(productId),
    [pendingIds]
  );

  const applyCartResponse = useCallback((response: CartResponse) => {
    setCartItems(mapCartItems(response));
  }, []);

  const addToCart = useCallback(
    async (product: Product, quantity = 1) => {
      if (!token || !isAuthenticated) {
        toast('Sign in to add to cart.');
        return;
      }

      const productId = product.id;
      const nextQuantity = Math.max(1, normalizeQuantity(quantity));

      trackPendingState(productId, true);

      try {
        const response = await apiRequest<CartResponse>('/api/cart/add', {
          method: 'POST',
          token,
          body: JSON.stringify({ productId, quantity: nextQuantity }),
        });

        applyCartResponse(response);
        toast.success(`${product.name} added to cart`);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        trackPendingState(productId, false);
      }
    },
    [applyCartResponse, isAuthenticated, token, trackPendingState]
  );

  const updateCartItem = useCallback(
    async (productId: string, quantity: number) => {
      if (!token || !isAuthenticated) {
        setCartItems([]);
        return;
      }

      trackPendingState(productId, true);

      try {
        const response = await apiRequest<CartResponse>(
          `/api/cart/update/${encodeURIComponent(productId)}`,
          {
            method: 'PUT',
            token,
            body: JSON.stringify({ quantity: normalizeQuantity(quantity, 0) }),
          }
        );

        applyCartResponse(response);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        trackPendingState(productId, false);
      }
    },
    [applyCartResponse, isAuthenticated, token, trackPendingState]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      if (!token || !isAuthenticated) {
        setCartItems([]);
        return;
      }

      trackPendingState(productId, true);

      try {
        const response = await apiRequest<CartResponse>(
          `/api/cart/remove/${encodeURIComponent(productId)}`,
          {
            method: 'DELETE',
            token,
          }
        );

        applyCartResponse(response);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        trackPendingState(productId, false);
      }
    },
    [applyCartResponse, isAuthenticated, token, trackPendingState]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cartItems,
      cartCount,
      isLoading,
      isMutating,
      refreshCart,
      addToCart,
      updateCartItem,
      removeFromCart,
    }),
    [
      addToCart,
      cartCount,
      cartItems,
      isLoading,
      isMutating,
      refreshCart,
      removeFromCart,
      updateCartItem,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider.');
  }

  return context;
}
