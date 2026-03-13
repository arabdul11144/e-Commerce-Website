import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSellerAuth } from '../../contexts/SellerAuthContext';

export function SellerRouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSellerAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/seller/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
