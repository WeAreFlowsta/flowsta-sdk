/**
 * Shadow DOM Utilities
 * Helper functions for working with Shadow DOM
 */

import type { WidgetContainer } from '../types';

/**
 * Check if browser supports Shadow DOM
 */
export function supportsShadowDOM(): boolean {
  return !!(typeof ShadowRoot === 'function' &&
    document.body.attachShadow);
}

/**
 * Attach Shadow DOM to container
 * Falls back to regular DOM if Shadow DOM not supported
 */
export function attachShadow(
  container: WidgetContainer,
  mode: 'open' | 'closed' = 'closed'
): ShadowRoot | WidgetContainer {
  if (!supportsShadowDOM()) {
    console.warn('[Flowsta Widgets] Shadow DOM not supported, using regular DOM');
    return container;
  }

  try {
    const shadowRoot = container.attachShadow({ mode });
    return shadowRoot;
  } catch (error) {
    console.error('[Flowsta Widgets] Failed to attach Shadow DOM:', error);
    return container;
  }
}

/**
 * Create a style element for Shadow DOM
 */
export function createStyleElement(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  return style;
}

/**
 * Inject CSS into Shadow DOM
 */
export function injectStyles(root: ShadowRoot | HTMLElement, css: string): void {
  const style = createStyleElement(css);
  root.appendChild(style);
}

/**
 * Create a container div with class
 */
export function createContainer(className: string): HTMLDivElement {
  const container = document.createElement('div');
  container.className = className;
  return container;
}

/**
 * Query element within Shadow DOM or regular DOM
 */
export function querySelector<T extends Element = Element>(
  root: ShadowRoot | Document | HTMLElement,
  selector: string
): T | null {
  return root.querySelector<T>(selector);
}

/**
 * Query all elements within Shadow DOM or regular DOM
 */
export function querySelectorAll<T extends Element = Element>(
  root: ShadowRoot | Document | HTMLElement,
  selector: string
): NodeListOf<T> {
  return root.querySelectorAll<T>(selector);
}

/**
 * Create and render element tree in Shadow DOM
 */
export function renderInShadow(
  root: ShadowRoot | HTMLElement,
  html: string,
  styles: string
): void {
  // Inject styles first
  if (styles) {
    injectStyles(root, styles);
  }

  // Create container
  const container = createContainer('flowsta-widget-root');
  container.innerHTML = html;

  // Append to shadow root
  root.appendChild(container);
}

