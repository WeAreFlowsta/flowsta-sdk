# Recovery Phrase Widget 🔐

The Recovery Phrase Widget guides users through setting up and verifying their 24-word recovery phrase in a secure, user-friendly flow.

## Overview

The Recovery Phrase Widget provides a complete, 5-step process for:
1. Introducing users to recovery phrases
2. Confirming their password for security
3. Displaying their 24-word recovery phrase
4. Verifying they've saved it correctly
5. Confirming successful setup

## Installation

```bash
npm install @flowsta/auth-widgets
```

## Basic Usage

```typescript
import { RecoveryPhraseWidget } from '@flowsta/auth-widgets';

// Get container element
const container = document.getElementById('recovery-phrase-container');

// Create widget instance
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => localStorage.getItem('authToken'),
  onComplete: async (verified) => {
    console.log('Setup complete!', verified);
    window.location.href = '/dashboard';
  },
});

// Initialize and show
await widget.initialize();
widget.show();
```

## Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `clientId` | `string` | Your Flowsta client ID from the developer dashboard |
| `getAuthToken` | `() => string \| Promise<string>` | Function to retrieve the current user's auth token |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowDismiss` | `boolean` | `false` | Allow users to skip/dismiss the setup |
| `autoShow` | `boolean` | `false` | Automatically show widget after initialization |
| `apiUrl` | `string` | `'https://api.flowsta.com'` | API base URL |
| `debug` | `boolean` | `false` | Enable debug logging |
| `branding` | `BrandingOptions` | - | Customize colors and branding |
| `theme` | `Theme` | - | Full theme customization |
| `customMessages` | `object` | - | Override default text messages |

### Branding Options

```typescript
interface BrandingOptions {
  companyName?: string;         // Your company name
  brandingColor?: string;       // Primary color (hex)
  showPoweredBy?: boolean;      // Show "Powered by Flowsta" (default: true)
}
```

### Custom Messages

```typescript
interface CustomMessages {
  title?: string;               // Main title (Step 1)
  description?: string;         // Introduction text (Step 1)
  confirmationMessage?: string; // Success message (Step 5)
}
```

### Callbacks

| Callback | Parameters | Description |
|----------|------------|-------------|
| `onComplete` | `(verified: boolean)` | Called when setup is complete and verified |
| `onDismiss` | `()` | Called when user dismisses without completing |
| `onError` | `(error: WidgetError)` | Called when an error occurs |

## Examples

### Basic Integration

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
});

await widget.initialize();
widget.show();
```

### With Custom Branding

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
  branding: {
    companyName: 'Acme Corp',
    brandingColor: '#FF6B35',
    showPoweredBy: false,
  },
});

await widget.initialize();
widget.show();
```

### With Dismiss Option

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
  allowDismiss: true,
  onDismiss: () => {
    // Track that user skipped setup
    analytics.track('recovery_phrase_dismissed');
    
    // Show reminder banner
    showReminderBanner();
  },
});

await widget.initialize();
widget.show();
```

### With Custom Messages

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
  customMessages: {
    title: 'Protect Your Account',
    description: 'Your account security is important to us. Let\'s set up your recovery phrase.',
    confirmationMessage: 'All set! Your account is now protected.',
  },
});

await widget.initialize();
widget.show();
```

### With Error Handling

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
  onError: (error) => {
    console.error('Widget error:', error);
    
    // Show user-friendly error message
    showErrorToast(error.message);
    
    // Track error
    analytics.track('recovery_phrase_error', {
      code: error.code,
      message: error.message,
    });
  },
});

await widget.initialize();
widget.show();
```

### Complete Example with All Options

```typescript
import { RecoveryPhraseWidget } from '@flowsta/auth-widgets';

const container = document.getElementById('recovery-container');

const widget = new RecoveryPhraseWidget(container, {
  // Required
  clientId: 'your-client-id',
  getAuthToken: () => localStorage.getItem('authToken'),
  
  // Behavior
  allowDismiss: true,
  autoShow: false,
  debug: true,
  
  // Branding
  branding: {
    companyName: 'Acme Corp',
    brandingColor: '#6366f1',
    showPoweredBy: true,
  },
  
  // Custom messages
  customMessages: {
    title: 'Secure Your Account',
    description: 'Set up your recovery phrase to protect your account.',
    confirmationMessage: 'Your account is now secure!',
  },
  
  // Callbacks
  onComplete: async (verified) => {
    console.log('✅ Setup complete!', { verified });
    
    // Track completion
    analytics.track('recovery_phrase_complete', { verified });
    
    // Update user state
    await updateUserState({ recoveryPhraseSetup: true });
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  },
  
  onDismiss: () => {
    console.log('⚠️ User dismissed setup');
    
    // Track dismissal
    analytics.track('recovery_phrase_dismissed');
    
    // Show reminder
    showSetupReminder();
  },
  
  onError: (error) => {
    console.error('❌ Widget error:', error);
    
    // Track error
    analytics.track('recovery_phrase_error', {
      code: error.code,
      message: error.message,
    });
    
    // Show error message
    showErrorNotification(error.message);
  },
});

// Initialize
await widget.initialize();

// Show when ready
widget.show();
```

## Widget Flow

### Step 1: Introduction
- Explains what a recovery phrase is
- Why it's critical for account security
- What the user will do (4 steps)
- "Continue" button to proceed

### Step 2: Password Confirmation
- User enters their password
- Validates password is correct
- Generates recovery phrase on success
- "Back" button returns to intro

### Step 3: Display Recovery Phrase
- Shows 24-word recovery phrase
- Numbered grid layout (1. word1, 2. word2, etc.)
- "Copy to Clipboard" button
- "Download" button (saves as .txt file)
- Checkbox: "I've saved my recovery phrase"
- "Continue to Verification" button

### Step 4: Verification
- Asks user to enter 3 random words from their phrase
- Shows word numbers (e.g., "Word #3", "Word #8", "Word #16")
- Validates entered words match
- Shows error if words are incorrect
- "Back" button returns to display
- "Verify" button proceeds to success

### Step 5: Success
- ✅ Checkmark icon
- Success message
- Confirmation that phrase is verified
- "Done" button to complete

## Methods

### `initialize()`

Initialize the widget and validate client ID.

```typescript
await widget.initialize();
```

### `show()`

Show the widget (makes it visible).

```typescript
widget.show();
```

### `hide()`

Hide the widget (keeps it in DOM).

```typescript
widget.hide();
```

### `destroy()`

Destroy the widget and remove from DOM.

```typescript
widget.destroy();
```

### `getState()`

Get current widget state.

```typescript
const state = widget.getState();
// Returns: 'initializing' | 'ready' | 'loading' | 'error' | 'success' | 'destroyed'
```

## Events

The widget emits events that you can listen to:

```typescript
import { WidgetEvents } from '@flowsta/auth-widgets';

widget.on(WidgetEvents.INITIALIZED, () => {
  console.log('Widget initialized');
});

widget.on(WidgetEvents.STATE_CHANGE, (event) => {
  console.log('State changed:', event.detail.data);
});

widget.on(WidgetEvents.SHOW, () => {
  console.log('Widget shown');
});

widget.on(WidgetEvents.HIDE, () => {
  console.log('Widget hidden');
});

widget.on(WidgetEvents.ERROR, (event) => {
  console.error('Widget error:', event.detail.data);
});

widget.on(WidgetEvents.DESTROY, () => {
  console.log('Widget destroyed');
});
```

## Styling

### Default Styling

The widget uses Shadow DOM for style isolation and comes with beautiful default styling.

### Custom Theming

You can customize the entire theme:

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
  theme: {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#1f2937',
      backgroundAlt: '#111827',
      surface: '#374151',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      border: '#4b5563',
      hover: '#4b5563',
    },
    fonts: {
      family: 'system-ui, sans-serif',
      sizes: {
        small: '0.875rem',
        medium: '1rem',
        large: '1.125rem',
        xlarge: '1.5rem',
      },
      weights: {
        normal: 400,
        medium: 500,
        bold: 700,
      },
    },
    spacing: {
      small: '0.5rem',
      medium: '1rem',
      large: '1.5rem',
      xlarge: '2rem',
    },
    borderRadius: '0.5rem',
    shadows: {
      small: '0 1px 2px rgba(0, 0, 0, 0.05)',
      medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
      large: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
  },
});
```

### Simplified Branding

For quick customization, use the `branding` option:

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'abc123',
  getAuthToken: () => localStorage.getItem('token'),
  branding: {
    brandingColor: '#FF6B35', // Primary color
    companyName: 'Acme Corp',
  },
});
```

## Security

### Best Practices

1. **Use HTTPS**: Always serve your site over HTTPS
2. **Validate Origin**: Ensure widget is only loaded on allowed domains
3. **Secure Auth Tokens**: Store tokens securely (HttpOnly cookies recommended)
4. **User Education**: Emphasize importance of saving recovery phrase
5. **Audit Trail**: Log when users complete/dismiss setup

### What the Widget Protects

- ✅ Recovery phrase never leaves user's device until verification
- ✅ Password validation happens server-side
- ✅ All API calls are authenticated with JWT tokens
- ✅ XSS protection via DOMPurify sanitization
- ✅ Shadow DOM prevents style/script injection
- ✅ Client ID and origin validation

## Troubleshooting

### Widget doesn't initialize

```typescript
// Check client ID is correct
console.log('Client ID:', options.clientId);

// Check auth token is available
const token = await options.getAuthToken();
console.log('Auth token:', token ? 'Available' : 'Missing');

// Enable debug mode
const widget = new RecoveryPhraseWidget(container, {
  ...options,
  debug: true,
});
```

### "Invalid client ID" error

- Verify client ID matches your Flowsta dashboard
- Check allowed origins include your site's domain
- Ensure site is served over HTTPS in production

### "Not authenticated" error

- Verify `getAuthToken` returns valid JWT token
- Check token hasn't expired
- Ensure user is logged in

### Styling issues

- Widget uses Shadow DOM for isolation
- Custom styles won't affect widget
- Use `theme` or `branding` options for customization

## Support

- **Documentation**: https://docs.flowsta.com
- **API Reference**: https://docs.flowsta.com/api
- **Developer Dashboard**: https://dev.flowsta.com
- **Support**: support@flowsta.com

## License

MIT License - see LICENSE file for details

