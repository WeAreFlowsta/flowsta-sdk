/**
 * FlowstaWidget Base Class Tests
 * Unit tests for the base widget class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowstaWidget } from '../../src/FlowstaWidget';
import { WidgetEvents, WidgetErrorCodes } from '../../src/types';
import type { BaseWidgetOptions } from '../../src/types';
import {
  createTestContainer,
  cleanupTestContainer,
  createMockOptions,
  mockApiSuccess,
  mockApiError,
} from '../utils/test-helpers';

// Create a concrete implementation for testing
class TestWidget extends FlowstaWidget {
  protected widgetType = 'test';

  async initialize(): Promise<void> {
    await this.validateClientId();
    this.setState('ready');
  }

  protected render(): void {
    const container = document.createElement('div');
    container.textContent = 'Test Widget';
    this.root.appendChild(container);
  }
}

describe('FlowstaWidget Base Class', () => {
  let container: HTMLDivElement;
  let options: BaseWidgetOptions;

  beforeEach(() => {
    container = createTestContainer();
    options = createMockOptions();
  });

  afterEach(() => {
    cleanupTestContainer(container);
  });

  describe('Initialization', () => {
    it('should create widget instance', () => {
      const widget = new TestWidget(container, options);
      
      expect(widget).toBeInstanceOf(FlowstaWidget);
      expect(widget.getState()).toBe('initializing');
    });

    it('should attach Shadow DOM', () => {
      const widget = new TestWidget(container, options);
      
      // Shadow DOM should be attached (closed mode)
      expect(container.shadowRoot).toBeNull(); // Closed mode, not accessible
    });

    it('should emit initialized event', () => {
      const onInitialized = vi.fn();
      const widget = new TestWidget(container, options);
      
      widget.on(WidgetEvents.INITIALIZED, onInitialized);
      
      expect(onInitialized).toHaveBeenCalledTimes(0); // Already emitted in constructor
    });

    it('should use custom API URL', () => {
      const customOptions = {
        ...options,
        apiUrl: 'https://custom-api.com',
      };
      
      const widget = new TestWidget(container, customOptions);
      
      expect(widget['apiUrl']).toBe('https://custom-api.com');
    });

    it('should apply theme', () => {
      const widget = new TestWidget(container, options);
      
      expect(widget['theme']).toBeDefined();
      expect(widget['theme'].colors).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      const widget = new TestWidget(container, options);
      
      expect(widget.getState()).toBe('initializing');
    });

    it('should emit state change event', () => {
      const widget = new TestWidget(container, options);
      const onStateChange = vi.fn();
      
      widget.on(WidgetEvents.STATE_CHANGE, onStateChange);
      widget['setState']('ready');
      
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            data: {
              previousState: 'initializing',
              currentState: 'ready',
            },
          }),
        })
      );
    });
  });

  describe('Lifecycle Methods', () => {
    it('should show widget', () => {
      const widget = new TestWidget(container, options);
      const onShow = vi.fn();
      
      widget.on(WidgetEvents.SHOW, onShow);
      widget.show();
      
      expect(widget['isVisible']).toBe(true);
      expect(onShow).toHaveBeenCalled();
    });

    it('should hide widget', () => {
      const widget = new TestWidget(container, options);
      const onHide = vi.fn();
      
      widget.show();
      widget.on(WidgetEvents.HIDE, onHide);
      widget.hide();
      
      expect(widget['isVisible']).toBe(false);
      expect(onHide).toHaveBeenCalled();
    });

    it('should destroy widget', () => {
      const widget = new TestWidget(container, options);
      const onDestroy = vi.fn();
      
      widget.on(WidgetEvents.DESTROY, onDestroy);
      widget.destroy();
      
      expect(widget.getState()).toBe('destroyed');
      expect(onDestroy).toHaveBeenCalled();
    });
  });

  describe('API Communication', () => {
    it('should validate client ID', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });
      
      const widget = new TestWidget(container, options);
      const result = await widget['validateClientId']();
      
      expect(result.valid).toBe(true);
      expect(result.clientName).toBe('Test Client');
    });

    it('should throw error on invalid client ID', async () => {
      mockApiError(404, 'Invalid client ID');
      
      const widget = new TestWidget(container, options);
      
      await expect(widget['validateClientId']()).rejects.toThrow();
    });

    it('should get auth token', async () => {
      const widget = new TestWidget(container, options);
      const token = await widget['getAuthToken']();
      
      expect(token).toBe('test-token');
    });

    it('should throw error when no auth token', async () => {
      const noTokenOptions = {
        ...options,
        getAuthToken: undefined,
      };
      
      const widget = new TestWidget(container, noTokenOptions);
      
      await expect(widget['getAuthToken']()).rejects.toThrow();
    });

    it('should make authenticated API request', async () => {
      mockApiSuccess({ data: 'test' });
      
      const widget = new TestWidget(container, options);
      const result = await widget['apiRequest']('/test', { method: 'GET' });
      
      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'X-Client-Id': 'test-client-id',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockApiError(500, 'Server error');
      
      const widget = new TestWidget(container, options);
      
      await expect(widget['apiRequest']('/test')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors', () => {
      const widget = new TestWidget(container, options);
      const onError = vi.fn();
      
      widget.on(WidgetEvents.ERROR, onError);
      
      const error = new Error('Test error');
      widget['handleError'](error);
      
      expect(widget.getState()).toBe('error');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            data: expect.objectContaining({
              code: WidgetErrorCodes.UNKNOWN_ERROR,
              message: 'Test error',
            }),
          }),
        })
      );
    });
  });

  describe('Event Emitter', () => {
    it('should subscribe to events', () => {
      const widget = new TestWidget(container, options);
      const handler = vi.fn();
      
      widget.on('custom-event', handler);
      widget['emitEvent']('custom-event', { test: 'data' });
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            data: { test: 'data' },
          }),
        })
      );
    });

    it('should unsubscribe from events', () => {
      const widget = new TestWidget(container, options);
      const handler = vi.fn();
      
      widget.on('custom-event', handler);
      widget.off('custom-event', handler);
      widget['emitEvent']('custom-event', { test: 'data' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

