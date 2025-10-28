# Email Verification Widget ✉️

The Email Verification Widget prompts users to verify their email address with flexible display modes and automatic verification detection.

## Overview

The Email Verification Widget provides a complete email verification experience with:
- **3 Display Modes**: Banner (top of page), Modal (center overlay), or Inline (embedded)
- **Resend Functionality**: One-click resend with countdown timer
- **Auto-Detection**: Polls for verification status every 5 seconds
- **Dismissible**: Optional dismiss/skip functionality
- **Custom Branding**: Full theme and message customization

## Installation

```bash
npm install @flowsta/auth-widgets
```

## Basic Usage

### Banner Mode (Recommended)

Non-intrusive banner at top of page:

```typescript
import { EmailVerificationWidget } from '@flowsta/auth-widgets';

const widget = new EmailVerificationWidget(container, {
  clientId: 'your-client-id',
  mode: 'banner',
  getAuthToken: () => localStorage.getItem('authToken'),
  onVerified: () => {
    console.log('Email verified!');
    window.location.reload();
  },
});

await widget.initialize();
// Widget auto-shows for banner/modal modes
```

### Modal Mode

Prominent center overlay:

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'your-client-id',
  mode: 'modal',
  getAuthToken: () => localStorage.getItem('authToken'),
  dismissible: true,
  onVerified: () => {
    window.location.href = '/dashboard';
  },
});

await widget.initialize();
```

### Inline Mode

Embedded in your page content:

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'your-client-id',
  mode: 'inline',
  getAuthToken: () => localStorage.getItem('authToken'),
});

await widget.initialize();
widget.show(); // Must explicitly show for inline mode
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
| `mode` | `'banner' \| 'modal' \| 'inline'` | `'banner'` | Display mode for the widget |
| `dismissible` | `boolean` | `true` | Allow users to dismiss/close the widget |
| `resendCooldown` | `number` | `60` | Seconds before allowing another resend |
| `autoCheckInterval` | `boolean` | `true` | Auto-poll for verification status |
| `apiUrl` | `string` | `'https://api.flowsta.com'` | API base URL |
| `debug` | `boolean` | `false` | Enable debug logging |
| `branding` | `BrandingOptions` | - | Customize colors and branding |
| `theme` | `Theme` | - | Full theme customization |
| `customMessages` | `object` | - | Override default text messages |

### Custom Messages

```typescript
interface CustomMessages {
  title?: string;        // Main title
  description?: string;  // Description text
}
```

### Callbacks

| Callback | Parameters | Description |
|----------|------------|-------------|
| `onVerified` | `()` | Called when email is verified |
| `onResend` | `()` | Called when resend is triggered |
| `onDismiss` | `()` | Called when user dismisses the widget |
| `onError` | `(error: WidgetError)` | Called when an error occurs |

## Display Modes

### Banner Mode

**Best for**: Non-intrusive prompts, dashboard headers

**Features**:
- Fixed position at top of page
- Gradient background (warning colors)
- Inline actions (resend + close)
- Auto-shows on initialization
- Mobile responsive

**When to use**:
- User is actively using your app
- Don't want to block the user
- Dashboard or app header

### Modal Mode

**Best for**: Prominent prompts, onboarding flows

**Features**:
- Center overlay with backdrop
- Larger, more prominent
- Detailed explanation
- Primary CTA (resend button)
- Optional dismiss button

**When to use**:
- After user registration
- Critical verification needed
- Onboarding process

### Inline Mode

**Best for**: Settings pages, profile pages

**Features**:
- Embedded in page content
- Card-style design
- Status indicator
- Must explicitly call `show()`

**When to use**:
- Settings/profile page
- Account status section
- Non-urgent reminder

## Examples

### Banner with Custom Colors

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'banner',
  getAuthToken: () => localStorage.getItem('token'),
  branding: {
    companyName: 'Acme Corp',
    brandingColor: '#FF6B35',
  },
});

await widget.initialize();
```

### Modal with Custom Messages

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'modal',
  getAuthToken: () => localStorage.getItem('token'),
  customMessages: {
    title: 'Verify Your Email Address',
    description: 'We need to confirm your email before you can access premium features.',
  },
  onVerified: async () => {
    await refreshUserData();
    showSuccessToast('Email verified!');
  },
});

await widget.initialize();
```

### Inline with Faster Cooldown

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'inline',
  getAuthToken: () => localStorage.getItem('token'),
  resendCooldown: 30, // 30 seconds instead of 60
});

await widget.initialize();
widget.show();
```

### Non-Dismissible Modal

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'modal',
  getAuthToken: () => localStorage.getItem('token'),
  dismissible: false, // User must verify
});

await widget.initialize();
```

### With All Callbacks

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'banner',
  getAuthToken: () => localStorage.getItem('token'),
  onVerified: () => {
    console.log('✅ Email verified!');
    analytics.track('email_verified');
    window.location.reload();
  },
  onResend: () => {
    console.log('📧 Resent verification email');
    analytics.track('email_resent');
  },
  onDismiss: () => {
    console.log('⚠️ User dismissed verification');
    analytics.track('email_verification_dismissed');
    showReminderBanner();
  },
  onError: (error) => {
    console.error('❌ Error:', error);
    showErrorToast(error.message);
  },
});

await widget.initialize();
```

### Without Auto-Polling

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'inline',
  getAuthToken: () => localStorage.getItem('token'),
  autoCheckInterval: false, // Don't auto-check
});

await widget.initialize();
widget.show();
```

## Resend Functionality

### How It Works

1. User clicks "Resend Email" button
2. API call to `/auth/resend-verification`
3. Button shows countdown timer (e.g., "Resend in 60s")
4. After cooldown, button re-enables
5. Success toast notification appears

### Customizing Cooldown

```typescript
// Default: 60 seconds
resendCooldown: 60

// Faster: 30 seconds
resendCooldown: 30

// Slower: 120 seconds (2 minutes)
resendCooldown: 120
```

### Tracking Resends

```typescript
onResend: () => {
  // Track resend event
  analytics.track('email_verification_resent', {
    timestamp: new Date().toISOString(),
    userEmail: currentUser.email,
  });
  
  // Show custom notification
  showNotification('Verification email sent!');
}
```

## Auto-Verification Polling

### How It Works

By default, the widget checks for verification status every 5 seconds:

```typescript
// Enabled by default
autoCheckInterval: true

// Disable if needed
autoCheckInterval: false
```

### What Happens When Verified

1. Polling detects verification
2. `onVerified` callback fires
3. Widget transitions to success state
4. Widget auto-hides after 2 seconds
5. Polling stops

### Manual Verification Check

```typescript
// Check verification status manually
await widget.checkVerificationStatus();
```

## Methods

### `initialize()`

Initialize the widget and check current verification status.

```typescript
await widget.initialize();
```

### `show()`

Show the widget. Required for inline mode, automatic for banner/modal.

```typescript
widget.show();
```

### `hide()`

Hide the widget without destroying it.

```typescript
widget.hide();
```

### `destroy()`

Destroy the widget, stop polling, and clean up timers.

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

Listen to widget events:

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

The widget uses Shadow DOM and comes with beautiful default styling for each mode.

**Banner Mode**:
- Gradient orange/amber background
- White text
- Fixed to top of viewport
- Slide-down animation

**Modal Mode**:
- Dark card on blurred backdrop
- Large email icon
- Centered content
- Slide-up animation

**Inline Mode**:
- Card with border
- Email icon + status indicator
- Warning-colored status

### Custom Theming

Customize colors and styling:

```typescript
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'banner',
  getAuthToken: () => localStorage.getItem('token'),
  theme: {
    colors: {
      primary: '#6366f1',
      warning: '#f59e0b',
      success: '#10b981',
      background: '#1f2937',
      text: '#f9fafb',
    },
  },
});
```

### Quick Branding

For simple color customization:

```typescript
branding: {
  brandingColor: '#FF6B35', // Your brand color
  companyName: 'Acme Corp',
}
```

## Integration Patterns

### After Registration

```typescript
// Register user
const user = await registerUser(email, password);

// Show email verification
const widget = new EmailVerificationWidget(container, {
  clientId: 'abc123',
  mode: 'modal',
  getAuthToken: () => user.token,
  dismissible: false, // Must verify
  onVerified: () => {
    window.location.href = '/onboarding/step-2';
  },
});

await widget.initialize();
```

### On Dashboard Load

```typescript
// Check if email is verified
if (!currentUser.emailVerified) {
  const widget = new EmailVerificationWidget(bannerContainer, {
    clientId: 'abc123',
    mode: 'banner',
    getAuthToken: () => localStorage.getItem('token'),
    dismissible: true,
    onVerified: () => {
      // Refresh user data
      location.reload();
    },
    onDismiss: () => {
      // Set reminder to show again in 24 hours
      localStorage.setItem('emailVerificationDismissed', Date.now());
    },
  });

  await widget.initialize();
}
```

### In Settings Page

```typescript
// Settings page - show inline
const statusContainer = document.getElementById('email-status');

const widget = new EmailVerificationWidget(statusContainer, {
  clientId: 'abc123',
  mode: 'inline',
  getAuthToken: () => localStorage.getItem('token'),
  resendCooldown: 30,
  onVerified: () => {
    showSuccessMessage('Email verified!');
    refreshAccountStatus();
  },
});

await widget.initialize();
widget.show();
```

## Troubleshooting

### Widget doesn't show

**Banner/Modal modes**:
- These auto-show if email is not verified
- Check that `emailVerified` is `false` in API response

**Inline mode**:
- Must explicitly call `widget.show()`

```typescript
await widget.initialize();
widget.show(); // Required for inline mode
```

### Resend button disabled

- Check cooldown period hasn't expired
- Default cooldown is 60 seconds
- Button shows "Resend in Xs" during cooldown

### Email not received

Common issues:
1. Check spam/junk folder
2. Verify email address is correct
3. Check email service is working
4. Try resend after cooldown

### Polling not working

```typescript
// Ensure auto-check is enabled
autoCheckInterval: true

// Check browser console for API errors
debug: true
```

### "Not authenticated" error

- Verify `getAuthToken` returns valid JWT
- Check token hasn't expired
- Ensure user is logged in

## Security

### Best Practices

1. **Use HTTPS**: Always serve over HTTPS
2. **Secure Tokens**: Store JWT tokens securely
3. **Rate Limiting**: API should rate-limit resend requests
4. **Email Validation**: Validate email format client-side
5. **Token Expiration**: Use short-lived verification tokens

### What the Widget Protects

- ✅ All API calls authenticated with JWT
- ✅ XSS protection via Shadow DOM
- ✅ Client ID validation
- ✅ Origin checking
- ✅ Resend rate limiting (cooldown)

## API Endpoints

The widget uses these endpoints:

### GET `/auth/verify-email-status`

Check current verification status.

**Response**:
```json
{
  "emailVerified": boolean,
  "email": string
}
```

### POST `/auth/resend-verification`

Resend verification email.

**Response**:
```json
{
  "success": true
}
```

## Performance

- **Bundle Size**: ~15KB gzipped
- **Initial Load**: < 100ms
- **Polling Impact**: Minimal (5s intervals)
- **Memory Usage**: < 1MB
- **No External Dependencies**: Self-contained

## Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Mobile: ✅ iOS Safari, Chrome Android

## Support

- **Documentation**: https://docs.flowsta.com
- **API Reference**: https://docs.flowsta.com/api
- **Developer Dashboard**: https://dev.flowsta.com
- **Support**: support@flowsta.com

## License

MIT License - see LICENSE file for details

