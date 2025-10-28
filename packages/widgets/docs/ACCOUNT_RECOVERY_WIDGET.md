# Account Recovery Widget

The Account Recovery Widget provides a complete flow for users to recover their accounts using their recovery phrase. It guides users through entering their email, providing their 24-word recovery phrase, and setting a new password.

## Features

- ✅ **4-Step Recovery Flow**: Email → Recovery Phrase → New Password → Success
- ✅ **Phrase Paste Support**: Users can paste their full 24-word phrase
- ✅ **Word-by-Word Validation**: Each word is validated for BIP39 compliance
- ✅ **Progress Tracking**: Visual indicators show current step
- ✅ **Back Navigation**: Users can go back to previous steps
- ✅ **Password Validation**: Ensures strong passwords and confirmation match
- ✅ **Customizable Messages**: Override default text for branding
- ✅ **Event Callbacks**: React to recovery completion
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **Shadow DOM Isolation**: Styles don't conflict with host page

## Installation

```bash
npm install @flowsta/auth-widgets
```

## Basic Usage

```typescript
import { AccountRecoveryWidget } from '@flowsta/auth-widgets';

// Create widget
const widget = new AccountRecoveryWidget(
  document.getElementById('recovery-container'),
  {
    clientId: 'your-client-id',
    apiUrl: 'https://api.flowsta.com',
    
    // Callback when recovery is complete
    onComplete: (result) => {
      console.log('Account recovered!', result);
      // Redirect to login or auto-login
      window.location.href = '/login';
    },
  }
);

// Initialize and show
await widget.initialize();
widget.show();
```

## Configuration Options

### Base Options

```typescript
interface AccountRecoveryWidgetOptions {
  // Required
  clientId: string;           // Your Flowsta client ID
  
  // Optional
  apiUrl?: string;            // API base URL (default: https://api.flowsta.com)
  email?: string;             // Pre-fill email (skips email step)
  
  // Styling
  theme?: Theme;              // Full theme customization
  branding?: BrandingOptions; // Simple branding (colors, logo)
  
  // Callbacks
  onComplete?: (result: RecoveryResult) => void;
  onCancel?: () => void;
  onError?: (error: WidgetError) => void;
  onStepChange?: (step: RecoveryStep) => void;
  
  // Messages
  messages?: AccountRecoveryMessages;
  
  // Behavior
  autoShow?: boolean;         // Show immediately after init (default: false)
  debug?: boolean;            // Enable debug logging
}
```

### Recovery Steps

```typescript
type RecoveryStep = 
  | 'email'       // Enter email address
  | 'phrase'      // Enter 24-word recovery phrase
  | 'password'    // Set new password
  | 'success';    // Recovery complete
```

### Recovery Result

```typescript
interface RecoveryResult {
  email: string;
  success: boolean;
  message: string;
}
```

## Advanced Usage

### Pre-fill Email

Skip the email step if you already know the user's email:

```typescript
const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  email: 'user@example.com', // Start at phrase step
  onComplete: (result) => {
    console.log('Recovered:', result.email);
  },
});
```

### Custom Messages

Override default text for your brand:

```typescript
const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  messages: {
    emailTitle: 'Recover Your Account',
    emailDescription: 'Enter your email to start the recovery process.',
    phraseTitle: 'Enter Your Recovery Phrase',
    phraseDescription: 'Enter all 24 words in the correct order.',
    passwordTitle: 'Create New Password',
    successTitle: 'Account Recovered!',
    successDescription: 'Your password has been reset successfully.',
  },
});
```

### Step Tracking

Track user progress through the recovery flow:

```typescript
const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  onStepChange: (step) => {
    console.log('User is now on step:', step);
    
    // Track analytics
    analytics.track('Recovery Step', { step });
    
    // Update UI
    if (step === 'success') {
      showConfetti();
    }
  },
});
```

### Error Handling

Handle errors gracefully:

```typescript
const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  onError: (error) => {
    console.error('Recovery error:', error);
    
    if (error.code === 'ACCOUNT_NOT_FOUND') {
      alert('No account found with that email address.');
    } else if (error.code === 'INVALID_RECOVERY_PHRASE') {
      alert('The recovery phrase is incorrect. Please check and try again.');
    } else {
      alert('An error occurred. Please try again later.');
    }
  },
});
```

## Styling

### Using Branding Options (Simple)

```typescript
const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  branding: {
    primaryColor: '#6366f1',
    logo: 'https://example.com/logo.png',
    fontFamily: 'Inter, sans-serif',
  },
});
```

### Using Full Theme (Advanced)

```typescript
const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  theme: {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      success: '#10b981',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f9fafb',
      text: {
        primary: '#111827',
        secondary: '#6b7280',
        disabled: '#9ca3af',
      },
      border: '#e5e7eb',
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontSize: {
        small: '0.875rem',
        base: '1rem',
        large: '1.125rem',
        heading: '1.5rem',
      },
    },
    spacing: {
      small: '0.5rem',
      medium: '1rem',
      large: '1.5rem',
    },
    borderRadius: {
      small: '0.25rem',
      medium: '0.5rem',
      large: '0.75rem',
    },
  },
});
```

## Methods

### `initialize(): Promise<void>`

Initialize the widget and validate client ID.

```typescript
await widget.initialize();
```

### `show(): void`

Display the widget.

```typescript
widget.show();
```

### `hide(): void`

Hide the widget without destroying it.

```typescript
widget.hide();
```

### `destroy(): void`

Remove the widget from the DOM and clean up resources.

```typescript
widget.destroy();
```

### `getState(): WidgetState`

Get the current widget state.

```typescript
const state = widget.getState();
console.log(state); // 'idle' | 'loading' | 'ready' | 'error' | 'success'
```

## Events

The widget emits custom events that you can listen to:

### `flowsta:step-change`

Fired when the user moves to a different step:

```typescript
container.addEventListener('flowsta:step-change', (event) => {
  console.log('Step changed to:', event.detail.step);
});
```

### `flowsta:recovery-complete`

Fired when recovery is successfully completed:

```typescript
container.addEventListener('flowsta:recovery-complete', (event) => {
  console.log('Recovery complete:', event.detail);
});
```

### `flowsta:error`

Fired when an error occurs:

```typescript
container.addEventListener('flowsta:error', (event) => {
  console.error('Error:', event.detail.error);
});
```

## Examples

### React Integration

```tsx
import { useEffect, useRef } from 'react';
import { AccountRecoveryWidget } from '@flowsta/auth-widgets';

function AccountRecovery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<AccountRecoveryWidget | null>(null);

  useEffect(() => {
    if (containerRef.current && !widgetRef.current) {
      const widget = new AccountRecoveryWidget(containerRef.current, {
        clientId: 'your-client-id',
        onComplete: (result) => {
          console.log('Recovery complete!', result);
          // Handle post-recovery logic
        },
      });

      widget.initialize().then(() => {
        widget.show();
      });

      widgetRef.current = widget;
    }

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} />;
}
```

### Vue Integration

```vue
<template>
  <div ref="container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { AccountRecoveryWidget } from '@flowsta/auth-widgets';

const container = ref(null);
let widget = null;

onMounted(async () => {
  widget = new AccountRecoveryWidget(container.value, {
    clientId: 'your-client-id',
    onComplete: (result) => {
      console.log('Recovery complete!', result);
    },
  });

  await widget.initialize();
  widget.show();
});

onUnmounted(() => {
  widget?.destroy();
});
</script>
```

### Svelte Integration

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { AccountRecoveryWidget } from '@flowsta/auth-widgets';

  let container;
  let widget;

  onMount(async () => {
    widget = new AccountRecoveryWidget(container, {
      clientId: 'your-client-id',
      onComplete: (result) => {
        console.log('Recovery complete!', result);
      },
    });

    await widget.initialize();
    widget.show();
  });

  onDestroy(() => {
    widget?.destroy();
  });
</script>

<div bind:this={container}></div>
```

## Security

- Recovery phrases are validated locally before being sent to the API
- All API communication happens over HTTPS
- Recovery phrases are never logged or stored in browser
- The widget uses Content Security Policy (CSP) compliant code
- Shadow DOM isolation prevents CSS injection attacks

## Browser Support

- Chrome/Edge 88+
- Firefox 75+
- Safari 13.1+
- Mobile browsers (iOS Safari 13.4+, Chrome Android 88+)

## Troubleshooting

### Widget doesn't appear

- Ensure the container element exists in the DOM
- Check that `initialize()` completed successfully
- Call `show()` to display the widget

### Recovery phrase validation fails

- Verify all 24 words are valid BIP39 words
- Ensure words are in the correct order
- Check for extra spaces or special characters

### API errors

- Verify your client ID is correct
- Check network connectivity
- Ensure the API URL is correct (if using custom API)
- Check browser console for detailed error messages

## Support

- Documentation: https://docs.flowsta.com
- API Reference: https://api.flowsta.com/docs
- Support: support@flowsta.com

## License

MIT License - see LICENSE file for details

