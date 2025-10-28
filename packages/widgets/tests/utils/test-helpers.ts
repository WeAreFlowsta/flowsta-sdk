/**
 * Test Helpers
 * Utility functions for testing widgets
 */

import { vi } from 'vitest';
import type { BaseWidgetOptions } from '../../src/types';

/**
 * Create a test container element
 */
export function createTestContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Clean up test container
 */
export function cleanupTestContainer(container?: HTMLElement): void {
  if (container) {
    container.remove();
  } else {
    const existing = document.getElementById('test-container');
    if (existing) {
      existing.remove();
    }
  }
}

/**
 * Create mock widget options
 */
export function createMockOptions(
  overrides?: Partial<BaseWidgetOptions>
): BaseWidgetOptions {
  return {
    clientId: 'test-client-id',
    getAuthToken: vi.fn().mockResolvedValue('test-token'),
    apiUrl: 'https://api.test.com',
    debug: true,
    ...overrides,
  };
}

/**
 * Mock successful API response
 */
export function mockApiSuccess<T>(data: T): void {
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

/**
 * Mock API error
 */
export function mockApiError(status: number, error: string): void {
  (global.fetch as any).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error }),
  });
}

/**
 * Wait for next tick
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await waitForNextTick();
  }
}

/**
 * Simulate user click
 */
export function simulateClick(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/**
 * Simulate user input
 */
export function simulateInput(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Simulate user change
 */
export function simulateChange(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Get element from Shadow DOM
 */
export function getFromShadowRoot<T extends Element = Element>(
  container: HTMLElement,
  selector: string
): T | null {
  const shadowRoot = container.shadowRoot;
  if (!shadowRoot) {
    return null;
  }
  return shadowRoot.querySelector<T>(selector);
}

/**
 * Get all elements from Shadow DOM
 */
export function getAllFromShadowRoot<T extends Element = Element>(
  container: HTMLElement,
  selector: string
): NodeListOf<T> | null {
  const shadowRoot = container.shadowRoot;
  if (!shadowRoot) {
    return null;
  }
  return shadowRoot.querySelectorAll<T>(selector);
}

/**
 * Check if Shadow DOM is supported
 */
export function isShadowDOMSupported(): boolean {
  return !!(typeof ShadowRoot === 'function' &&
    document.body.attachShadow);
}

/**
 * Mock fetch with custom response
 */
export function mockFetch(response: any): void {
  (global.fetch as any).mockResolvedValueOnce(response);
}

/**
 * Mock client validation
 */
export function mockClientValidation(options?: { valid?: boolean; clientName?: string }): void {
  const { valid = true, clientName = 'Test Client' } = options || {};
  
  mockApiSuccess({
    valid,
    clientName,
    allowedOrigins: ['http://localhost'],
  });
}

/**
 * Mock recovery phrase setup
 */
export function mockRecoveryPhraseSetup(options?: { 
  recoveryPhrase?: string; 
  verificationIndices?: number[] 
}): void {
  const {
    recoveryPhrase = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24',
    verificationIndices = [2, 7, 15],
  } = options || {};
  
  mockApiSuccess({
    recoveryPhrase,
    verificationIndices,
  });
}

/**
 * Mock recovery phrase status
 */
export function mockRecoveryPhraseStatus(options?: { active?: boolean; verified?: boolean }): void {
  const { active = false, verified = false } = options || {};
  
  mockApiSuccess({
    recoveryPhraseActive: active,
    recoveryPhraseVerified: verified,
  });
}

/**
 * Mock email verification status
 */
export function mockEmailVerificationStatus(options?: { verified?: boolean; email?: string }): void {
  const { verified = false, email = 'test@example.com' } = options || {};
  
  mockApiSuccess({
    emailVerified: verified,
    email,
  });
}

/**
 * Mock resend verification
 */
export function mockResendVerification(): void {
  mockApiSuccess({
    success: true,
    message: 'Verification email sent',
  });
}

/**
 * Mock account recovery
 */
export function mockAccountRecovery(options?: { 
  exists?: boolean; 
  valid?: boolean; 
  success?: boolean;
  error?: string;
}): void {
  const { exists, valid, success, error } = options || {};
  
  if (error) {
    mockApiError(400, error);
  } else {
    mockApiSuccess({
      exists,
      valid,
      success,
    });
  }
}

/**
 * Mock security dashboard status
 */
export function mockSecurityDashboardStatus(options: {
  recoveryPhraseActive: boolean;
  emailVerified: boolean;
  lastPasswordChange: string;
  accountCreated: string;
}): void {
  mockApiSuccess(options);
}

/**
 * Mock password change
 */
export function mockPasswordChange(options?: { success?: boolean }): void {
  const { success = true } = options || {};
  
  mockApiSuccess({
    success,
    message: success ? 'Password changed successfully' : 'Failed to change password',
  });
}

