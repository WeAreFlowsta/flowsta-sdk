/**
 * Event Types
 * Custom events emitted by Flowsta Auth Widgets
 */

/**
 * Widget event names
 */
export const WidgetEvents = {
  /** Widget has been initialized */
  INITIALIZED: 'widget:initialized',
  /** Widget is being shown */
  SHOW: 'widget:show',
  /** Widget is being hidden */
  HIDE: 'widget:hide',
  /** Widget is being destroyed */
  DESTROY: 'widget:destroy',
  /** Widget state changed */
  STATE_CHANGE: 'widget:state-change',
  /** Widget error occurred */
  ERROR: 'widget:error',
  /** Widget action completed successfully */
  SUCCESS: 'widget:success',
} as const;

/**
 * Widget event data
 */
export interface WidgetEventData {
  widgetId: string;
  widgetType: string;
  timestamp: number;
  data?: unknown;
}

/**
 * State change event data
 */
export interface StateChangeEventData extends WidgetEventData {
  data: {
    previousState: string;
    currentState: string;
  };
}

/**
 * Error event data
 */
export interface ErrorEventData extends WidgetEventData {
  data: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Success event data
 */
export interface SuccessEventData extends WidgetEventData {
  data: {
    action: string;
    result?: unknown;
  };
}

/**
 * Custom event interface
 */
export interface WidgetEvent<T = unknown> extends CustomEvent {
  detail: WidgetEventData & { data?: T };
}

/**
 * Event listener type
 */
export type WidgetEventListener<T = unknown> = (event: WidgetEvent<T>) => void;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  on<T = unknown>(eventName: string, listener: WidgetEventListener<T>): void;
  off<T = unknown>(eventName: string, listener: WidgetEventListener<T>): void;
  emit<T = unknown>(eventName: string, data: T): void;
}

