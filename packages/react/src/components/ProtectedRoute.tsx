/**
 * Protected Route component for React
 */
import React, { ReactNode } from 'react';
import { useIsAuthenticated } from '../hooks';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Component to show when not authenticated */
  fallback?: ReactNode;
  /** Redirect URL when not authenticated */
  redirectTo?: string;
}

/**
 * Wrapper component that only renders children if user is authenticated
 */
export function ProtectedRoute({
  children,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    if (redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null;
    }
    
    return <>{fallback || <div>Please login to access this content</div>}</>;
  }

  return <>{children}</>;
}

