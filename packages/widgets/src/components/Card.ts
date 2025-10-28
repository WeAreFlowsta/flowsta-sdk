/**
 * Card Component
 * Reusable card container component
 */

export interface CardOptions {
  /** Card title */
  title?: string;
  /** Card content */
  content?: string | HTMLElement;
  /** Card footer */
  footer?: string | HTMLElement;
  /** CSS classes */
  className?: string;
  /** Click handler */
  onClick?: (event: MouseEvent) => void;
  /** Padding size */
  padding?: 'small' | 'medium' | 'large';
}

export interface Card {
  container: HTMLDivElement;
  header?: HTMLDivElement;
  title?: HTMLHeadingElement;
  body: HTMLDivElement;
  footer?: HTMLDivElement;
}

/**
 * Create a card element
 */
export function createCard(options: CardOptions = {}): Card {
  const {
    title,
    content,
    footer,
    className = '',
    onClick,
    padding = 'medium',
  } = options;

  // Container
  const container = document.createElement('div');
  container.className = `flowsta-card ${className}`;

  // Padding
  if (padding === 'small') {
    container.style.padding = 'var(--flowsta-spacing-medium, 1rem)';
  } else if (padding === 'large') {
    container.style.padding = 'var(--flowsta-spacing-xlarge, 2rem)';
  }

  // Clickable card
  if (onClick) {
    container.style.cursor = 'pointer';
    container.addEventListener('click', onClick);
    container.addEventListener('mouseenter', () => {
      container.style.transform = 'translateY(-2px)';
      container.style.transition = 'transform 0.2s ease';
    });
    container.addEventListener('mouseleave', () => {
      container.style.transform = '';
    });
  }

  let headerElement: HTMLDivElement | undefined;
  let titleElement: HTMLHeadingElement | undefined;

  // Header with title
  if (title) {
    headerElement = document.createElement('div');
    headerElement.className = 'flowsta-card-header';
    
    titleElement = document.createElement('h3');
    titleElement.className = 'flowsta-heading-2';
    titleElement.textContent = title;
    
    headerElement.appendChild(titleElement);
    container.appendChild(headerElement);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'flowsta-card-body';

  if (content) {
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
  }

  container.appendChild(body);

  // Footer
  let footerElement: HTMLDivElement | undefined;
  if (footer) {
    footerElement = document.createElement('div');
    footerElement.className = 'flowsta-card-footer';
    footerElement.style.marginTop = 'var(--flowsta-spacing-medium, 1rem)';
    footerElement.style.paddingTop = 'var(--flowsta-spacing-medium, 1rem)';
    footerElement.style.borderTop = '1px solid var(--flowsta-color-border, #374151)';

    if (typeof footer === 'string') {
      footerElement.innerHTML = footer;
    } else {
      footerElement.appendChild(footer);
    }

    container.appendChild(footerElement);
  }

  return {
    container,
    header: headerElement,
    title: titleElement,
    body,
    footer: footerElement,
  };
}

/**
 * Update card content
 */
export function updateCard(card: Card, updates: Partial<CardOptions>): void {
  if (updates.title !== undefined && card.title) {
    card.title.textContent = updates.title;
  }

  if (updates.content !== undefined) {
    card.body.innerHTML = '';
    if (typeof updates.content === 'string') {
      card.body.innerHTML = updates.content;
    } else {
      card.body.appendChild(updates.content);
    }
  }

  if (updates.footer !== undefined && card.footer) {
    card.footer.innerHTML = '';
    if (typeof updates.footer === 'string') {
      card.footer.innerHTML = updates.footer;
    } else {
      card.footer.appendChild(updates.footer);
    }
  }
}

/**
 * Clear card body
 */
export function clearCard(card: Card): void {
  card.body.innerHTML = '';
}

/**
 * Append content to card body
 */
export function appendToCard(card: Card, content: string | HTMLElement): void {
  if (typeof content === 'string') {
    const div = document.createElement('div');
    div.innerHTML = content;
    card.body.appendChild(div);
  } else {
    card.body.appendChild(content);
  }
}

