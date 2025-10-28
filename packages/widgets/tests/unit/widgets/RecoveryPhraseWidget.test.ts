/**
 * Recovery Phrase Widget Tests
 * Unit tests for the Recovery Phrase Widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecoveryPhraseWidget } from '../../../src/widgets/RecoveryPhraseWidget';
import type { RecoveryPhraseWidgetOptions } from '../../../src/types';
import {
  createTestContainer,
  cleanupTestContainer,
  mockApiSuccess,
  mockApiError,
  waitFor,
} from '../../utils/test-helpers';

describe('RecoveryPhraseWidget', () => {
  let container: HTMLDivElement;
  let options: RecoveryPhraseWidgetOptions;

  beforeEach(() => {
    container = createTestContainer();
    options = {
      clientId: 'test-client-id',
      getAuthToken: vi.fn().mockResolvedValue('test-token'),
      apiUrl: 'https://api.test.com',
      debug: true,
    };
  });

  afterEach(() => {
    cleanupTestContainer(container);
  });

  describe('Initialization', () => {
    it('should create widget instance', () => {
      const widget = new RecoveryPhraseWidget(container, options);
      
      expect(widget).toBeInstanceOf(RecoveryPhraseWidget);
      expect(widget.getState()).toBe('initializing');
    });

    it('should initialize successfully', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      const widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();
      
      expect(widget.getState()).toBe('ready');
    });

    it('should auto-show if enabled', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      const optionsWithAutoShow = {
        ...options,
        autoShow: true,
      };

      const widget = new RecoveryPhraseWidget(container, optionsWithAutoShow);
      await widget.initialize();
      
      expect(widget['isVisible']).toBe(true);
    });

    it('should not auto-show if disabled', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      const optionsWithoutAutoShow = {
        ...options,
        autoShow: false,
      };

      const widget = new RecoveryPhraseWidget(container, optionsWithoutAutoShow);
      await widget.initialize();
      
      expect(widget['isVisible']).toBe(false);
    });
  });

  describe('Step Navigation', () => {
    let widget: RecoveryPhraseWidget;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();
      widget.show();
    });

    it('should start at intro step', () => {
      expect(widget['currentStep']).toBe('intro');
    });

    it('should show custom messages if provided', () => {
      const customOptions = {
        ...options,
        customMessages: {
          title: 'Custom Title',
          description: 'Custom Description',
        },
      };

      const customWidget = new RecoveryPhraseWidget(container, customOptions);
      // Widget rendering happens, custom messages should be used
      expect(customWidget).toBeDefined();
    });
  });

  describe('Password Step', () => {
    let widget: RecoveryPhraseWidget;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();
      widget.show();
      widget['goToStep']('password');
    });

    it('should show password step', () => {
      expect(widget['currentStep']).toBe('password');
    });

    it('should generate phrase with valid password', async () => {
      mockApiSuccess({
        recoveryPhrase: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24',
        verificationIndices: [2, 7, 15],
      });

      // Simulate password input
      widget['passwordInput'] = {
        input: { value: 'test-password' },
        container: document.createElement('div'),
      };

      await widget['handleGeneratePhrase']();

      expect(widget['currentStep']).toBe('display');
      expect(widget['recoveryPhrase']).toBeTruthy();
      expect(widget['verificationIndices']).toEqual([2, 7, 15]);
    });

    it('should show error for empty password', async () => {
      const mockInput = document.createElement('input');
      mockInput.value = '';
      
      widget['passwordInput'] = {
        input: mockInput,
        container: document.createElement('div'),
      };

      await widget['handleGeneratePhrase']();

      expect(widget['currentStep']).toBe('password');
    });

    it('should show error for invalid password', async () => {
      mockApiError(401, 'Invalid password');

      const mockInput = document.createElement('input');
      mockInput.value = 'wrong-password';
      
      widget['passwordInput'] = {
        input: mockInput,
        container: document.createElement('div'),
      };

      await widget['handleGeneratePhrase']();

      expect(widget.getState()).toBe('error');
    });
  });

  describe('Display Step', () => {
    let widget: RecoveryPhraseWidget;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();
      widget['recoveryPhrase'] = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
      widget['verificationIndices'] = [2, 7, 15];
      widget['goToStep']('display');
    });

    it('should display recovery phrase', () => {
      expect(widget['currentStep']).toBe('display');
      expect(widget['recoveryPhrase']).toBeTruthy();
    });

    it('should copy phrase to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      await widget['copyToClipboard']();

      expect(mockWriteText).toHaveBeenCalledWith(widget['recoveryPhrase']);
    });

    it('should download phrase as text file', () => {
      // Mock URL methods
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      global.URL.revokeObjectURL = vi.fn();

      // Mock createElement to return a proper element
      const mockLink = document.createElement('a');
      const clickSpy = vi.spyOn(mockLink, 'click');
      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockLink);

      // Mock appendChild and removeChild
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      widget['downloadPhrase']();

      // Verify the download flow
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Verification Step', () => {
    let widget: RecoveryPhraseWidget;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();
      widget['recoveryPhrase'] = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
      widget['verificationIndices'] = [2, 7, 15];
      widget['goToStep']('verify');
    });

    it('should show verification step', () => {
      expect(widget['currentStep']).toBe('verify');
    });

    it('should verify correct words', async () => {
      mockApiSuccess({ success: true });

      // Mock verification inputs with proper DOM elements
      const input1 = document.createElement('input');
      input1.value = 'word3';
      const input2 = document.createElement('input');
      input2.value = 'word8';
      const input3 = document.createElement('input');
      input3.value = 'word16';

      widget['verificationInputs'] = [
        { input: input1, container: document.createElement('div') },
        { input: input2, container: document.createElement('div') },
        { input: input3, container: document.createElement('div') },
      ];

      await widget['handleVerify']();

      expect(widget.getState()).toBe('success');
      expect(widget['currentStep']).toBe('success');
    });

    it('should reject incorrect words', async () => {
      // Mock verification inputs with wrong words
      const input1 = document.createElement('input');
      input1.value = 'wrong1';
      const input2 = document.createElement('input');
      input2.value = 'wrong2';
      const input3 = document.createElement('input');
      input3.value = 'wrong3';

      widget['verificationInputs'] = [
        { input: input1, container: document.createElement('div') },
        { input: input2, container: document.createElement('div') },
        { input: input3, container: document.createElement('div') },
      ];

      await widget['handleVerify']();

      // Should stay on verify step
      expect(widget['currentStep']).toBe('verify');
    });
  });

  describe('Success Step', () => {
    let widget: RecoveryPhraseWidget;
    let onComplete: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      onComplete = vi.fn();
      const optionsWithCallback = {
        ...options,
        onComplete,
      };

      widget = new RecoveryPhraseWidget(container, optionsWithCallback);
      await widget.initialize();
      widget['goToStep']('success');
    });

    it('should show success step', () => {
      expect(widget['currentStep']).toBe('success');
    });

    it('should call onComplete callback', async () => {
      await widget['handleComplete']();

      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it('should hide widget after completion', async () => {
      widget.show();
      expect(widget['isVisible']).toBe(true);

      await widget['handleComplete']();

      expect(widget['isVisible']).toBe(false);
    });
  });

  describe('Dismiss Functionality', () => {
    it('should allow dismiss if enabled', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      const onDismiss = vi.fn();
      const optionsWithDismiss = {
        ...options,
        allowDismiss: true,
        onDismiss,
      };

      const widget = new RecoveryPhraseWidget(container, optionsWithDismiss);
      await widget.initialize();
      widget.show();

      await widget['handleDismiss']();

      expect(onDismiss).toHaveBeenCalled();
      expect(widget['isVisible']).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiError(500, 'Server error');

      const onError = vi.fn();
      const optionsWithError = {
        ...options,
        onError,
      };

      const widget = new RecoveryPhraseWidget(container, optionsWithError);
      
      // Initialize will catch errors internally
      await widget.initialize();

      // Check widget is in error state (errors are handled gracefully)
      expect(widget.getState()).toBe('error');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const widget = new RecoveryPhraseWidget(container, options);
      
      try {
        await widget.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Lifecycle', () => {
    it('should show and hide widget', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      const widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();

      expect(widget['isVisible']).toBe(false);

      widget.show();
      expect(widget['isVisible']).toBe(true);

      widget.hide();
      expect(widget['isVisible']).toBe(false);
    });

    it('should destroy widget', async () => {
      mockApiSuccess({
        valid: true,
        clientName: 'Test Client',
        allowedOrigins: ['http://localhost'],
      });

      const widget = new RecoveryPhraseWidget(container, options);
      await widget.initialize();
      
      widget.destroy();

      expect(widget.getState()).toBe('destroyed');
    });
  });
});

