/**
 * React Context for Flowsta Auth
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FlowstaAuth } from '@flowsta/auth-sdk';
import type { FlowstaAuthConfig, FlowstaAuthState } from '@flowsta/auth-sdk';

interface FlowstaAuthContextValue extends FlowstaAuthState {
  flowstaAuth: FlowstaAuth | null;
}

const FlowstaAuthContext = createContext<FlowstaAuthContextValue | undefined>(undefined);

interface FlowstaAuthProviderProps {
  config: FlowstaAuthConfig;
  children: ReactNode;
}

/**
 * Provider component for Flowsta Auth
 * Wrap your app with this to use Flowsta authentication
 */
export function FlowstaAuthProvider({ config, children }: FlowstaAuthProviderProps) {
  const [flowstaAuth] = useState(() => new FlowstaAuth(config));
  const [authState, setAuthState] = useState<FlowstaAuthState>(flowstaAuth.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = flowstaAuth.subscribe((state) => {
      setAuthState(state);
    });

    // Load initial state
    setAuthState(flowstaAuth.getState());

    return unsubscribe;
  }, [flowstaAuth]);

  const value: FlowstaAuthContextValue = {
    ...authState,
    flowstaAuth,
  };

  return (
    <FlowstaAuthContext.Provider value={value}>
      {children}
    </FlowstaAuthContext.Provider>
  );
}

/**
 * Hook to access Flowsta Auth context
 * Must be used within FlowstaAuthProvider
 */
export function useFlowstaAuth() {
  const context = useContext(FlowstaAuthContext);
  
  if (context === undefined) {
    throw new Error('useFlowstaAuth must be used within FlowstaAuthProvider');
  }
  
  return context;
}

/**
 * Hook to get the FlowstaAuth instance
 */
export function useFlowstaAuthClient(): FlowstaAuth {
  const { flowstaAuth } = useFlowstaAuth();
  
  if (!flowstaAuth) {
    throw new Error('FlowstaAuth client not initialized');
  }
  
  return flowstaAuth;
}

