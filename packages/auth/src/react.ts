/**
 * Flowsta Auth SDK 2.0 - React bindings
 * 
 * Usage:
 * ```tsx
 * import { FlowstaAuthProvider, useFlowstaAuth } from '@flowsta/auth/react';
 * 
 * // Wrap your app
 * <FlowstaAuthProvider clientId="..." redirectUri="...">
 *   <App />
 * </FlowstaAuthProvider>
 * 
 * // Use in components
 * function MyComponent() {
 *   const { isAuthenticated, user, login, logout } = useFlowstaAuth();
 *   // ...
 * }
 * ```
 */

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  type ReactNode 
} from 'react';
import { FlowstaAuth, type FlowstaAuthConfig, type FlowstaUser, type AuthState } from './index.js';

// Re-export types
export type { FlowstaAuthConfig, FlowstaUser, AuthState };

interface FlowstaAuthContextValue extends AuthState {
  /** Redirect to Flowsta login */
  login: () => Promise<void>;
  /** Log out the current user */
  logout: () => void;
  /** Handle OAuth callback (call on redirect URI page) */
  handleCallback: () => Promise<FlowstaUser>;
}

const FlowstaAuthContext = createContext<FlowstaAuthContextValue | null>(null);

interface FlowstaAuthProviderProps extends FlowstaAuthConfig {
  children: ReactNode;
}

/**
 * Flowsta Auth Provider component
 * Wrap your app with this to enable authentication
 */
export function FlowstaAuthProvider({ 
  children, 
  clientId, 
  redirectUri,
  scopes,
  loginUrl,
  apiUrl,
}: FlowstaAuthProviderProps) {
  const [auth] = useState(() => new FlowstaAuth({ 
    clientId, 
    redirectUri,
    scopes,
    loginUrl,
    apiUrl,
  }));
  
  const [state, setState] = useState<AuthState>(() => auth.getState());
  
  // Check auth state on mount
  useEffect(() => {
    setState(auth.getState());
  }, [auth]);
  
  const login = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await auth.login();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }));
    }
  }, [auth]);
  
  const logout = useCallback(() => {
    auth.logout();
    setState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      isLoading: false,
      error: null,
    });
  }, [auth]);
  
  const handleCallback = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const user = await auth.handleCallback();
      setState({
        isAuthenticated: true,
        user,
        accessToken: auth.getAccessToken(),
        isLoading: false,
        error: null,
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [auth]);
  
  const value: FlowstaAuthContextValue = {
    ...state,
    login,
    logout,
    handleCallback,
  };
  
  return (
    <FlowstaAuthContext.Provider value={value}>
      {children}
    </FlowstaAuthContext.Provider>
  );
}

/**
 * Hook to access Flowsta Auth
 * Must be used within a FlowstaAuthProvider
 */
export function useFlowstaAuth(): FlowstaAuthContextValue {
  const context = useContext(FlowstaAuthContext);
  if (!context) {
    throw new Error('useFlowstaAuth must be used within a FlowstaAuthProvider');
  }
  return context;
}

/**
 * Hook to protect routes/components
 * Redirects to login if not authenticated
 */
export function useRequireAuth(options?: { redirectTo?: string }): AuthState & { isReady: boolean } {
  const { isAuthenticated, isLoading, login, ...rest } = useFlowstaAuth();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        if (options?.redirectTo) {
          window.location.href = options.redirectTo;
        } else {
          login();
        }
      } else {
        setIsReady(true);
      }
    }
  }, [isAuthenticated, isLoading, login, options?.redirectTo]);
  
  return { isAuthenticated, isLoading, isReady, ...rest };
}

// Default exports
export { FlowstaAuth };
export default FlowstaAuthProvider;

