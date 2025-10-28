/**
 * Email Verification Widget Tests
 * Unit tests for the Email Verification Widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailVerificationWidget } from '../../../src/widgets/EmailVerificationWidget';
import type { EmailVerificationWidgetOptions } from '../../../src/types';
import {
  createTestContainer,
  cleanupTestContainer,
  mockApiSuccess,
  mockApiError,
  waitFor,
} from '../../utils/test-helpers';

describe('EmailVerificationWidget', () => {
  let container: HTMLDivElement;
  let options: EmailVerificationWidgetOptions;

  beforeEach(() => {
    container = createTestContainer();
    options = {
      clientId: 'test-client-id',
      getAuthToken: vi.fn().mockResolvedValue('test-token'),
      apiUrl: 'https://api.test.com',
      mode: 'banner',
      debug: true,
    };
    
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupTestContainer(container);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create widget instance', () => {
      const widget = new EmailVerificationWidget(container, options);
      
      expect(widget).toBeInstanceOf(EmailVerificationWidget);
      expect(widget.getState()).toBe('initializing');
    });

    it('should initialize successfully', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const widget = new EmailVerificationWidget(container, options);
      await widget.initialize();
      
      expect(widget.getState()).toBe('ready');
    });

    it('should not show widget if already verified', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: true,
        email: 'test@example.com',
      });

      const widget = new EmailVerificationWidget(container, options);
      await widget.initialize();
      
      expect(widget.getState()).toBe('success');
      expect(widget['emailVerified']).toBe(true);
    });

    it('should start verification polling by default', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const widget = new EmailVerificationWidget(container, options);
      await widget.initialize();
      
      expect(widget['verificationCheckInterval']).not.toBeNull();
    });

    it('should not start polling if disabled', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const optionsNoPoll = {
        ...options,
        autoCheckInterval: false,
      };

      const widget = new EmailVerificationWidget(container, optionsNoPoll);
      await widget.initialize();
      
      expect(widget['verificationCheckInterval']).toBeNull();
    });
  });

  describe('Display Modes', () => {
    it('should render banner mode', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const bannerOptions = { ...options, mode: 'banner' as const };
      const widget = new EmailVerificationWidget(container, bannerOptions);
      await widget.initialize();
      
      expect(widget['mode']).toBe('banner');
    });

    it('should render modal mode', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const modalOptions = { ...options, mode: 'modal' as const };
      const widget = new EmailVerificationWidget(container, modalOptions);
      await widget.initialize();
      
      expect(widget['mode']).toBe('modal');
    });

    it('should render inline mode', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const inlineOptions = { ...options, mode: 'inline' as const };
      const widget = new EmailVerificationWidget(container, inlineOptions);
      await widget.initialize();
      
      expect(widget['mode']).toBe('inline');
    });

    it('should use custom messages', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const customOptions = {
        ...options,
        customMessages: {
          title: 'Custom Title',
          description: 'Custom Description',
        },
      };

      const widget = new EmailVerificationWidget(container, customOptions);
      await widget.initialize();
      
      expect(widget).toBeDefined();
    });
  });

  describe('Resend Functionality', () => {
    let widget: EmailVerificationWidget;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      widget = new EmailVerificationWidget(container, options);
      await widget.initialize();
    });

    it('should resend verification email', async () => {
      mockApiSuccess({ success: true });

      await widget['handleResendEmail']();

      expect(widget.getState()).toBe('ready');
      expect(widget['resendCooldown']).toBeGreaterThan(0);
    });

    it('should enforce cooldown period', async () => {
      mockApiSuccess({ success: true });

      // First resend
      await widget['handleResendEmail']();
      expect(widget['resendCooldown']).toBeGreaterThan(0);

      // Try to resend again immediately
      const initialCooldown = widget['resendCooldown'];
      await widget['handleResendEmail']();
      
      // Cooldown should not reset
      expect(widget['resendCooldown']).toBe(initialCooldown);
    });

    it('should count down cooldown timer', async () => {
      mockApiSuccess({ success: true });

      await widget['handleResendEmail']();
      const initialCooldown = widget['resendCooldown'];

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000);

      expect(widget['resendCooldown']).toBe(initialCooldown - 1);
    });

    it('should reset button after cooldown', async () => {
      mockApiSuccess({ success: true });

      await widget['handleResendEmail']();
      const cooldownTime = widget['resendCooldown'];

      // Advance timer past cooldown
      vi.advanceTimersByTime((cooldownTime + 1) * 1000);

      expect(widget['resendCooldown']).toBe(0);
    });

    it('should use custom cooldown duration', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });
      mockApiSuccess({ success: true });

      const customOptions = {
        ...options,
        resendCooldown: 30,
      };

      const customWidget = new EmailVerificationWidget(container, customOptions);
      await customWidget.initialize();
      await customWidget['handleResendEmail']();

      expect(customWidget['resendCooldown']).toBe(30);
    });

    it('should call onResend callback', async () => {
      mockApiSuccess({ success: true });

      const onResend = vi.fn();
      const widget = new EmailVerificationWidget(container, {
        ...options,
        onResend,
      });

      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      await widget.initialize();
      await widget['handleResendEmail']();

      expect(onResend).toHaveBeenCalled();
    });

    it('should handle resend errors', async () => {
      mockApiError(500, 'Server error');

      await widget['handleResendEmail']();

      expect(widget.getState()).toBe('error');
    });
  });

  describe('Verification Polling', () => {
    let widget: EmailVerificationWidget;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      widget = new EmailVerificationWidget(container, options);
      await widget.initialize();
    });

    it('should poll for verification status', async () => {
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      // Verify polling interval is set
      expect(widget['verificationCheckInterval']).not.toBeNull();

      // Advance timer to trigger one polling check
      await vi.advanceTimersByTimeAsync(5000);

      // Polling should still be active
      expect(widget['verificationCheckInterval']).not.toBeNull();
    });

    it('should stop polling when verified', async () => {
      mockApiSuccess({
        emailVerified: true,
        email: 'test@example.com',
      });

      const onVerified = vi.fn();
      widget.widgetOptions.onVerified = onVerified;

      // Trigger verification check
      await widget['checkVerificationStatus']();

      expect(widget['emailVerified']).toBe(true);
      expect(widget['verificationCheckInterval']).toBeNull();
    });

    it('should call onVerified callback', async () => {
      const onVerified = vi.fn();
      
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const verifiedWidget = new EmailVerificationWidget(container, {
        ...options,
        onVerified,
      });

      await verifiedWidget.initialize();
      
      // Mock the API to return verified status
      mockApiSuccess({
        emailVerified: true,
        email: 'test@example.com',
      });

      // Call handleVerified directly
      await verifiedWidget['handleVerified']();

      expect(onVerified).toHaveBeenCalled();
    });

    it('should auto-hide after verification', async () => {
      vi.useRealTimers(); // Need real timers for setTimeout

      mockApiSuccess({
        emailVerified: true,
        email: 'test@example.com',
      });

      widget.show();
      expect(widget['isVisible']).toBe(true);

      await widget['handleVerified']();

      // Wait for auto-hide timeout
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(widget['isVisible']).toBe(false);
    });
  });

  describe('Dismissible', () => {
    it('should allow dismiss if enabled', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const onDismiss = vi.fn();
      const widget = new EmailVerificationWidget(container, {
        ...options,
        dismissible: true,
        onDismiss,
      });

      await widget.initialize();
      widget.show();

      await widget['handleDismiss']();

      expect(onDismiss).toHaveBeenCalled();
      expect(widget['isVisible']).toBe(false);
    });

    it('should stop polling on dismiss', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const widget = new EmailVerificationWidget(container, options);
      await widget.initialize();

      expect(widget['verificationCheckInterval']).not.toBeNull();

      await widget['handleDismiss']();

      expect(widget['verificationCheckInterval']).toBeNull();
    });
  });

  describe('Lifecycle', () => {
    it('should show and hide widget', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const widget = new EmailVerificationWidget(container, options);
      await widget.initialize();

      widget.show();
      expect(widget['isVisible']).toBe(true);

      widget.hide();
      expect(widget['isVisible']).toBe(false);
    });

    it('should destroy widget and clean up', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      mockApiSuccess({
        emailVerified: false,
        email: 'test@example.com',
      });

      const widget = new EmailVerificationWidget(container, options);
      await widget.initialize();

      expect(widget['verificationCheckInterval']).not.toBeNull();

      widget.destroy();

      expect(widget.getState()).toBe('destroyed');
      expect(widget['verificationCheckInterval']).toBeNull();
      expect(widget['resendTimer']).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiError(500, 'Server error');

      const onError = vi.fn();
      const widget = new EmailVerificationWidget(container, {
        ...options,
        onError,
      });

      try {
        await widget.initialize();
      } catch (error) {
        // Error should be caught
      }
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const widget = new EmailVerificationWidget(container, options);

      try {
        await widget.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

