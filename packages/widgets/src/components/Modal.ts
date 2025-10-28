/**
 * Modal Component
 * Reusable modal component for all widgets
 */

export interface ModalOptions {
  /** Modal title */
  title?: string;
  /** Modal content */
  content?: string | HTMLElement;
  /** Modal footer (buttons, etc.) */
  footer?: HTMLElement;
  /** Show close button */
  showCloseButton?: boolean;
  /** Allow closing by clicking backdrop */
  closeOnBackdropClick?: boolean;
  /** Allow closing with Escape key */
  closeOnEscape?: boolean;
  /** CSS classes */
  className?: string;
  /** Close handler */
  onClose?: () => void | Promise<void>;
  /** Max width */
  maxWidth?: string;
}

export interface Modal {
  backdrop: HTMLDivElement;
  modal: HTMLDivElement;
  header?: HTMLDivElement;
  title?: HTMLHeadingElement;
  closeButton?: HTMLButtonElement;
  body: HTMLDivElement;
  footer?: HTMLDivElement;
}

/**
 * Create a modal element
 */
export function createModal(options: ModalOptions = {}): Modal {
  const {
    title,
    content,
    footer,
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    className = '',
    onClose,
    maxWidth = '42rem',
  } = options;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'flowsta-modal-backdrop';
  backdrop.style.display = 'none'; // Hidden by default

  // Modal container
  const modal = document.createElement('div');
  modal.className = `flowsta-modal ${className}`;
  modal.style.maxWidth = maxWidth;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  let headerElement: HTMLDivElement | undefined;
  let titleElement: HTMLHeadingElement | undefined;
  let closeButton: HTMLButtonElement | undefined;

  // Header
  if (title || showCloseButton) {
    headerElement = document.createElement('div');
    headerElement.className = 'flowsta-modal-header';

    if (title) {
      titleElement = document.createElement('h2');
      titleElement.className = 'flowsta-modal-title';
      titleElement.textContent = title;
      titleElement.id = 'flowsta-modal-title';
      headerElement.appendChild(titleElement);
      modal.setAttribute('aria-labelledby', 'flowsta-modal-title');
    }

    if (showCloseButton) {
      closeButton = document.createElement('button');
      closeButton.className = 'flowsta-modal-close';
      closeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      closeButton.setAttribute('aria-label', 'Close modal');
      closeButton.addEventListener('click', async () => {
        if (onClose) {
          await onClose();
        }
        hideModal({ backdrop, modal, header: headerElement, body, footer: footerElement, closeButton, title: titleElement });
      });
      headerElement.appendChild(closeButton);
    }

    modal.appendChild(headerElement);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'flowsta-modal-body';

  if (content) {
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
  }

  modal.appendChild(body);

  // Footer
  let footerElement: HTMLDivElement | undefined;
  if (footer) {
    footerElement = document.createElement('div');
    footerElement.className = 'flowsta-modal-footer';
    footerElement.appendChild(footer);
    modal.appendChild(footerElement);
  }

  // Close on backdrop click
  if (closeOnBackdropClick) {
    backdrop.addEventListener('click', async (e) => {
      if (e.target === backdrop) {
        if (onClose) {
          await onClose();
        }
        hideModal({ backdrop, modal, header: headerElement, body, footer: footerElement, closeButton, title: titleElement });
      }
    });
  }

  // Close on Escape key
  if (closeOnEscape) {
    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && backdrop.style.display !== 'none') {
        if (onClose) {
          await onClose();
        }
        hideModal({ backdrop, modal, header: headerElement, body, footer: footerElement, closeButton, title: titleElement });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  backdrop.appendChild(modal);

  return {
    backdrop,
    modal,
    header: headerElement,
    title: titleElement,
    closeButton,
    body,
    footer: footerElement,
  };
}

/**
 * Show modal
 */
export function showModal(modal: Modal): void {
  modal.backdrop.style.display = 'flex';
  
  // Focus trap: focus first focusable element
  setTimeout(() => {
    const focusable = modal.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }
  }, 100);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Hide modal
 */
export function hideModal(modal: Modal): void {
  modal.backdrop.style.display = 'none';
  
  // Restore body scroll
  document.body.style.overflow = '';
}

/**
 * Update modal content
 */
export function updateModal(modal: Modal, updates: Partial<ModalOptions>): void {
  if (updates.title !== undefined && modal.title) {
    modal.title.textContent = updates.title;
  }

  if (updates.content !== undefined) {
    modal.body.innerHTML = '';
    if (typeof updates.content === 'string') {
      modal.body.innerHTML = updates.content;
    } else {
      modal.body.appendChild(updates.content);
    }
  }

  if (updates.footer !== undefined && modal.footer) {
    modal.footer.innerHTML = '';
    if (updates.footer) {
      modal.footer.appendChild(updates.footer);
    }
  }
}

/**
 * Destroy modal and remove from DOM
 */
export function destroyModal(modal: Modal): void {
  hideModal(modal);
  modal.backdrop.remove();
}

/**
 * Clear modal body
 */
export function clearModalBody(modal: Modal): void {
  modal.body.innerHTML = '';
}

/**
 * Append content to modal body
 */
export function appendToModal(modal: Modal, content: string | HTMLElement): void {
  if (typeof content === 'string') {
    const div = document.createElement('div');
    div.innerHTML = content;
    modal.body.appendChild(div);
  } else {
    modal.body.appendChild(content);
  }
}

/**
 * Create a confirmation modal
 */
export function createConfirmModal(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  onCancel?: () => void | Promise<void>
): Modal {
  const body = document.createElement('div');
  body.className = 'flowsta-text';
  body.textContent = message;

  const confirmButton = document.createElement('button');
  confirmButton.className = 'flowsta-button flowsta-button-primary';
  confirmButton.textContent = 'Confirm';
  confirmButton.addEventListener('click', async () => {
    await onConfirm();
    hideModal(modal);
  });

  const cancelButton = document.createElement('button');
  cancelButton.className = 'flowsta-button flowsta-button-secondary';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', async () => {
    if (onCancel) {
      await onCancel();
    }
    hideModal(modal);
  });

  const footer = document.createElement('div');
  footer.appendChild(cancelButton);
  footer.appendChild(confirmButton);

  const modal = createModal({
    title,
    content: body,
    footer,
    closeOnBackdropClick: false,
    closeOnEscape: true,
  });

  return modal;
}

/**
 * Create an alert modal
 */
export function createAlertModal(
  title: string,
  message: string,
  type: 'success' | 'warning' | 'error' = 'success'
): Modal {
  const body = document.createElement('div');
  body.className = `flowsta-alert flowsta-alert-${type}`;
  body.textContent = message;

  const okButton = document.createElement('button');
  okButton.className = 'flowsta-button flowsta-button-primary';
  okButton.textContent = 'OK';
  okButton.addEventListener('click', () => {
    hideModal(modal);
  });

  const footer = document.createElement('div');
  footer.appendChild(okButton);

  const modal = createModal({
    title,
    content: body,
    footer,
  });

  return modal;
}

