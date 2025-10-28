/**
 * Account Recovery Widget
 * Helps users recover their accounts using their recovery phrase
 */

import { FlowstaWidget } from '../FlowstaWidget';
import {
  createButton,
  createInput,
  updateButton,
  updateInput,
  getInputValue,
} from '../components';
import { sanitizeText } from '../utils';
import type {
  AccountRecoveryWidgetOptions,
  WidgetError,
} from '../types';

type RecoveryStep = 'email' | 'phrase' | 'password' | 'success';

/**
 * Account Recovery Widget
 * Complete flow for account recovery using recovery phrase
 */
export class AccountRecoveryWidget extends FlowstaWidget {
  protected widgetType = 'account-recovery';

  private currentStep: RecoveryStep = 'email';
  private userEmail: string = '';
  private recoveryPhraseInputs: any[] = [];
  private newPasswordInput: any = null;
  private confirmPasswordInput: any = null;

  constructor(
    container: HTMLElement,
    private widgetOptions: AccountRecoveryWidgetOptions
  ) {
    super(container, widgetOptions);
  }

  /**
   * Initialize the widget
   */
  async initialize(): Promise<void> {
    try {
      // Validate client ID
      await this.validateClientId();

      // Pre-fill email if provided
      if (this.widgetOptions.email) {
        this.userEmail = this.widgetOptions.email;
        this.currentStep = 'phrase';
      }

      // Render the widget
      this.render();

      // Set state to ready
      this.setState('ready');
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

    // Render current step
    this.renderCurrentStep();
  }

  /**
   * Show the widget
   */
  show(): void {
    super.show();
    this.renderCurrentStep();
  }

  /**
   * Render the current step
   */
  private renderCurrentStep(): void {
    // Clear existing content
    while (this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }

    // Render based on current step
    switch (this.currentStep) {
      case 'email':
        this.renderEmailStep();
        break;
      case 'phrase':
        this.renderPhraseStep();
        break;
      case 'password':
        this.renderPasswordStep();
        break;
      case 'success':
        this.renderSuccessStep();
        break;
    }
  }

  /**
   * Step 1: Email Input
   */
  private renderEmailStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Header
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    const icon = document.createElement('div');
    icon.style.fontSize = '3rem';
    icon.style.marginBottom = '0.5rem';
    icon.textContent = '🔑';
    header.appendChild(icon);

    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Account Recovery';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'flowsta-text-small';
    subtitle.style.color = 'var(--flowsta-color-text-muted, #9ca3af)';
    subtitle.textContent = 'Recover your account using your recovery phrase';
    header.appendChild(subtitle);

    content.appendChild(header);

    // Email input
    const emailInput = createInput({
      type: 'email',
      label: 'Email Address',
      placeholder: 'Enter your email',
      required: true,
      autoFocus: true,
      value: this.userEmail,
    });
    content.appendChild(emailInput.container);

    // Continue button
    const continueButton = createButton({
      content: 'Continue',
      variant: 'primary',
      onClick: async () => {
        const email = sanitizeText(getInputValue(emailInput));
        
        if (!email || !this.validateEmail(email)) {
          updateInput(emailInput, {
            error: 'Please enter a valid email address',
          });
          return;
        }

        this.userEmail = email;
        this.goToStep('phrase');
      },
      fullWidth: true,
    });
    content.appendChild(continueButton);

    // Cancel button
    if (this.widgetOptions.onCancel) {
      const cancelButton = createButton({
        content: 'Cancel',
        variant: 'secondary',
        onClick: () => this.handleCancel(),
        fullWidth: true,
      });
      content.appendChild(cancelButton);
    }

    this.root.appendChild(content);
  }

  /**
   * Step 2: Recovery Phrase Input
   */
  private renderPhraseStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Enter Recovery Phrase';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'flowsta-text-small';
    subtitle.textContent = `Enter your 24-word recovery phrase for ${this.userEmail}`;
    header.appendChild(subtitle);

    content.appendChild(header);

    // Info box
    const infoBox = document.createElement('div');
    infoBox.className = 'flowsta-alert flowsta-alert-info';
    infoBox.innerHTML = '💡 <strong>Tip:</strong> Enter all 24 words in order, separated by spaces.';
    content.appendChild(infoBox);

    // Recovery phrase textarea
    const phraseTextarea = document.createElement('textarea');
    phraseTextarea.className = 'flowsta-input';
    phraseTextarea.placeholder = 'word1 word2 word3 ... word24';
    phraseTextarea.rows = 4;
    phraseTextarea.style.cssText = `
      width: 100%;
      resize: vertical;
      font-family: monospace;
      font-size: 0.875rem;
    `;
    phraseTextarea.autofocus = true;

    const phraseContainer = document.createElement('div');
    phraseContainer.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    const phraseLabel = document.createElement('label');
    phraseLabel.className = 'flowsta-input-label';
    phraseLabel.textContent = 'Recovery Phrase';
    phraseContainer.appendChild(phraseLabel);

    phraseContainer.appendChild(phraseTextarea);

    const phraseError = document.createElement('p');
    phraseError.className = 'flowsta-input-error-text';
    phraseError.style.display = 'none';
    phraseContainer.appendChild(phraseError);

    content.appendChild(phraseContainer);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flowsta-flex flowsta-gap-md';

    const backButton = createButton({
      content: 'Back',
      variant: 'secondary',
      onClick: () => this.goToStep('email'),
    });
    buttonContainer.appendChild(backButton);

    const verifyButton = createButton({
      content: 'Verify Phrase',
      variant: 'primary',
      onClick: async () => {
        const phrase = sanitizeText(phraseTextarea.value).toLowerCase().trim();
        
        if (!phrase) {
          phraseError.textContent = 'Please enter your recovery phrase';
          phraseError.style.display = 'block';
          return;
        }

        const words = phrase.split(/\s+/);
        if (words.length !== 24) {
          phraseError.textContent = `Please enter exactly 24 words (you entered ${words.length})`;
          phraseError.style.display = 'block';
          return;
        }

        await this.verifyRecoveryPhrase(words, verifyButton, phraseError);
      },
    });
    buttonContainer.appendChild(verifyButton);

    content.appendChild(buttonContainer);

    this.root.appendChild(content);
  }

  /**
   * Step 3: New Password
   */
  private renderPasswordStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Set New Password';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'flowsta-text-small';
    subtitle.textContent = 'Choose a strong password for your account';
    header.appendChild(subtitle);

    content.appendChild(header);

    // New password input
    this.newPasswordInput = createInput({
      type: 'password',
      label: 'New Password',
      placeholder: 'Enter new password',
      required: true,
      autoFocus: true,
    });
    content.appendChild(this.newPasswordInput.container);

    // Confirm password input
    this.confirmPasswordInput = createInput({
      type: 'password',
      label: 'Confirm Password',
      placeholder: 'Confirm new password',
      required: true,
    });
    content.appendChild(this.confirmPasswordInput.container);

    // Password requirements
    const requirements = document.createElement('div');
    requirements.className = 'flowsta-text-small';
    requirements.style.cssText = `
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 0.5rem;
      padding: 1rem;
    `;
    requirements.innerHTML = `
      <strong>Password requirements:</strong>
      <ul style="margin: 0.5rem 0 0 1.5rem; color: var(--flowsta-color-text-muted, #9ca3af);">
        <li>At least 8 characters</li>
        <li>One uppercase letter</li>
        <li>One lowercase letter</li>
        <li>One number</li>
      </ul>
    `;
    content.appendChild(requirements);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flowsta-flex flowsta-gap-md';

    const backButton = createButton({
      content: 'Back',
      variant: 'secondary',
      onClick: () => this.goToStep('phrase'),
    });
    buttonContainer.appendChild(backButton);

    const resetButton = createButton({
      content: 'Reset Password',
      variant: 'primary',
      onClick: () => this.handlePasswordReset(),
    });
    buttonContainer.appendChild(resetButton);

    content.appendChild(buttonContainer);

    this.root.appendChild(content);
  }

  /**
   * Step 4: Success
   */
  private renderSuccessStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';
    content.style.textAlign = 'center';

    // Success icon
    const icon = document.createElement('div');
    icon.style.fontSize = '4rem';
    icon.textContent = '✅';
    content.appendChild(icon);

    // Title
    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Recovery Successful!';
    content.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text';
    description.textContent = 'Your password has been reset. You can now log in with your new password.';
    content.appendChild(description);

    // Success message
    const successBox = document.createElement('div');
    successBox.className = 'flowsta-alert flowsta-alert-success';
    successBox.textContent = '🎉 Account recovered! Please log in with your new password.';
    content.appendChild(successBox);

    // Done button
    const doneButton = createButton({
      content: 'Continue to Login',
      variant: 'primary',
      onClick: () => this.handleComplete(),
      fullWidth: true,
    });
    content.appendChild(doneButton);

    this.root.appendChild(content);
  }

  /**
   * Navigate to a specific step
   */
  private goToStep(step: RecoveryStep): void {
    this.currentStep = step;
    this.renderCurrentStep();
  }

  /**
   * Verify recovery phrase with API
   */
  private async verifyRecoveryPhrase(
    words: string[],
    button: HTMLButtonElement,
    errorElement: HTMLParagraphElement
  ): Promise<void> {
    try {
      this.setState('loading');
      updateButton(button, { loading: true });
      errorElement.style.display = 'none';

      // Call API to verify recovery phrase
      await this.apiRequest('/auth/verify-recovery-for-reset', {
        method: 'POST',
        body: JSON.stringify({
          email: this.userEmail,
          recoveryPhrase: words.join(' '),
        }),
      });

      this.setState('ready');
      this.goToStep('password');
    } catch (error) {
      this.setState('error');
      updateButton(button, { loading: false });
      errorElement.textContent = 'Invalid recovery phrase. Please check and try again.';
      errorElement.style.display = 'block';

      if (this.widgetOptions.onError) {
        this.widgetOptions.onError(error as WidgetError);
      }
    }
  }

  /**
   * Handle password reset
   */
  private async handlePasswordReset(): Promise<void> {
    const newPassword = getInputValue(this.newPasswordInput);
    const confirmPassword = getInputValue(this.confirmPasswordInput);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      updateInput(this.confirmPasswordInput, {
        error: 'Passwords do not match',
      });
      return;
    }

    // Validate password strength
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      updateInput(this.newPasswordInput, {
        error: validation.errors[0],
      });
      return;
    }

    try {
      this.setState('loading');

      // Call API to reset password
      await this.apiRequest('/auth/reset-password-with-phrase', {
        method: 'POST',
        body: JSON.stringify({
          email: this.userEmail,
          newPassword,
        }),
      });

      this.setState('success');
      this.goToStep('success');
    } catch (error) {
      this.setState('error');
      this.handleError(error as Error);

      if (this.widgetOptions.onError) {
        this.widgetOptions.onError(error as WidgetError);
      }
    }
  }

  /**
   * Handle completion
   */
  private async handleComplete(): Promise<void> {
    if (this.widgetOptions.onRecoveryComplete) {
      await this.widgetOptions.onRecoveryComplete(true);
    }
    this.hide();
  }

  /**
   * Handle cancel
   */
  private async handleCancel(): Promise<void> {
    if (this.widgetOptions.onCancel) {
      await this.widgetOptions.onCancel();
    }
    this.hide();
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { valid: boolean; errors: string[] } {
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
}

