/**
 * Email Verification Widget
 * Prompts users to verify their email address with multiple display modes
 */

import { FlowstaWidget } from '../FlowstaWidget';
import {
  createButton,
  updateButton,
} from '../components';
import type {
  EmailVerificationWidgetOptions,
  WidgetError,
  EmailVerificationStatusResponse,
} from '../types';
import { WidgetErrorCodes } from '../types';

/**
 * Email Verification Widget
 * Flexible widget for prompting email verification in banner, modal, or inline mode
 */
export class EmailVerificationWidget extends FlowstaWidget {
  protected widgetType = 'email-verification';

  private mode: 'banner' | 'modal' | 'inline';
  private emailVerified: boolean = false;
  private resendCooldown: number = 0;
  private resendTimer: NodeJS.Timeout | null = null;
  private verificationCheckInterval: NodeJS.Timeout | null = null;
  private resendButton: HTMLButtonElement | null = null;

  constructor(
    container: HTMLElement,
    private widgetOptions: EmailVerificationWidgetOptions
  ) {
    super(container, widgetOptions);
    this.mode = widgetOptions.mode || 'banner';
  }

  /**
   * Initialize the widget
   */
  async initialize(): Promise<void> {
    try {
      // Validate client ID
      await this.validateClientId();

      // Check current verification status
      await this.checkVerificationStatus();

      // If already verified, don't show widget
      if (this.emailVerified) {
        this.setState('success');
        return;
      }

      // Render the widget
      this.render();

      // Set state to ready
      this.setState('ready');

      // Start auto-verification check if enabled
      if (this.widgetOptions.autoCheckInterval !== false) {
        this.startVerificationPolling();
      }

      // Auto-show if not inline mode
      if (this.mode !== 'inline') {
        this.show();
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Render the widget
   */
  protected render(): void {
    // Inject theme
    this.injectTheme();

    // Render based on mode
    switch (this.mode) {
      case 'banner':
        this.renderBanner();
        break;
      case 'modal':
        this.renderModal();
        break;
      case 'inline':
        this.renderInline();
        break;
    }
  }

  /**
   * Render banner mode
   */
  private renderBanner(): void {
    const banner = document.createElement('div');
    banner.className = 'flowsta-banner flowsta-banner-warning';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      animation: slideDown 0.3s ease;
    `;

    // Content container
    const content = document.createElement('div');
    content.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 1rem;';

    // Icon
    const icon = document.createElement('span');
    icon.style.fontSize = '1.5rem';
    icon.textContent = '✉️';
    content.appendChild(icon);

    // Text
    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 600; margin-bottom: 0.25rem;';
    title.textContent = this.widgetOptions.customMessages?.title || 'Verify Your Email';
    textContainer.appendChild(title);

    const description = document.createElement('div');
    description.style.cssText = 'font-size: 0.875rem; opacity: 0.9;';
    description.textContent = this.widgetOptions.customMessages?.description || 
      'Please check your inbox and verify your email address.';
    textContainer.appendChild(description);

    content.appendChild(textContainer);
    banner.appendChild(content);

    // Actions container
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';

    // Resend button
    this.resendButton = createButton({
      content: 'Resend Email',
      variant: 'secondary',
      onClick: () => this.handleResendEmail(),
    });
    this.resendButton.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      white-space: nowrap;
    `;
    actions.appendChild(this.resendButton);

    // Close button (if dismissible)
    if (this.widgetOptions.dismissible !== false) {
      const closeButton = document.createElement('button');
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        opacity: 0.7;
        transition: opacity 0.2s;
      `;
      closeButton.innerHTML = '×';
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.opacity = '1';
      });
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.opacity = '0.7';
      });
      closeButton.addEventListener('click', () => this.handleDismiss());
      actions.appendChild(closeButton);
    }

    banner.appendChild(actions);
    this.root.appendChild(banner);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    this.root.appendChild(style);
  }

  /**
   * Render modal mode
   */
  private renderModal(): void {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'flowsta-modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    `;

    // Modal
    const modal = document.createElement('div');
    modal.className = 'flowsta-modal';
    modal.style.cssText = `
      background: var(--flowsta-color-background, #1f2937);
      border-radius: var(--flowsta-border-radius, 0.5rem);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      max-width: 28rem;
      width: 100%;
      padding: 2rem;
      text-align: center;
      animation: slideUp 0.3s ease;
    `;

    // Icon
    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 4rem; margin-bottom: 1rem;';
    icon.textContent = '📧';
    modal.appendChild(icon);

    // Title
    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.style.marginBottom = '1rem';
    title.textContent = this.widgetOptions.customMessages?.title || 'Verify Your Email';
    modal.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text';
    description.style.marginBottom = '1.5rem';
    description.textContent = this.widgetOptions.customMessages?.description || 
      'We\'ve sent a verification link to your email address. Please check your inbox and click the link to verify your account.';
    modal.appendChild(description);

    // Info box
    const infoBox = document.createElement('div');
    infoBox.style.cssText = `
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
      text-align: left;
    `;

    const infoTitle = document.createElement('p');
    infoTitle.style.cssText = 'font-weight: 600; margin-bottom: 0.5rem; color: var(--flowsta-color-text, #f9fafb);';
    infoTitle.textContent = 'Didn\'t receive the email?';
    infoBox.appendChild(infoTitle);

    const infoText = document.createElement('p');
    infoText.style.cssText = 'font-size: 0.875rem; color: var(--flowsta-color-text-muted, #9ca3af);';
    infoText.textContent = 'Check your spam folder, or click the button below to resend the verification email.';
    infoBox.appendChild(infoText);

    modal.appendChild(infoBox);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

    // Resend button
    this.resendButton = createButton({
      content: 'Resend Verification Email',
      variant: 'primary',
      onClick: () => this.handleResendEmail(),
      fullWidth: true,
    });
    buttonContainer.appendChild(this.resendButton);

    // Dismiss button (if dismissible)
    if (this.widgetOptions.dismissible !== false) {
      const dismissButton = createButton({
        content: 'I\'ll Do This Later',
        variant: 'secondary',
        onClick: () => this.handleDismiss(),
        fullWidth: true,
      });
      buttonContainer.appendChild(dismissButton);
    }

    modal.appendChild(buttonContainer);

    backdrop.appendChild(modal);
    this.root.appendChild(backdrop);

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          transform: translateY(2rem);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    this.root.appendChild(style);
  }

  /**
   * Render inline mode
   */
  private renderInline(): void {
    const container = document.createElement('div');
    container.className = 'flowsta-card';
    container.style.cssText = `
      background: var(--flowsta-color-background, #1f2937);
      border: 1px solid var(--flowsta-color-border, #374151);
      border-radius: var(--flowsta-border-radius, 0.5rem);
      padding: 1.5rem;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;';

    const icon = document.createElement('span');
    icon.style.fontSize = '2rem';
    icon.textContent = '✉️';
    header.appendChild(icon);

    const headerText = document.createElement('div');
    headerText.style.flex = '1';

    const title = document.createElement('h3');
    title.className = 'flowsta-heading-2';
    title.textContent = this.widgetOptions.customMessages?.title || 'Email Verification';
    headerText.appendChild(title);

    header.appendChild(headerText);
    container.appendChild(header);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text';
    description.style.marginBottom = '1rem';
    description.textContent = this.widgetOptions.customMessages?.description || 
      'Please verify your email address to access all features.';
    container.appendChild(description);

    // Status indicator
    const status = document.createElement('div');
    status.style.cssText = `
      background: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #f59e0b;
      padding: 0.75rem;
      margin-bottom: 1rem;
      border-radius: 0.25rem;
    `;
    status.innerHTML = '<strong>⚠️ Pending:</strong> Check your inbox for the verification email.';
    container.appendChild(status);

    // Resend button
    this.resendButton = createButton({
      content: 'Resend Verification Email',
      variant: 'primary',
      onClick: () => this.handleResendEmail(),
    });
    container.appendChild(this.resendButton);

    this.root.appendChild(container);
  }

  /**
   * Check verification status
   */
  private async checkVerificationStatus(): Promise<void> {
    try {
      const response = await this.apiRequest<EmailVerificationStatusResponse>(
        '/auth/verify-email-status',
        { method: 'GET' }
      );

      this.emailVerified = response.emailVerified;

      if (this.emailVerified) {
        this.handleVerified();
      }
    } catch (error) {
      // If API call fails, assume not verified
      this.emailVerified = false;
    }
  }

  /**
   * Start polling for verification status
   */
  private startVerificationPolling(): void {
    // Check every 5 seconds
    this.verificationCheckInterval = setInterval(async () => {
      await this.checkVerificationStatus();
    }, 5000);
  }

  /**
   * Stop polling
   */
  private stopVerificationPolling(): void {
    if (this.verificationCheckInterval) {
      clearInterval(this.verificationCheckInterval);
      this.verificationCheckInterval = null;
    }
  }

  /**
   * Handle resend email
   */
  private async handleResendEmail(): Promise<void> {
    // Check if still in cooldown
    if (this.resendCooldown > 0) {
      return;
    }

    try {
      this.setState('loading');

      if (this.resendButton) {
        updateButton(this.resendButton, { loading: true });
      }

      // Call API to resend
      await this.apiRequest('/auth/resend-verification', {
        method: 'POST',
      });

      // Start cooldown
      const cooldownSeconds = this.widgetOptions.resendCooldown || 60;
      this.startResendCooldown(cooldownSeconds);

      // Show success feedback
      this.showResendSuccess();

      // Call callback
      if (this.widgetOptions.onResend) {
        await this.widgetOptions.onResend();
      }

      this.setState('ready');
    } catch (error) {
      this.setState('error');
      this.handleError(error as Error);

      if (this.widgetOptions.onError) {
        this.widgetOptions.onError(error as WidgetError);
      }

      // Reset button
      if (this.resendButton) {
        updateButton(this.resendButton, { loading: false });
      }
    }
  }

  /**
   * Start resend cooldown timer
   */
  private startResendCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    this.updateResendButton();

    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      this.updateResendButton();

      if (this.resendCooldown <= 0) {
        this.stopResendCooldown();
      }
    }, 1000);
  }

  /**
   * Stop resend cooldown timer
   */
  private stopResendCooldown(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
    this.resendCooldown = 0;
    this.updateResendButton();
  }

  /**
   * Update resend button text and state
   */
  private updateResendButton(): void {
    if (!this.resendButton) return;

    if (this.resendCooldown > 0) {
      updateButton(this.resendButton, {
        content: `Resend in ${this.resendCooldown}s`,
        disabled: true,
      });
    } else {
      updateButton(this.resendButton, {
        content: this.mode === 'banner' ? 'Resend Email' : 'Resend Verification Email',
        disabled: false,
      });
    }
  }

  /**
   * Show resend success feedback
   */
  private showResendSuccess(): void {
    // Create temporary success message
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideDown 0.3s ease;
    `;
    message.textContent = '✅ Verification email sent! Check your inbox.';

    document.body.appendChild(message);

    // Remove after 3 seconds
    setTimeout(() => {
      message.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  /**
   * Handle verified
   */
  private async handleVerified(): void {
    this.stopVerificationPolling();
    this.setState('success');

    if (this.widgetOptions.onVerified) {
      await this.widgetOptions.onVerified();
    }

    // Auto-hide after showing success
    setTimeout(() => {
      this.hide();
    }, 2000);
  }

  /**
   * Handle dismiss
   */
  private async handleDismiss(): void {
    this.stopVerificationPolling();

    if (this.widgetOptions.onDismiss) {
      await this.widgetOptions.onDismiss();
    }

    this.hide();
  }

  /**
   * Destroy widget and clean up
   */
  destroy(): void {
    this.stopVerificationPolling();
    this.stopResendCooldown();
    super.destroy();
  }
}

