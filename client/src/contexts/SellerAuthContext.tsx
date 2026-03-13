import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Seller } from '../types';
import {
  type SellerRegisterPayload,
  type SellerSession,
  loginSeller,
  registerSeller,
} from '../lib/seller';

interface SellerAuthContextValue {
  seller: Seller | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: SellerRegisterPayload) => Promise<void>;
  logout: () => void;
  syncSeller: (seller: Seller) => void;
}

const SELLER_AUTH_STORAGE_KEY = 'techvault.seller.auth';

const SellerAuthContext = createContext<SellerAuthContextValue | null>(null);

function readStoredSession() {
  const rawSession = window.localStorage.getItem(SELLER_AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as SellerSession;
  } catch {
    window.localStorage.removeItem(SELLER_AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: SellerSession | null) {
  if (session) {
    window.localStorage.setItem(SELLER_AUTH_STORAGE_KEY, JSON.stringify(session));
    return;
  }

  window.localStorage.removeItem(SELLER_AUTH_STORAGE_KEY);
}

export function SellerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SellerSession | null>(() => readStoredSession());

  const updateSession = useCallback((nextSession: SellerSession | null) => {
    setSession(nextSession);
    writeStoredSession(nextSession);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const nextSession = await loginSeller(username, password);
      updateSession(nextSession);
    },
    [updateSession]
  );

  const register = useCallback(
    async (payload: SellerRegisterPayload) => {
      const nextSession = await registerSeller(payload);
      updateSession(nextSession);
    },
    [updateSession]
  );

  const logout = useCallback(() => {
    updateSession(null);
  }, [updateSession]);

  const syncSeller = useCallback(
    (seller: Seller) => {
      setSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        const nextSession = {
          ...currentSession,
          ...seller,
        };

        writeStoredSession(nextSession);
        return nextSession;
      });
    },
    []
  );

  const value = useMemo<SellerAuthContextValue>(
    () => ({
      seller: session
        ? {
            id: session.id,
            name: session.name,
            businessName: session.businessName,
            activeBankAccount: session.activeBankAccount,
            profileImage: session.profileImage,
            validEmail: session.validEmail,
            mobileNumber: session.mobileNumber,
            pickupAddress: session.pickupAddress,
            username: session.username,
            status: session.status,
            role: 'seller',
          }
        : null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      login,
      register,
      logout,
      syncSeller,
    }),
    [login, logout, register, session, syncSeller]
  );

  return (
    <SellerAuthContext.Provider value={value}>
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth() {
  const context = useContext(SellerAuthContext);

  if (!context) {
    throw new Error('useSellerAuth must be used within a SellerAuthProvider.');
  }

  return context;
}
