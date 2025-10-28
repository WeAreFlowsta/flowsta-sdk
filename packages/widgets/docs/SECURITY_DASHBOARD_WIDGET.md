# Security Dashboard Widget

The Security Dashboard Widget provides users with a comprehensive overview of their account security status. It displays security indicators, calculates a security score, and offers quick actions to improve account security.

## Features

- ✅ **Security Score**: Visual indicator of overall account security (0-100)
- ✅ **Recovery Phrase Status**: Shows if recovery phrase is set up and verified
- ✅ **Email Verification Status**: Displays email verification state
- ✅ **Password Age**: Shows when password was last changed
- ✅ **Quick Actions**: One-click buttons to improve security
- ✅ **Auto-Refresh**: Optionally auto-refresh status at intervals
- ✅ **Customizable Display**: Show/hide specific security features
- ✅ **Event Callbacks**: React to user actions
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **Shadow DOM Isolation**: Styles don't conflict with host page

## Installation

```bash
npm install @flowsta/auth-widgets
```

## Basic Usage

```typescript
import { SecurityDashboardWidget } from '@flowsta/auth-widgets';

// Create widget
const widget = new SecurityDashboardWidget(
  document.getElementById('security-container'),
  {
    clientId: 'your-client-id',
    apiUrl: 'https://api.flowsta.com',
    getAuthToken: () => localStorage.getItem('auth_token'),
    
    // Callbacks for quick actions
    onSetupRecoveryPhrase: () => {
      // Show recovery phrase setup modal
      recoveryPhraseModal.show();
    },
    onVerifyEmail: () => {
      // Show email verification prompt
      emailVerificationModal.show();
    },
    onPasswordChange: () => {
      // Navigate to password change page
      window.location.href = '/account/change-password';
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
interface SecurityDashboardWidgetOptions {
  // Required
  clientId: string;                      // Your Flowsta client ID
  getAuthToken: () => string | null | Promise<string | null>;
  
  // Optional
  apiUrl?: string;                       // API base URL
  
  // Display Options
  showRecoveryPhrase?: boolean;          // Show recovery phrase status (default: true)
  showEmailVerification?: boolean;       // Show email verification status (default: true)
  showPasswordChange?: boolean;          // Show password change option (default: true)
  showSecurityScore?: boolean;           // Show overall security score (default: true)
  
  // Auto-refresh
  autoRefresh?: boolean;                 // Auto-refresh status (default: false)
  refreshInterval?: number;              // Refresh interval in ms (default: 60000)
  
  // Styling
  theme?: Theme;                         // Full theme customization
  branding?: BrandingOptions;            // Simple branding (colors, logo)
  
  // Callbacks
  onSetupRecoveryPhrase?: () => void;
  onVerifyEmail?: () => void;
  onPasswordChange?: () => void;
  onStatusChange?: (status: SecurityStatus) => void;
  onError?: (error: WidgetError) => void;
  
  // Messages
  messages?: SecurityDashboardMessages;
  
  // Behavior
  autoShow?: boolean;                    // Show immediately after init (default: false)
  debug?: boolean;                       // Enable debug logging
}
```

### Security Status

```typescript
interface SecurityStatus {
  recoveryPhrase: {
    active: boolean;
    verified: boolean;
    setupDate: string | null;
  };
  email: {
    verified: boolean;
    email: string;
  };
  password: {
    lastChanged: string;
    age: number; // days since last change
  };
  securityScore: number; // 0-100
  accountCreated: string;
}
```

## Security Score Calculation

The security score is calculated based on multiple factors:

- **Recovery Phrase Active**: +40 points
- **Recovery Phrase Verified**: +10 points
- **Email Verified**: +30 points
- **Recent Password Change**:
  - Within 3 months: +20 points
  - Within 6 months: +15 points
  - Within 1 year: +10 points
  - Older than 1 year: +5 points

**Maximum Score**: 100 points

## Advanced Usage

### Selective Display

Show only specific security features:

```typescript
const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => getToken(),
  
  // Only show recovery phrase and email verification
  showRecoveryPhrase: true,
  showEmailVerification: true,
  showPasswordChange: false,
  showSecurityScore: false,
});
```

### Auto-Refresh

Keep the security status up-to-date automatically:

```typescript
const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => getToken(),
  
  // Refresh every 30 seconds
  autoRefresh: true,
  refreshInterval: 30000,
});
```

### Status Change Tracking

React to security status changes:

```typescript
const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => getToken(),
  
  onStatusChange: (status) => {
    console.log('Security score:', status.securityScore);
    
    if (status.securityScore < 50) {
      showWarningBanner('Your account security is weak. Please improve it.');
    }
    
    // Track analytics
    analytics.track('Security Status Updated', {
      score: status.securityScore,
      recoveryPhraseActive: status.recoveryPhrase.active,
      emailVerified: status.email.verified,
    });
  },
});
```

### Custom Messages

Override default text for your brand:

```typescript
const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => getToken(),
  
  messages: {
    title: 'Account Security',
    securityScoreLabel: 'Your Security Score',
    recoveryPhraseActive: '✅ Recovery Phrase Active',
    recoveryPhraseInactive: '❌ No Recovery Phrase',
    emailVerified: '✅ Email Verified',
    emailUnverified: '❌ Email Not Verified',
    passwordChangedRecently: '✅ Password Updated Recently',
    passwordOld: '⚠️ Password is old',
    setupRecoveryPhraseButton: 'Set Up Recovery Phrase',
    verifyEmailButton: 'Verify Email',
    changePasswordButton: 'Change Password',
  },
});
```

### Integrating with Modals

Trigger your own modals for security actions:

```typescript
const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => getToken(),
  
  onSetupRecoveryPhrase: () => {
    // Show your recovery phrase setup widget/modal
    const recoveryWidget = new RecoveryPhraseWidget(
      document.getElementById('recovery-modal'),
      {
        clientId: 'your-client-id',
        getAuthToken: () => getToken(),
        onComplete: () => {
          // Refresh security dashboard after setup
          widget.refresh();
        },
      }
    );
    recoveryWidget.initialize().then(() => recoveryWidget.show());
  },
  
  onVerifyEmail: () => {
    // Show your email verification widget/modal
    const emailWidget = new EmailVerificationWidget(
      document.getElementById('email-modal'),
      {
        clientId: 'your-client-id',
        getAuthToken: () => getToken(),
        onVerified: () => {
          // Refresh security dashboard after verification
          widget.refresh();
        },
      }
    );
    emailWidget.initialize().then(() => emailWidget.show());
  },
  
  onPasswordChange: () => {
    // Navigate to password change page
    window.location.href = '/account/password';
  },
});
```

## Methods

### `initialize(): Promise<void>`

Initialize the widget, validate client ID, and fetch security status.

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

Remove the widget from the DOM, clear auto-refresh intervals, and clean up resources.

```typescript
widget.destroy();
```

### `refresh(): Promise<void>`

Manually refresh the security status.

```typescript
await widget.refresh();
```

### `getState(): WidgetState`

Get the current widget state.

```typescript
const state = widget.getState();
console.log(state); // 'idle' | 'loading' | 'ready' | 'error'
```

## Events

The widget emits custom events that you can listen to:

### `flowsta:status-change`

Fired when security status is updated:

```typescript
container.addEventListener('flowsta:status-change', (event) => {
  console.log('Security status updated:', event.detail.status);
});
```

### `flowsta:error`

Fired when an error occurs:

```typescript
container.addEventListener('flowsta:error', (event) => {
  console.error('Error:', event.detail.error);
});
```

## Styling

### Using Branding Options (Simple)

```typescript
const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  getAuthToken: () => getToken(),
  branding: {
    primaryColor: '#6366f1',
    logo: 'https://example.com/logo.png',
    fontFamily: 'Inter, sans-serif',
  },
});
```

### Custom CSS (Advanced)

The widget uses Shadow DOM but exposes CSS custom properties for styling:

```css
flowsta-security-dashboard {
  --flowsta-primary-color: #6366f1;
  --flowsta-success-color: #10b981;
  --flowsta-warning-color: #f59e0b;
  --flowsta-error-color: #ef4444;
  --flowsta-background-color: #ffffff;
  --flowsta-text-color: #111827;
  --flowsta-border-radius: 0.5rem;
  --flowsta-font-family: 'Inter', sans-serif;
}
```

## Examples

### React Integration

```tsx
import { useEffect, useRef, useState } from 'react';
import { SecurityDashboardWidget } from '@flowsta/auth-widgets';

function SecurityDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<SecurityDashboardWidget | null>(null);
  const [securityScore, setSecurityScore] = useState<number>(0);

  useEffect(() => {
    if (containerRef.current && !widgetRef.current) {
      const widget = new SecurityDashboardWidget(containerRef.current, {
        clientId: 'your-client-id',
        getAuthToken: () => localStorage.getItem('auth_token'),
        autoRefresh: true,
        onStatusChange: (status) => {
          setSecurityScore(status.securityScore);
        },
        onSetupRecoveryPhrase: () => {
          // Handle recovery phrase setup
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

  return (
    <div>
      <h2>Your Security Score: {securityScore}/100</h2>
      <div ref={containerRef} />
    </div>
  );
}
```

### Vue Integration

```vue
<template>
  <div>
    <h2>Your Security Score: {{ securityScore }}/100</h2>
    <div ref="container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { SecurityDashboardWidget } from '@flowsta/auth-widgets';

const container = ref(null);
const securityScore = ref(0);
let widget = null;

onMounted(async () => {
  widget = new SecurityDashboardWidget(container.value, {
    clientId: 'your-client-id',
    getAuthToken: () => localStorage.getItem('auth_token'),
    autoRefresh: true,
    onStatusChange: (status) => {
      securityScore.value = status.securityScore;
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

### Full Dashboard Example

```typescript
// Create a complete security dashboard with all widgets
import { 
  SecurityDashboardWidget,
  RecoveryPhraseWidget,
  EmailVerificationWidget
} from '@flowsta/auth-widgets';

// Main security dashboard
const dashboard = new SecurityDashboardWidget(
  document.getElementById('security-dashboard'),
  {
    clientId: 'your-client-id',
    getAuthToken: () => localStorage.getItem('auth_token'),
    autoRefresh: true,
    refreshInterval: 60000,
    
    onSetupRecoveryPhrase: () => {
      const recovery = new RecoveryPhraseWidget(
        document.getElementById('modal-container'),
        {
          clientId: 'your-client-id',
          getAuthToken: () => localStorage.getItem('auth_token'),
          onComplete: async () => {
            recovery.hide();
            await dashboard.refresh(); // Refresh dashboard
          },
        }
      );
      recovery.initialize().then(() => recovery.show());
    },
    
    onVerifyEmail: () => {
      const email = new EmailVerificationWidget(
        document.getElementById('modal-container'),
        {
          clientId: 'your-client-id',
          getAuthToken: () => localStorage.getItem('auth_token'),
          displayMode: 'modal',
          onVerified: async () => {
            email.hide();
            await dashboard.refresh(); // Refresh dashboard
          },
        }
      );
      email.initialize().then(() => email.show());
    },
    
    onPasswordChange: () => {
      window.location.href = '/account/password';
    },
  }
);

await dashboard.initialize();
dashboard.show();
```

## Security

- Requires authentication token to fetch security status
- All API communication happens over HTTPS
- Token is never stored, only retrieved via callback function
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
- Verify authentication token is valid
- Call `show()` to display the widget

### Security status not loading

- Verify authentication token is being returned correctly
- Check network connectivity
- Ensure the API URL is correct (if using custom API)
- Check browser console for detailed error messages

### Auto-refresh not working

- Verify `autoRefresh` is set to `true`
- Check `refreshInterval` value (must be > 0)
- Ensure authentication token remains valid

## Support

- Documentation: https://docs.flowsta.com
- API Reference: https://api.flowsta.com/docs
- Support: support@flowsta.com

## License

MIT License - see LICENSE file for details

