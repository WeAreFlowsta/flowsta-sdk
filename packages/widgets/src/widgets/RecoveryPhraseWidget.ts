/**
 * Recovery Phrase Widget
 * Guides users through setting up and verifying their 24-word recovery phrase
 */

import { FlowstaWidget } from '../FlowstaWidget';
import {
  createModal,
  showModal,
  hideModal,
  updateModal,
  createButton,
  createInput,
  createCheckbox,
  updateButton,
  updateInput,
  getInputValue,
} from '../components';
import { sanitizeText } from '../utils';
import type {
  RecoveryPhraseWidgetOptions,
  WidgetError,
  RecoveryPhraseSetupResponse,
} from '../types';
import { WidgetErrorCodes } from '../types';

type RecoveryPhraseStep = 'intro' | 'password' | 'display' | 'verify' | 'success';

/**
 * Recovery Phrase Widget
 * Complete flow for setting up and verifying recovery phrase
 */
export class RecoveryPhraseWidget extends FlowstaWidget {
  protected widgetType = 'recovery-phrase';

  private currentStep: RecoveryPhraseStep = 'intro';
  private recoveryPhrase: string = '';
  private verificationIndices: number[] = [];
  private passwordInput: any = null;
  private verificationInputs: any[] = [];
  private confirmationCheckbox: any = null;

  constructor(
    container: HTMLElement,
    private widgetOptions: RecoveryPhraseWidgetOptions
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

      // Render the widget
      this.render();

      // Set state to ready
      this.setState('ready');

      // Auto-show if enabled
      if (this.widgetOptions.autoShow) {
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
      case 'intro':
        this.renderIntroStep();
        break;
      case 'password':
        this.renderPasswordStep();
        break;
      case 'display':
        this.renderDisplayStep();
        break;
      case 'verify':
        this.renderVerifyStep();
        break;
      case 'success':
        this.renderSuccessStep();
        break;
    }
  }

  /**
   * Step 1: Introduction
   */
  private renderIntroStep(): void {
    const customMessages = this.widgetOptions.customMessages;

    // Create modal content
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Title
    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = customMessages?.title || 'Secure Your Account';
    content.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text';
    description.textContent = customMessages?.description || 
      'Your Flowsta account uses advanced encryption. This means YOU control your data, not us. ' +
      'To keep your account safe, we\'ll give you a recovery phrase - think of it like a master key.';
    content.appendChild(description);

    // Why section
    const whySection = document.createElement('div');
    whySection.className = 'flowsta-card';
    whySection.style.background = 'rgba(99, 102, 241, 0.1)';
    whySection.style.border = '1px solid rgba(99, 102, 241, 0.3)';

    const whyTitle = document.createElement('p');
    whyTitle.className = 'flowsta-text';
    whyTitle.style.fontWeight = '600';
    whyTitle.style.marginBottom = 'var(--flowsta-spacing-small, 0.5rem)';
    whyTitle.textContent = 'Why is this critical?';
    whySection.appendChild(whyTitle);

    const whyText = document.createElement('p');
    whyText.className = 'flowsta-text-small';
    whyText.innerHTML = '<strong>Without a recovery phrase</strong>, if you forget your password or lose access to your email, your account is <strong>permanently lost</strong>. We can\'t reset your password because we don\'t have access to your encrypted data.';
    whySection.appendChild(whyText);

    content.appendChild(whySection);

    // What you'll do section
    const stepsSection = document.createElement('div');
    stepsSection.className = 'flowsta-text-small';
    
    const stepsTitle = document.createElement('p');
    stepsTitle.style.fontWeight = '600';
    stepsTitle.style.marginBottom = 'var(--flowsta-spacing-small, 0.5rem)';
    stepsTitle.textContent = 'What you\'ll do:';
    stepsSection.appendChild(stepsTitle);

    const stepsList = document.createElement('ol');
    stepsList.style.marginLeft = '1.5rem';
    stepsList.style.color = 'var(--flowsta-color-text-muted, #9ca3af)';
    
    const steps = [
      'Enter your password to confirm it\'s you',
      'Write down your 24-word recovery phrase',
      'Verify you\'ve saved it correctly',
      'Done! Your account is secure'
    ];

    steps.forEach(step => {
      const li = document.createElement('li');
      li.style.marginBottom = 'var(--flowsta-spacing-small, 0.5rem)';
      li.textContent = step;
      stepsList.appendChild(li);
    });

    stepsSection.appendChild(stepsList);
    content.appendChild(stepsSection);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flowsta-flex flowsta-gap-md';
    buttonContainer.style.marginTop = 'var(--flowsta-spacing-medium, 1rem)';

    if (this.widgetOptions.allowDismiss) {
      const dismissButton = createButton({
        content: 'Set Up Later',
        variant: 'secondary',
        onClick: () => this.handleDismiss(),
      });
      buttonContainer.appendChild(dismissButton);
    }

    const continueButton = createButton({
      content: 'Continue',
      variant: 'primary',
      onClick: () => this.goToStep('password'),
    });
    buttonContainer.appendChild(continueButton);

    content.appendChild(buttonContainer);

    // Powered by footer
    if (this.widgetOptions.branding?.showPoweredBy !== false) {
      const footer = document.createElement('div');
      footer.className = 'flowsta-powered-by';
      footer.innerHTML = 'Secured by <a href="https://flowsta.com" target="_blank">Flowsta Auth</a>';
      content.appendChild(footer);
    }

    // Add to root
    this.root.appendChild(content);
  }

  /**
   * Step 2: Password Confirmation
   */
  private renderPasswordStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Title
    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Confirm Your Password';
    content.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text-small';
    description.textContent = 'For security, please enter your password to generate your recovery phrase.';
    content.appendChild(description);

    // Password input
    this.passwordInput = createInput({
      type: 'password',
      label: 'Password',
      placeholder: 'Enter your password',
      required: true,
      autoFocus: true,
    });
    content.appendChild(this.passwordInput.container);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flowsta-flex flowsta-gap-md';

    const backButton = createButton({
      content: 'Back',
      variant: 'secondary',
      onClick: () => this.goToStep('intro'),
    });
    buttonContainer.appendChild(backButton);

    const generateButton = createButton({
      content: 'Generate Phrase',
      variant: 'primary',
      onClick: () => this.handleGeneratePhrase(),
    });
    buttonContainer.appendChild(generateButton);

    content.appendChild(buttonContainer);

    this.root.appendChild(content);
  }

  /**
   * Step 3: Display Recovery Phrase
   */
  private renderDisplayStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Title
    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Your Recovery Phrase';
    content.appendChild(title);

    // Warning
    const warning = document.createElement('div');
    warning.className = 'flowsta-alert flowsta-alert-warning';
    warning.innerHTML = '<strong>⚠️ Write this down!</strong> Store it somewhere safe. Anyone with this phrase can access your account.';
    content.appendChild(warning);

    // Recovery phrase display
    const phraseContainer = document.createElement('div');
    phraseContainer.className = 'flowsta-card';
    phraseContainer.style.background = 'var(--flowsta-color-background, #1f2937)';
    phraseContainer.style.border = '2px solid var(--flowsta-color-primary, #6366f1)';

    const words = this.recoveryPhrase.split(' ');
    const wordGrid = document.createElement('div');
    wordGrid.style.display = 'grid';
    wordGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
    wordGrid.style.gap = 'var(--flowsta-spacing-small, 0.5rem)';

    words.forEach((word, index) => {
      const wordItem = document.createElement('div');
      wordItem.style.display = 'flex';
      wordItem.style.alignItems = 'center';
      wordItem.style.padding = 'var(--flowsta-spacing-small, 0.5rem)';
      wordItem.style.background = 'rgba(99, 102, 241, 0.1)';
      wordItem.style.borderRadius = 'var(--flowsta-border-radius, 0.5rem)';
      
      const number = document.createElement('span');
      number.style.color = 'var(--flowsta-color-text-muted, #9ca3af)';
      number.style.fontSize = 'var(--flowsta-font-size-small, 0.875rem)';
      number.style.marginRight = 'var(--flowsta-spacing-small, 0.5rem)';
      number.textContent = `${index + 1}.`;
      
      const wordSpan = document.createElement('span');
      wordSpan.style.fontWeight = '600';
      wordSpan.textContent = word;
      
      wordItem.appendChild(number);
      wordItem.appendChild(wordSpan);
      wordGrid.appendChild(wordItem);
    });

    phraseContainer.appendChild(wordGrid);
    content.appendChild(phraseContainer);

    // Copy/Download buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'flowsta-flex flowsta-gap-md';

    const copyButton = createButton({
      content: '📋 Copy to Clipboard',
      variant: 'secondary',
      onClick: () => this.copyToClipboard(),
    });
    actionButtons.appendChild(copyButton);

    const downloadButton = createButton({
      content: '💾 Download',
      variant: 'secondary',
      onClick: () => this.downloadPhrase(),
    });
    actionButtons.appendChild(downloadButton);

    content.appendChild(actionButtons);

    // Confirmation checkbox
    this.confirmationCheckbox = createCheckbox({
      label: 'I\'ve saved my recovery phrase in a safe place',
      required: true,
    });
    content.appendChild(this.confirmationCheckbox.container);

    // Continue button
    const continueButton = createButton({
      content: 'Continue to Verification',
      variant: 'primary',
      onClick: () => this.goToVerification(),
      fullWidth: true,
    });
    content.appendChild(continueButton);

    this.root.appendChild(content);
  }

  /**
   * Step 4: Verification
   */
  private renderVerifyStep(): void {
    const content = document.createElement('div');
    content.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Title
    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Verify Your Recovery Phrase';
    content.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text-small';
    description.textContent = 'To make sure you\'ve saved it correctly, please enter these words from your recovery phrase:';
    content.appendChild(description);

    // Verification inputs
    this.verificationInputs = [];
    const words = this.recoveryPhrase.split(' ');

    this.verificationIndices.forEach((index, i) => {
      const input = createInput({
        type: 'text',
        label: `Word #${index + 1}`,
        placeholder: `Enter word ${index + 1}`,
        required: true,
        autoFocus: i === 0,
      });
      this.verificationInputs.push(input);
      content.appendChild(input.container);
    });

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flowsta-flex flowsta-gap-md';

    const backButton = createButton({
      content: 'Back',
      variant: 'secondary',
      onClick: () => this.goToStep('display'),
    });
    buttonContainer.appendChild(backButton);

    const verifyButton = createButton({
      content: 'Verify',
      variant: 'primary',
      onClick: () => this.handleVerify(),
    });
    buttonContainer.appendChild(verifyButton);

    content.appendChild(buttonContainer);

    this.root.appendChild(content);
  }

  /**
   * Step 5: Success
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
    title.textContent = this.widgetOptions.customMessages?.confirmationMessage || 
      'Recovery Phrase Verified!';
    content.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text';
    description.textContent = 'Your account is now secure. You can use your recovery phrase to reset your password if you ever forget it.';
    content.appendChild(description);

    // Success message
    const successBox = document.createElement('div');
    successBox.className = 'flowsta-alert flowsta-alert-success';
    successBox.textContent = '🎉 You\'re all set! Your recovery phrase has been verified and saved securely.';
    content.appendChild(successBox);

    // Done button
    const doneButton = createButton({
      content: 'Done',
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
  private goToStep(step: RecoveryPhraseStep): void {
    this.currentStep = step;
    this.renderCurrentStep();
  }

  /**
   * Handle phrase generation
   */
  private async handleGeneratePhrase(): Promise<void> {
    try {
      const password = getInputValue(this.passwordInput);

      if (!password) {
        updateInput(this.passwordInput, {
          error: 'Password is required',
        });
        return;
      }

      this.setState('loading');

      // Call API to generate recovery phrase
      const response = await this.apiRequest<RecoveryPhraseSetupResponse>(
        '/auth/setup-recovery-phrase',
        {
          method: 'POST',
          body: JSON.stringify({ password }),
        }
      );

      this.recoveryPhrase = response.recoveryPhrase;
      this.verificationIndices = response.verificationIndices;

      this.setState('ready');
      this.goToStep('display');
    } catch (error) {
      this.setState('error');
      updateInput(this.passwordInput, {
        error: 'Failed to generate recovery phrase. Please check your password.',
      });
      
      if (this.widgetOptions.onError) {
        this.widgetOptions.onError(error as WidgetError);
      }
    }
  }

  /**
   * Handle verification
   */
  private async handleVerify(): Promise<void> {
    try {
      const words = this.recoveryPhrase.split(' ');
      const userWords = this.verificationInputs.map(input => 
        sanitizeText(getInputValue(input)).toLowerCase().trim()
      );

      // Check if words match
      let allCorrect = true;
      this.verificationIndices.forEach((index, i) => {
        const correctWord = words[index].toLowerCase();
        const userWord = userWords[i];

        if (correctWord !== userWord) {
          allCorrect = false;
          updateInput(this.verificationInputs[i], {
            error: 'Incorrect word',
          });
        }
      });

      if (!allCorrect) {
        return;
      }

      this.setState('loading');

      // Call API to mark as verified
      await this.apiRequest('/auth/verify-recovery-phrase', {
        method: 'POST',
        body: JSON.stringify({
          verificationWords: userWords,
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
    if (this.widgetOptions.onComplete) {
      await this.widgetOptions.onComplete(true);
    }
    this.hide();
  }

  /**
   * Handle dismiss
   */
  private async handleDismiss(): Promise<void> {
    if (this.widgetOptions.onDismiss) {
      await this.widgetOptions.onDismiss();
    }
    this.hide();
  }

  /**
   * Go to verification step
   */
  private goToVerification(): void {
    if (!this.confirmationCheckbox.input.checked) {
      alert('Please confirm that you\'ve saved your recovery phrase');
      return;
    }
    this.goToStep('verify');
  }

  /**
   * Copy phrase to clipboard
   */
  private async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.recoveryPhrase);
      alert('✅ Recovery phrase copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('❌ Failed to copy. Please copy manually.');
    }
  }

  /**
   * Download phrase as text file
   */
  private downloadPhrase(): void {
    const blob = new Blob([this.recoveryPhrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowsta-recovery-phrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

