/**
 * Security Dashboard Widget
 * Displays account security status and provides quick actions
 */

import { FlowstaWidget } from '../FlowstaWidget';
import { createButton, createCard } from '../components';
import type {
  SecurityDashboardWidgetOptions,
  WidgetError,
  RecoveryPhraseStatusResponse,
  EmailVerificationStatusResponse,
} from '../types';

interface SecurityStatus {
  recoveryPhrase: {
    active: boolean;
    verified: boolean;
    setupDate: string | null;
  };
  emailVerified: boolean;
  email: string;
  lastPasswordChange: string | null;
}

/**
 * Security Dashboard Widget
 * Complete security status overview with quick actions
 */
export class SecurityDashboardWidget extends FlowstaWidget {
  protected widgetType = 'security-dashboard';

  private securityStatus: SecurityStatus | null = null;

  constructor(
    container: HTMLElement,
    private widgetOptions: SecurityDashboardWidgetOptions
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

      // Fetch security status
      await this.fetchSecurityStatus();

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

    // Clear existing content
    while (this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }

    // Render dashboard
    this.renderDashboard();
  }

  /**
   * Fetch security status from API
   */
  private async fetchSecurityStatus(): Promise<void> {
    try {
      // Fetch recovery phrase status
      const recoveryStatus = await this.apiRequest<RecoveryPhraseStatusResponse>(
        '/auth/recovery-phrase-status',
        { method: 'GET' }
      );

      // Fetch email verification status
      const emailStatus = await this.apiRequest<EmailVerificationStatusResponse>(
        '/auth/verify-email-status',
        { method: 'GET' }
      );

      // Combine into security status
      this.securityStatus = {
        recoveryPhrase: {
          active: recoveryStatus.hasRecoveryPhrase,
          verified: recoveryStatus.verified,
          setupDate: recoveryStatus.createdAt,
        },
        emailVerified: emailStatus.emailVerified,
        email: emailStatus.email,
        lastPasswordChange: null, // Would come from user profile endpoint
      };
    } catch (error) {
      console.error('Failed to fetch security status:', error);
      throw error;
    }
  }

  /**
   * Render the dashboard
   */
  private renderDashboard(): void {
    if (!this.securityStatus) {
      this.renderError('Failed to load security status');
      return;
    }

    const container = document.createElement('div');
    container.className = 'flowsta-flex flowsta-flex-col flowsta-gap-md';

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    const title = document.createElement('h2');
    title.className = 'flowsta-heading-1';
    title.textContent = 'Security Dashboard';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'flowsta-text-small';
    subtitle.textContent = 'Manage your account security settings';
    header.appendChild(subtitle);

    container.appendChild(header);

    // Security Score
    const score = this.calculateSecurityScore();
    const scoreCard = this.renderSecurityScore(score);
    container.appendChild(scoreCard);

    // Status Cards
    if (this.widgetOptions.showRecoveryPhrase !== false) {
      const recoveryCard = this.renderRecoveryPhraseStatus();
      container.appendChild(recoveryCard);
    }

    if (this.widgetOptions.showEmailVerification !== false) {
      const emailCard = this.renderEmailVerificationStatus();
      container.appendChild(emailCard);
    }

    if (this.widgetOptions.showPasswordChange !== false) {
      const passwordCard = this.renderPasswordChangeCard();
      container.appendChild(passwordCard);
    }

    this.root.appendChild(container);
  }

  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(): number {
    if (!this.securityStatus) return 0;

    let score = 0;
    const maxScore = 100;

    // Email verified: 30 points
    if (this.securityStatus.emailVerified) {
      score += 30;
    }

    // Recovery phrase set up: 40 points
    if (this.securityStatus.recoveryPhrase.active) {
      score += 30;
    }

    // Recovery phrase verified: additional 10 points
    if (this.securityStatus.recoveryPhrase.verified) {
      score += 10;
    }

    // Password changed recently: 30 points (placeholder logic)
    score += 30; // Assume password is recent for now

    return Math.min(score, maxScore);
  }

  /**
   * Render security score card
   */
  private renderSecurityScore(score: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'flowsta-card';
    card.style.cssText = `
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 1.5rem;
      border-radius: var(--flowsta-border-radius, 0.5rem);
      text-align: center;
    `;

    const scoreLabel = document.createElement('div');
    scoreLabel.style.cssText = 'font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;';
    scoreLabel.textContent = 'Security Score';
    card.appendChild(scoreLabel);

    const scoreValue = document.createElement('div');
    scoreValue.style.cssText = 'font-size: 3rem; font-weight: 700; margin-bottom: 0.5rem;';
    scoreValue.textContent = `${score}`;
    card.appendChild(scoreValue);

    const scoreMax = document.createElement('div');
    scoreMax.style.cssText = 'font-size: 1rem; opacity: 0.8;';
    scoreMax.textContent = '/ 100';
    card.appendChild(scoreMax);

    // Status message
    const statusMsg = document.createElement('div');
    statusMsg.style.cssText = 'font-size: 0.875rem; margin-top: 1rem; opacity: 0.9;';
    
    if (score >= 90) {
      statusMsg.textContent = '🛡️ Excellent security!';
    } else if (score >= 70) {
      statusMsg.textContent = '✅ Good security';
    } else if (score >= 50) {
      statusMsg.textContent = '⚠️ Needs improvement';
    } else {
      statusMsg.textContent = '⚠️ Low security';
    }
    
    card.appendChild(statusMsg);

    return card;
  }

  /**
   * Render recovery phrase status card
   */
  private renderRecoveryPhraseStatus(): HTMLElement {
    const status = this.securityStatus!.recoveryPhrase;

    const card = document.createElement('div');
    card.className = 'flowsta-card';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;';

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';

    const icon = document.createElement('span');
    icon.style.fontSize = '1.5rem';
    icon.textContent = '🔐';
    headerLeft.appendChild(icon);

    const headerText = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'flowsta-heading-2';
    title.textContent = 'Recovery Phrase';
    headerText.appendChild(title);

    headerLeft.appendChild(headerText);
    header.appendChild(headerLeft);

    // Status badge
    const badge = document.createElement('span');
    badge.style.cssText = `
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    `;

    if (status.verified) {
      badge.textContent = '✓ Verified';
      badge.style.background = '#10b981';
      badge.style.color = 'white';
    } else if (status.active) {
      badge.textContent = 'Active';
      badge.style.background = '#f59e0b';
      badge.style.color = 'white';
    } else {
      badge.textContent = 'Not Set Up';
      badge.style.background = '#ef4444';
      badge.style.color = 'white';
    }

    header.appendChild(badge);
    card.appendChild(header);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text-small';
    description.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    if (status.verified) {
      description.textContent = 'Your recovery phrase is set up and verified. Keep it safe!';
    } else if (status.active) {
      description.textContent = 'Please verify your recovery phrase to ensure account recovery.';
    } else {
      description.textContent = 'Set up a recovery phrase to protect your account.';
    }

    card.appendChild(description);

    // Setup date (if active)
    if (status.setupDate) {
      const setupInfo = document.createElement('p');
      setupInfo.className = 'flowsta-text-small';
      setupInfo.style.cssText = 'color: var(--flowsta-color-text-muted, #9ca3af); margin-bottom: 1rem;';
      setupInfo.textContent = `Set up on ${new Date(status.setupDate).toLocaleDateString()}`;
      card.appendChild(setupInfo);
    }

    // Action button
    if (!status.active || !status.verified) {
      const actionButton = createButton({
        content: status.active ? 'Verify Phrase' : 'Set Up Recovery Phrase',
        variant: 'primary',
        onClick: () => {
          if (this.widgetOptions.onRecoveryPhraseSetup) {
            this.widgetOptions.onRecoveryPhraseSetup();
          }
        },
      });
      card.appendChild(actionButton);
    }

    return card;
  }

  /**
   * Render email verification status card
   */
  private renderEmailVerificationStatus(): HTMLElement {
    const status = this.securityStatus!;

    const card = document.createElement('div');
    card.className = 'flowsta-card';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;';

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';

    const icon = document.createElement('span');
    icon.style.fontSize = '1.5rem';
    icon.textContent = '✉️';
    headerLeft.appendChild(icon);

    const headerText = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'flowsta-heading-2';
    title.textContent = 'Email Verification';
    headerText.appendChild(title);

    headerLeft.appendChild(headerText);
    header.appendChild(headerLeft);

    // Status badge
    const badge = document.createElement('span');
    badge.style.cssText = `
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    `;

    if (status.emailVerified) {
      badge.textContent = '✓ Verified';
      badge.style.background = '#10b981';
      badge.style.color = 'white';
    } else {
      badge.textContent = 'Not Verified';
      badge.style.background = '#ef4444';
      badge.style.color = 'white';
    }

    header.appendChild(badge);
    card.appendChild(header);

    // Email address
    const emailText = document.createElement('p');
    emailText.className = 'flowsta-text-small';
    emailText.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';
    emailText.textContent = status.email;
    card.appendChild(emailText);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text-small';
    description.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';

    if (status.emailVerified) {
      description.textContent = 'Your email address is verified.';
    } else {
      description.textContent = 'Please verify your email address to secure your account.';
    }

    card.appendChild(description);

    // Action button (if not verified)
    if (!status.emailVerified) {
      const actionButton = createButton({
        content: 'Verify Email',
        variant: 'primary',
        onClick: async () => {
          // Resend verification email
          try {
            await this.apiRequest('/auth/resend-verification', {
              method: 'POST',
            });
            alert('Verification email sent! Check your inbox.');
          } catch (error) {
            alert('Failed to send verification email. Please try again.');
          }
        },
      });
      card.appendChild(actionButton);
    }

    return card;
  }

  /**
   * Render password change card
   */
  private renderPasswordChangeCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'flowsta-card';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;';

    const icon = document.createElement('span');
    icon.style.fontSize = '1.5rem';
    icon.textContent = '🔒';
    header.appendChild(icon);

    const title = document.createElement('h3');
    title.className = 'flowsta-heading-2';
    title.textContent = 'Password';
    header.appendChild(title);

    card.appendChild(header);

    // Description
    const description = document.createElement('p');
    description.className = 'flowsta-text-small';
    description.style.marginBottom = 'var(--flowsta-spacing-medium, 1rem)';
    description.textContent = 'Change your password to keep your account secure.';
    card.appendChild(description);

    // Action button
    const actionButton = createButton({
      content: 'Change Password',
      variant: 'secondary',
      onClick: () => {
        if (this.widgetOptions.onPasswordChange) {
          this.widgetOptions.onPasswordChange();
        }
      },
    });
    card.appendChild(actionButton);

    return card;
  }

  /**
   * Render error state
   */
  private renderError(message: string): void {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'flowsta-alert flowsta-alert-error';
    errorContainer.textContent = message;
    this.root.appendChild(errorContainer);
  }

  /**
   * Refresh security status
   */
  async refresh(): Promise<void> {
    try {
      this.setState('loading');
      await this.fetchSecurityStatus();
      this.render();
      this.setState('ready');
    } catch (error) {
      this.handleError(error as Error);
      if (this.widgetOptions.onError) {
        this.widgetOptions.onError(error as WidgetError);
      }
    }
  }
}

