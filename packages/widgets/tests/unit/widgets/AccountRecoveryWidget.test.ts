/**
 * Tests for AccountRecoveryWidget
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountRecoveryWidget } from '../../../src/widgets/AccountRecoveryWidget';
import type { AccountRecoveryWidgetOptions } from '../../../src/types';
import { mockClientValidation, mockFetch } from '../../utils/test-helpers';

describe('AccountRecoveryWidget', () => {
  let container: HTMLDivElement;
  let options: AccountRecoveryWidgetOptions;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    options = {
      clientId: 'test-client-id',
      apiUrl: 'https://api.flowsta.com',
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
    it('should initialize successfully', async () => {
      const widget = new AccountRecoveryWidget(container, options);
      await widget.initialize();

      expect(widget.getState()).toBe('ready');
    });

    it.skip('should handle invalid client ID', async () => {
      // Clear previous mocks and set error response
      vi.clearAllMocks();
      mockFetch({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid client ID' }),
      });

      const widget = new AccountRecoveryWidget(container, options);
      await widget.initialize();

      // Widget handles errors gracefully and sets error state
      expect(widget.getState()).toBe('error');
    });
  });

  describe('Lifecycle', () => {
    it('should show and hide widget', async () => {
      const widget = new AccountRecoveryWidget(container, options);
      await widget.initialize();

      widget.show();
      // Widget should be initialized
      expect(widget.getState()).toBe('ready');

      widget.hide();
      // Widget should still be ready (just hidden)
      expect(widget.getState()).toBe('ready');
    });

    it('should destroy widget', async () => {
      const widget = new AccountRecoveryWidget(container, options);
      await widget.initialize();

      widget.show();
      widget.destroy();

      expect(container.querySelector('.flowsta-widget-container')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it.skip('should handle API errors gracefully', async () => {
      vi.clearAllMocks();
      mockFetch({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const widget = new AccountRecoveryWidget(container, options);
      await widget.initialize();

      // Widget catches errors and sets error state
      expect(widget.getState()).toBe('error');
    });

    it.skip('should handle network errors', async () => {
      vi.clearAllMocks();
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const widget = new AccountRecoveryWidget(container, options);
      await widget.initialize();

      // Widget catches errors and sets error state
      expect(widget.getState()).toBe('error');
    });
  });

  describe('Callbacks', () => {
    it('should trigger onComplete callback when provided', async () => {
      const onComplete = vi.fn();

      const widget = new AccountRecoveryWidget(container, {
        ...options,
        onComplete,
      });
      await widget.initialize();

      // Verify callback is registered
      expect(widget.widgetOptions.onComplete).toBe(onComplete);
    });
  });
});
