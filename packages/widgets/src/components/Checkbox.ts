/**
 * Checkbox Component
 * Reusable checkbox component for all widgets
 */

export interface CheckboxOptions {
  /** Checkbox label */
  label: string | HTMLElement;
  /** Checkbox name */
  name?: string;
  /** Checked state */
  checked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** CSS classes */
  className?: string;
  /** Change handler */
  onChange?: (checked: boolean, event: Event) => void;
  /** ARIA label */
  ariaLabel?: string;
}

export interface CheckboxGroup {
  container: HTMLLabelElement;
  input: HTMLInputElement;
  label: HTMLSpanElement;
}

/**
 * Create a checkbox with label
 */
export function createCheckbox(options: CheckboxOptions): CheckboxGroup {
  const {
    label,
    name,
    checked = false,
    disabled = false,
    required = false,
    className = '',
    onChange,
    ariaLabel,
  } = options;

  // Container (label acts as clickable container)
  const container = document.createElement('label');
  container.className = `flowsta-checkbox ${className}`;

  if (disabled) {
    container.classList.add('flowsta-checkbox-disabled');
    container.style.opacity = '0.5';
    container.style.cursor = 'not-allowed';
  }

  // Input
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  
  if (name) input.name = name;
  if (disabled) input.disabled = disabled;
  if (required) input.required = required;
  if (ariaLabel) input.setAttribute('aria-label', ariaLabel);

  // Change handler
  if (onChange) {
    input.addEventListener('change', (e) => {
      onChange(input.checked, e);
    });
  }

  // Label text
  const labelSpan = document.createElement('span');
  labelSpan.className = 'flowsta-checkbox-label';
  
  if (typeof label === 'string') {
    labelSpan.textContent = label;
  } else {
    labelSpan.appendChild(label);
  }

  // Required indicator
  if (required) {
    const asterisk = document.createElement('span');
    asterisk.className = 'flowsta-input-required';
    asterisk.textContent = ' *';
    asterisk.style.color = 'var(--flowsta-color-error, #ef4444)';
    labelSpan.appendChild(asterisk);
  }

  container.appendChild(input);
  container.appendChild(labelSpan);

  return {
    container,
    input,
    label: labelSpan,
  };
}

/**
 * Update checkbox state
 */
export function updateCheckbox(
  checkboxGroup: CheckboxGroup,
  updates: Partial<CheckboxOptions>
): void {
  const { input, container, label } = checkboxGroup;

  if (updates.checked !== undefined) {
    input.checked = updates.checked;
  }

  if (updates.disabled !== undefined) {
    input.disabled = updates.disabled;
    if (updates.disabled) {
      container.classList.add('flowsta-checkbox-disabled');
      container.style.opacity = '0.5';
      container.style.cursor = 'not-allowed';
    } else {
      container.classList.remove('flowsta-checkbox-disabled');
      container.style.opacity = '';
      container.style.cursor = '';
    }
  }

  if (updates.label !== undefined) {
    if (typeof updates.label === 'string') {
      label.textContent = updates.label;
    } else {
      label.innerHTML = '';
      label.appendChild(updates.label);
    }
  }
}

/**
 * Get checkbox value
 */
export function getCheckboxValue(checkboxGroup: CheckboxGroup): boolean {
  return checkboxGroup.input.checked;
}

/**
 * Set checkbox value
 */
export function setCheckboxValue(
  checkboxGroup: CheckboxGroup,
  checked: boolean
): void {
  checkboxGroup.input.checked = checked;
  checkboxGroup.input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Toggle checkbox
 */
export function toggleCheckbox(checkboxGroup: CheckboxGroup): void {
  setCheckboxValue(checkboxGroup, !checkboxGroup.input.checked);
}

