/**
 * Test Setup
 * Global setup for Vitest tests
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // Keep error for debugging
  error: console.error,
};

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock alert for browser API tests
global.alert = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Clear document body
  document.body.innerHTML = '';
  
  // Reset document.body.style.overflow
  document.body.style.overflow = '';
});

// Mock Shadow DOM if not available
if (typeof ShadowRoot === 'undefined') {
  (global as any).ShadowRoot = class ShadowRoot extends DocumentFragment {};
}

// Mock CustomEvent if not available
if (typeof CustomEvent === 'undefined') {
  (global as any).CustomEvent = class CustomEvent extends Event {
    public detail: any;
    constructor(event: string, params: any) {
      super(event, params);
      this.detail = params?.detail;
    }
  };
}

