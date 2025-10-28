/**
 * FlowstaWidget Base Class
 * Foundation for all Flowsta Auth Widgets
 */

import {
  attachShadow,
  injectStyles,
  themeToCSSVariables,
  brandingToTheme,
  mergeTheme,
  DEFAULT_DARK_THEME,
  SimpleEventEmitter,
} from './utils';

import type {
  BaseWidgetOptions,
  WidgetState,
  WidgetContainer,
  Theme,
  ClientValidationResponse,
} from './types';

import { WidgetError, WidgetErrorCodes, WidgetEvents } from './types';

/**
 * Base class for all Flowsta Auth Widgets
 */
export abstract class FlowstaWidget {
  /** Widget ID (unique per instance) */
  protected widgetId: string;

  /** Widget type (e.g., 'recovery-phrase', 'email-verification') */
  protected abstract widgetType: string;

  /** Container element */
  protected container: WidgetContainer;

  /** Shadow root or container */
  protected root: ShadowRoot | HTMLElement;

  /** Widget options */
  protected options: BaseWidgetOptions;

  /** Current theme */
  protected theme: Theme;

  /** Current widget state */
  protected state: WidgetState = 'initializing';

  /** Event emitter */
  protected events: SimpleEventEmitter;

  /** Is widget shown */
  protected isVisible: boolean = false;

  /** API base URL */
  protected apiUrl: string;

  /**
   * Constructor
   */
  constructor(container: WidgetContainer, options: BaseWidgetOptions) {
    this.widgetId = `flowsta-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.container = container;
    this.options = options;
    this.events = new SimpleEventEmitter();

    // Set API URL
    this.apiUrl = options.apiUrl || 'https://api.flowsta.com';

    // Determine theme
    this.theme = this.resolveTheme();

    // Attach Shadow DOM
    this.root = attachShadow(container, 'closed');

    // Log debug info
    if (this.options.debug) {
      console.log(`[Flowsta Widgets] Initializing ${this.widgetType} widget`, {
        widgetId: this.widgetId,
        options: this.options,
      });
    }

    // Emit initialized event
    this.emitEvent(WidgetEvents.INITIALIZED, {});
  }

  /**
   * Initialize widget (to be implemented by subclasses)
   */
  abstract initialize(): Promise<void>;

  /**
   * Render widget UI (to be implemented by subclasses)
   */
  protected abstract render(): void;

  /**
   * Show widget
   */
  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.setState('ready');
    this.emitEvent(WidgetEvents.SHOW, {});

    if (this.options.debug) {
      console.log(`[Flowsta Widgets] Showing ${this.widgetType} widget`);
    }
  }

  /**
   * Hide widget
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.emitEvent(WidgetEvents.HIDE, {});

    if (this.options.debug) {
      console.log(`[Flowsta Widgets] Hiding ${this.widgetType} widget`);
    }
  }

  /**
   * Destroy widget and clean up
   */
  destroy(): void {
    this.setState('destroyed');
    this.emitEvent(WidgetEvents.DESTROY, {});
    this.events.removeAllListeners();

    // Remove from DOM
    if (this.root instanceof ShadowRoot) {
      // Can't remove shadow root, but can clear it
      while (this.root.firstChild) {
        this.root.removeChild(this.root.firstChild);
      }
    } else {
      this.root.innerHTML = '';
    }

    if (this.options.debug) {
      console.log(`[Flowsta Widgets] Destroyed ${this.widgetType} widget`);
    }
  }

  /**
   * Get widget state
   */
  getState(): WidgetState {
    return this.state;
  }

  /**
   * Set widget state
   */
  protected setState(newState: WidgetState): void {
    const previousState = this.state;
    this.state = newState;

    this.emitEvent(WidgetEvents.STATE_CHANGE, {
      previousState,
      currentState: newState,
    });

    if (this.options.debug) {
      console.log(`[Flowsta Widgets] State change: ${previousState} → ${newState}`);
    }
  }

  /**
   * Emit event
   */
  protected emitEvent(eventName: string, data: unknown): void {
    this.events.emit(eventName, {
      widgetId: this.widgetId,
      widgetType: this.widgetType,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Handle error
   */
  protected handleError(error: WidgetError | Error): void {
    this.setState('error');

    const widgetError = error instanceof WidgetError
      ? error
      : new WidgetError(error.message, WidgetErrorCodes.UNKNOWN_ERROR);

    this.emitEvent(WidgetEvents.ERROR, {
      code: widgetError.code,
      message: widgetError.message,
      details: widgetError.details,
    });

    if (this.options.debug) {
      console.error(`[Flowsta Widgets] Error in ${this.widgetType}:`, widgetError);
    }
  }

  /**
   * Validate client ID with API
   */
  protected async validateClientId(): Promise<ClientValidationResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/validate-client`, {
        method: 'GET',
        headers: {
          'X-Client-Id': this.options.clientId,
          'Origin': window.location.origin,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new WidgetError(
            'Origin not allowed for this client',
            WidgetErrorCodes.ORIGIN_NOT_ALLOWED
          );
        }
        throw new WidgetError(
          'Invalid client ID',
          WidgetErrorCodes.INVALID_CLIENT_ID
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof WidgetError) {
        throw error;
      }
      throw new WidgetError(
        'Failed to validate client ID',
        WidgetErrorCodes.NETWORK_ERROR,
        error
      );
    }
  }

  /**
   * Get auth token
   */
  protected async getAuthToken(): Promise<string> {
    if (!this.options.getAuthToken) {
      throw new WidgetError(
        'No auth token available',
        WidgetErrorCodes.NOT_AUTHENTICATED
      );
    }

    const token = await this.options.getAuthToken();

    if (!token) {
      throw new WidgetError(
        'User not authenticated',
        WidgetErrorCodes.NOT_AUTHENTICATED
      );
    }

    return token;
  }

  /**
   * Make authenticated API request
   */
  protected async apiRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-Id': this.options.clientId,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new WidgetError(
          errorData.error || 'API request failed',
          WidgetErrorCodes.API_ERROR,
          { status: response.status, ...errorData }
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof WidgetError) {
        throw error;
      }
      throw new WidgetError(
        'Network error',
        WidgetErrorCodes.NETWORK_ERROR,
        error
      );
    }
  }

  /**
   * Resolve theme from options
   */
  private resolveTheme(): Theme {
    if (this.options.theme) {
      return mergeTheme(DEFAULT_DARK_THEME, this.options.theme);
    }

    if (this.options.branding) {
      return brandingToTheme(this.options.branding, DEFAULT_DARK_THEME);
    }

    return DEFAULT_DARK_THEME;
  }

  /**
   * Inject theme styles into Shadow DOM
   */
  protected injectTheme(): void {
    const cssVariables = themeToCSSVariables(this.theme);
    injectStyles(this.root, cssVariables);
  }

  /**
   * Subscribe to widget events
   */
  on(eventName: string, listener: (event: any) => void): void {
    this.events.on(eventName, listener);
  }

  /**
   * Unsubscribe from widget events
   */
  off(eventName: string, listener: (event: any) => void): void {
    this.events.off(eventName, listener);
  }
}

