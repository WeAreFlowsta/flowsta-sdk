/**
 * Button Component
 * Reusable button component for all widgets
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonOptions {
  /** Button text or HTML content */
  content: string | HTMLElement;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** CSS classes to add */
  className?: string;
  /** Click handler */
  onClick?: (event: MouseEvent) => void | Promise<void>;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** ARIA label */
  ariaLabel?: string;
}

/**
 * Create a button element
 */
export function createButton(options: ButtonOptions): HTMLButtonElement {
  const {
    content,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    className = '',
    onClick,
    type = 'button',
    ariaLabel,
  } = options;

  const button = document.createElement('button');
  button.type = type;

  // Base classes
  const classes = ['flowsta-button'];

  // Variant class
  classes.push(`flowsta-button-${variant}`);

  // Size class
  if (size !== 'medium') {
    classes.push(`flowsta-button-${size}`);
  }

  // Full width
  if (fullWidth) {
    classes.push('flowsta-button-full-width');
  }

  // Custom classes
  if (className) {
    classes.push(className);
  }

  button.className = classes.join(' ');

  // Content
  if (typeof content === 'string') {
    button.innerHTML = content;
  } else {
    button.appendChild(content);
  }

  // Loading spinner
  if (loading) {
    button.disabled = true;
    const spinner = createSpinner();
    button.innerHTML = '';
    button.appendChild(spinner);
  }

  // Disabled state
  if (disabled) {
    button.disabled = true;
  }

  // ARIA label
  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  }

  // Click handler
  if (onClick) {
    button.addEventListener('click', async (e) => {
      if (button.disabled) return;
      try {
        await onClick(e);
      } catch (error) {
        console.error('[Flowsta Widgets] Button click error:', error);
      }
    });
  }

  return button;
}

/**
 * Update button state
 */
export function updateButton(
  button: HTMLButtonElement,
  updates: Partial<ButtonOptions>
): void {
  if (updates.disabled !== undefined) {
    button.disabled = updates.disabled;
  }

  if (updates.loading !== undefined) {
    if (updates.loading) {
      button.disabled = true;
      const originalContent = button.innerHTML;
      button.dataset.originalContent = originalContent;
      button.innerHTML = '';
      button.appendChild(createSpinner());
    } else {
      button.disabled = updates.disabled || false;
      if (button.dataset.originalContent) {
        button.innerHTML = button.dataset.originalContent;
        delete button.dataset.originalContent;
      }
    }
  }

  if (updates.content !== undefined) {
    if (typeof updates.content === 'string') {
      button.innerHTML = updates.content;
    } else {
      button.innerHTML = '';
      button.appendChild(updates.content);
    }
  }
}

/**
 * Create loading spinner
 */
function createSpinner(): HTMLSpanElement {
  const spinner = document.createElement('span');
  spinner.className = 'flowsta-spinner';
  spinner.setAttribute('role', 'status');
  spinner.setAttribute('aria-label', 'Loading');
  return spinner;
}

/**
 * Button group container
 */
export function createButtonGroup(
  buttons: HTMLButtonElement[],
  options?: {
    alignment?: 'left' | 'center' | 'right';
    spacing?: 'small' | 'medium' | 'large';
  }
): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'flowsta-button-group';

  if (options?.alignment) {
    group.style.justifyContent =
      options.alignment === 'left'
        ? 'flex-start'
        : options.alignment === 'right'
        ? 'flex-end'
        : 'center';
  }

  if (options?.spacing) {
    group.classList.add(`flowsta-gap-${options.spacing === 'small' ? 'sm' : options.spacing === 'large' ? 'lg' : 'md'}`);
  } else {
    group.classList.add('flowsta-gap-md');
  }

  buttons.forEach((button) => group.appendChild(button));

  return group;
}

