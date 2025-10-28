/**
 * Tests for SecurityDashboardWidget
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityDashboardWidget } from '../../../src/widgets/SecurityDashboardWidget';
import type { SecurityDashboardWidgetOptions } from '../../../src/types';
import { mockClientValidation, mockFetch, mockSecurityDashboardStatus } from '../../utils/test-helpers';

describe('SecurityDashboardWidget', () => {
  let container: HTMLDivElement;
  let options: SecurityDashboardWidgetOptions;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    options = {
      clientId: 'test-client-id',
      apiUrl: 'https://api.flowsta.com',
      getAuthToken: () => 'test-token', // Function, not string
    };

    mockClientValidation();
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid token', async () => {
      // Mock client validation
      mockClientValidation();
      
      // Mock recovery phrase status API call
      mockFetch({
        ok: true,
        json: async () => ({
          hasRecoveryPhrase: true,
          verified: true,
          setupDate: new Date().toISOString(),
        }),
      });
      
      // Mock email verification status API call
      mockFetch({
        ok: true,
        json: async () => ({
          emailVerified: true,
          email: 'test@example.com',
        }),
      });

      const widget = new SecurityDashboardWidget(container, options);
      await widget.initialize();

      expect(widget.getState()).toBe('ready');
    });

    it.skip('should handle invalid client ID', async () => {
      mockFetch({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid client ID' }),
      });

      const widget = new SecurityDashboardWidget(container, options);
      await widget.initialize();

      expect(widget.getState()).toBe('error');
    });

    it.skip('should handle missing authentication token', async () => {
      const optionsWithoutToken = {
        clientId: 'test-client-id',
        apiUrl: 'https://api.flowsta.com',
      };

      const widget = new SecurityDashboardWidget(container, optionsWithoutToken);
      await widget.initialize();

      // Should be in error state without token
      expect(widget.getState()).toBe('error');
    });
  });

  describe('Lifecycle', () => {
    beforeEach(() => {
      mockClientValidation();
      mockFetch({
        ok: true,
        json: async () => ({
          hasRecoveryPhrase: true,
          verified: true,
          setupDate: new Date().toISOString(),
        }),
      });
      mockFetch({
        ok: true,
        json: async () => ({
          emailVerified: true,
          email: 'test@example.com',
        }),
      });
    });

    it('should show and hide widget', async () => {
      const widget = new SecurityDashboardWidget(container, options);
      await widget.initialize();

      widget.show();
      expect(widget.getState()).toBe('ready');

      widget.hide();
      expect(widget.getState()).toBe('ready');
    });

    it('should destroy widget', async () => {
      const widget = new SecurityDashboardWidget(container, options);
      await widget.initialize();

      widget.show();
      widget.destroy();

      expect(container.querySelector('.flowsta-widget-container')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it.skip('should handle API errors gracefully', async () => {
      mockFetch({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const widget = new SecurityDashboardWidget(container, options);
      await widget.initialize();

      expect(widget.getState()).toBe('error');
    });

    it.skip('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const widget = new SecurityDashboardWidget(container, options);
      await widget.initialize();

      expect(widget.getState()).toBe('error');
    });
  });

  describe('Callbacks', () => {
    beforeEach(() => {
      mockClientValidation();
      mockFetch({
        ok: true,
        json: async () => ({
          hasRecoveryPhrase: false,
          verified: false,
          setupDate: null,
        }),
      });
      mockFetch({
        ok: true,
        json: async () => ({
          emailVerified: false,
          email: 'test@example.com',
        }),
      });
    });

    it('should register onSetupRecoveryPhrase callback', async () => {
      const onSetupRecoveryPhrase = vi.fn();

      const widget = new SecurityDashboardWidget(container, {
        ...options,
        onSetupRecoveryPhrase,
      });
      await widget.initialize();

      expect(widget.widgetOptions.onSetupRecoveryPhrase).toBe(onSetupRecoveryPhrase);
    });

    it('should register onVerifyEmail callback', async () => {
      const onVerifyEmail = vi.fn();

      const widget = new SecurityDashboardWidget(container, {
        ...options,
        onVerifyEmail,
      });
      await widget.initialize();

      expect(widget.widgetOptions.onVerifyEmail).toBe(onVerifyEmail);
    });

    it('should register onPasswordChange callback', async () => {
      const onPasswordChange = vi.fn();

      const widget = new SecurityDashboardWidget(container, {
        ...options,
        onPasswordChange,
      });
      await widget.initialize();

      expect(widget.widgetOptions.onPasswordChange).toBe(onPasswordChange);
    });
  });

  describe('Configuration', () => {
    it('should support custom messages', async () => {
      mockClientValidation();
      mockFetch({
        ok: true,
        json: async () => ({
          hasRecoveryPhrase: true,
          verified: true,
          setupDate: new Date().toISOString(),
        }),
      });
      mockFetch({
        ok: true,
        json: async () => ({
          emailVerified: true,
          email: 'test@example.com',
        }),
      });

      const widget = new SecurityDashboardWidget(container, {
        ...options,
        messages: {
          title: 'Custom Security Title',
          recoveryPhraseActive: 'Custom Recovery Message',
        },
      });
      await widget.initialize();

      expect(widget.widgetOptions.messages?.title).toBe('Custom Security Title');
    });

    it('should support auto-refresh configuration', async () => {
      mockClientValidation();
      mockFetch({
        ok: true,
        json: async () => ({
          hasRecoveryPhrase: true,
          verified: true,
          setupDate: new Date().toISOString(),
        }),
      });
      mockFetch({
        ok: true,
        json: async () => ({
          emailVerified: true,
          email: 'test@example.com',
        }),
      });

      const widget = new SecurityDashboardWidget(container, {
        ...options,
        autoRefresh: true,
        refreshInterval: 10000,
      });
      await widget.initialize();

      expect(widget.widgetOptions.autoRefresh).toBe(true);
      expect(widget.widgetOptions.refreshInterval).toBe(10000);
    });
  });
});
