/**
 * Sanitization Utilities
 * XSS prevention using DOMPurify
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string
 * Removes all potentially dangerous content
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button'
    ],
    ALLOWED_ATTR: ['class', 'id', 'href', 'target', 'rel', 'aria-label', 'role'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * Sanitize text input (removes all HTML)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * Sanitize user input for display
 * Escapes HTML entities
 */
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    // Invalid URL, return empty string
    return '';
  }
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeText(email).trim().toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize recovery phrase (validate it's 24 words)
 */
export function validateRecoveryPhrase(phrase: string): boolean {
  const sanitized = sanitizeText(phrase);
  const words = sanitized.trim().split(/\s+/);
  return words.length === 24 && words.every(word => word.length > 0);
}

