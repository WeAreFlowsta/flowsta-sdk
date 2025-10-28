/**
 * Button Component Tests
 * Unit tests for the Button component
 */

import { describe, it, expect, vi } from 'vitest';
import { createButton, updateButton, createButtonGroup } from '../../../src/components/Button';

describe('Button Component', () => {
  describe('createButton', () => {
    it('should create a button with default options', () => {
      const button = createButton({ content: 'Click me' });
      
      expect(button.tagName).toBe('BUTTON');
      expect(button.textContent).toBe('Click me');
      expect(button.className).toContain('flowsta-button');
      expect(button.className).toContain('flowsta-button-primary');
      expect(button.type).toBe('button');
    });

    it('should create a button with custom variant', () => {
      const button = createButton({
        content: 'Secondary',
        variant: 'secondary',
      });
      
      expect(button.className).toContain('flowsta-button-secondary');
    });

    it('should create a disabled button', () => {
      const button = createButton({
        content: 'Disabled',
        disabled: true,
      });
      
      expect(button.disabled).toBe(true);
    });

    it('should create a loading button', () => {
      const button = createButton({
        content: 'Loading',
        loading: true,
      });
      
      expect(button.disabled).toBe(true);
      expect(button.innerHTML).toContain('flowsta-spinner');
    });

    it('should create a full-width button', () => {
      const button = createButton({
        content: 'Full Width',
        fullWidth: true,
      });
      
      expect(button.className).toContain('flowsta-button-full-width');
    });

    it('should call onClick handler when clicked', async () => {
      const onClick = vi.fn();
      const button = createButton({
        content: 'Click me',
        onClick,
      });
      
      button.click();
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      const button = createButton({
        content: 'Click me',
        disabled: true,
        onClick,
      });
      
      button.click();
      
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should set ARIA label', () => {
      const button = createButton({
        content: 'Click',
        ariaLabel: 'Custom Label',
      });
      
      expect(button.getAttribute('aria-label')).toBe('Custom Label');
    });

    it('should accept HTMLElement as content', () => {
      const icon = document.createElement('span');
      icon.textContent = '🚀';
      
      const button = createButton({
        content: icon,
      });
      
      expect(button.querySelector('span')).toBeTruthy();
      expect(button.textContent).toBe('🚀');
    });
  });

  describe('updateButton', () => {
    it('should update button disabled state', () => {
      const button = createButton({ content: 'Button' });
      
      updateButton(button, { disabled: true });
      expect(button.disabled).toBe(true);
      
      updateButton(button, { disabled: false });
      expect(button.disabled).toBe(false);
    });

    it('should update button loading state', () => {
      const button = createButton({ content: 'Button' });
      const originalContent = button.innerHTML;
      
      updateButton(button, { loading: true });
      expect(button.disabled).toBe(true);
      expect(button.innerHTML).toContain('flowsta-spinner');
      
      updateButton(button, { loading: false });
      expect(button.innerHTML).toBe(originalContent);
    });

    it('should update button content', () => {
      const button = createButton({ content: 'Original' });
      
      updateButton(button, { content: 'Updated' });
      expect(button.textContent).toBe('Updated');
    });
  });

  describe('createButtonGroup', () => {
    it('should create button group with buttons', () => {
      const button1 = createButton({ content: 'Button 1' });
      const button2 = createButton({ content: 'Button 2' });
      
      const group = createButtonGroup([button1, button2]);
      
      expect(group.className).toContain('flowsta-button-group');
      expect(group.children).toHaveLength(2);
    });

    it('should apply spacing', () => {
      const button1 = createButton({ content: 'Button 1' });
      const button2 = createButton({ content: 'Button 2' });
      
      const group = createButtonGroup([button1, button2], {
        spacing: 'large',
      });
      
      expect(group.className).toContain('flowsta-gap-lg');
    });

    it('should apply alignment', () => {
      const button1 = createButton({ content: 'Button 1' });
      const button2 = createButton({ content: 'Button 2' });
      
      const group = createButtonGroup([button1, button2], {
        alignment: 'right',
      });
      
      expect(group.style.justifyContent).toBe('flex-end');
    });
  });
});

