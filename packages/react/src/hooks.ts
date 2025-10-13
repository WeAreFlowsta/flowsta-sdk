/**
 * Additional React hooks for Flowsta Auth
 */
import { useCallback } from 'react';
import { useFlowstaAuth, useFlowstaAuthClient } from './FlowstaAuthContext';
import type { RegisterInput, LoginInput } from '@flowsta/auth-sdk';

/**
 * Hook for authentication actions (login, register, logout)
 */
export function useFlowstaAuthActions() {
  const client = useFlowstaAuthClient();

  const register = useCallback(
    async (input: RegisterInput) => {
      await client.register(input);
    },
    [client]
  );

  const login = useCallback(
    async (input: LoginInput) => {
      await client.login(input);
    },
    [client]
  );

  const logout = useCallback(() => {
    client.logout();
  }, [client]);

  const refreshToken = useCallback(async () => {
    await client.refreshToken();
  }, [client]);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      await client.requestPasswordReset(email);
    },
    [client]
  );

  const confirmPasswordReset = useCallback(
    async (token: string, newPassword: string) => {
      await client.confirmPasswordReset(token, newPassword);
    },
    [client]
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      await client.verifyEmail(token);
    },
    [client]
  );

  return {
    register,
    login,
    logout,
    refreshToken,
    requestPasswordReset,
    confirmPasswordReset,
    verifyEmail,
  };
}

/**
 * Hook to get current user
 */
export function useFlowstaUser() {
  const { user, isAuthenticated, isLoading } = useFlowstaAuth();
  
  return {
    user,
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useFlowstaAuth();
  return isAuthenticated;
}

