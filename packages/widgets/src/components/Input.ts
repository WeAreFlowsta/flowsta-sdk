/**
 * Input Component
 * Reusable input component for all widgets
 */

import { sanitizeText } from '../utils';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

export interface InputOptions {
  /** Input type */
  type?: InputType;
  /** Input name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Input value */
  value?: string;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Auto focus */
  autoFocus?: boolean;
  /** Auto complete */
  autoComplete?: string;
  /** Max length */
  maxLength?: number;
  /** CSS classes */
  className?: string;
  /** Input handler */
  onInput?: (value: string, event: Event) => void;
  /** Change handler */
  onChange?: (value: string, event: Event) => void;
  /** Blur handler */
  onBlur?: (value: string, event: Event) => void;
  /** ARIA label */
  ariaLabel?: string;
}

export interface InputGroup {
  container: HTMLDivElement;
  input: HTMLInputElement;
  label?: HTMLLabelElement;
  helperText?: HTMLParagraphElement;
  errorText?: HTMLParagraphElement;
}

/**
 * Create an input field with label and helper text
 */
export function createInput(options: InputOptions): InputGroup {
  const {
    type = 'text',
    name,
    placeholder,
    value = '',
    label,
    helperText,
    error,
    disabled = false,
    required = false,
    autoFocus = false,
    autoComplete,
    maxLength,
    className = '',
    onInput,
    onChange,
    onBlur,
    ariaLabel,
  } = options;

  // Container
  const container = document.createElement('div');
  container.className = `flowsta-input-group ${className}`;

  // Label
  let labelElement: HTMLLabelElement | undefined;
  if (label) {
    labelElement = document.createElement('label');
    labelElement.className = 'flowsta-input-label';
    labelElement.textContent = label;
    if (required) {
      const asterisk = document.createElement('span');
      asterisk.className = 'flowsta-input-required';
      asterisk.textContent = ' *';
      asterisk.style.color = 'var(--flowsta-color-error, #ef4444)';
      labelElement.appendChild(asterisk);
    }
    container.appendChild(labelElement);
  }

  // Input
  const input = document.createElement('input');
  input.type = type;
  input.className = 'flowsta-input';
  
  if (name) input.name = name;
  if (placeholder) input.placeholder = placeholder;
  if (value) input.value = value;
  if (disabled) input.disabled = disabled;
  if (required) input.required = required;
  if (autoFocus) input.autofocus = autoFocus;
  if (autoComplete) input.autocomplete = autoComplete;
  if (maxLength) input.maxLength = maxLength;
  if (ariaLabel) input.setAttribute('aria-label', ariaLabel);

  // Link label to input
  if (labelElement) {
    const inputId = `flowsta-input-${Math.random().toString(36).substr(2, 9)}`;
    input.id = inputId;
    labelElement.htmlFor = inputId;
  }

  // Error state
  if (error) {
    input.classList.add('flowsta-input-error');
    input.setAttribute('aria-invalid', 'true');
  }

  // Event handlers
  if (onInput) {
    input.addEventListener('input', (e) => {
      onInput(input.value, e);
    });
  }

  if (onChange) {
    input.addEventListener('change', (e) => {
      onChange(input.value, e);
    });
  }

  if (onBlur) {
    input.addEventListener('blur', (e) => {
      onBlur(input.value, e);
    });
  }

  container.appendChild(input);

  // Helper text
  let helperTextElement: HTMLParagraphElement | undefined;
  if (helperText && !error) {
    helperTextElement = document.createElement('p');
    helperTextElement.className = 'flowsta-input-helper';
    helperTextElement.textContent = helperText;
    container.appendChild(helperTextElement);
  }

  // Error text
  let errorTextElement: HTMLParagraphElement | undefined;
  if (error) {
    errorTextElement = document.createElement('p');
    errorTextElement.className = 'flowsta-input-error-text';
    errorTextElement.textContent = error;
    errorTextElement.setAttribute('role', 'alert');
    container.appendChild(errorTextElement);
    
    // Link error to input
    const errorId = `flowsta-error-${Math.random().toString(36).substr(2, 9)}`;
    errorTextElement.id = errorId;
    input.setAttribute('aria-describedby', errorId);
  }

  return {
    container,
    input,
    label: labelElement,
    helperText: helperTextElement,
    errorText: errorTextElement,
  };
}

/**
 * Update input state
 */
export function updateInput(
  inputGroup: InputGroup,
  updates: Partial<InputOptions>
): void {
  const { input, container, errorText, helperText } = inputGroup;

  if (updates.value !== undefined) {
    input.value = updates.value;
  }

  if (updates.disabled !== undefined) {
    input.disabled = updates.disabled;
  }

  if (updates.error !== undefined) {
    if (updates.error) {
      input.classList.add('flowsta-input-error');
      input.setAttribute('aria-invalid', 'true');
      
      if (errorText) {
        errorText.textContent = updates.error;
      } else {
        const newErrorText = document.createElement('p');
        newErrorText.className = 'flowsta-input-error-text';
        newErrorText.textContent = updates.error;
        newErrorText.setAttribute('role', 'alert');
        container.appendChild(newErrorText);
      }
      
      // Hide helper text when error is shown
      if (helperText) {
        helperText.style.display = 'none';
      }
    } else {
      input.classList.remove('flowsta-input-error');
      input.removeAttribute('aria-invalid');
      
      if (errorText) {
        errorText.remove();
      }
      
      // Show helper text again
      if (helperText) {
        helperText.style.display = '';
      }
    }
  }

  if (updates.placeholder !== undefined) {
    input.placeholder = updates.placeholder;
  }
}

/**
 * Get sanitized input value
 */
export function getInputValue(inputGroup: InputGroup): string {
  return sanitizeText(inputGroup.input.value);
}

/**
 * Clear input value
 */
export function clearInput(inputGroup: InputGroup): void {
  inputGroup.input.value = '';
  inputGroup.input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Focus input
 */
export function focusInput(inputGroup: InputGroup): void {
  inputGroup.input.focus();
}

/**
 * Validate email input
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(
  password: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

