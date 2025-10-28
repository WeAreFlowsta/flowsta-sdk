# @flowsta/auth-widgets

Embeddable authentication widgets for Flowsta Auth. Provides white-labeled UI components for recovery phrase setup, email verification, and account recovery that can be embedded directly into partner sites.

**Status:** 🔵 Phase 2.1 - Foundation Complete  
**Version:** 0.1.0 (Alpha)  
**Next Phase:** Recovery Phrase Widget (Week 3-4)

---

## 🎯 Features

- **Shadow DOM Isolation**: Widgets render in Shadow DOM for complete style isolation
- **Zero Dependencies**: Only requires `@flowsta/auth-sdk` and `dompurify`
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Themeable**: Customizable colors, typography, and spacing
- **Lightweight**: < 50KB gzipped target
- **Framework Agnostic**: Works with vanilla JS, React, Vue, Angular, etc.

---

## 📦 Installation

```bash
npm install @flowsta/auth-widgets
```

---

## 🚀 Quick Start

```typescript
import { RecoveryPhraseWidget } from '@flowsta/auth-widgets';

// Initialize widget
const widget = new RecoveryPhraseWidget(
  document.getElementById('widget-container'),
  {
    clientId: 'your-client-id',
    brandingColor: '#FF6B35',
    companyName: 'Acme Corp',
    getAuthToken: () => localStorage.getItem('auth_token'),
    onComplete: () => {
      console.log('✅ Recovery phrase set up!');
      window.location.href = '/dashboard';
    },
  }
);

// Show widget
widget.show();
```

---

## 📚 Documentation

Full documentation available at: https://flowsta.com/docs/widgets

- [Getting Started](./docs/GETTING_STARTED.md)
- [Widget Reference](./docs/WIDGETS_REFERENCE.md)
- [Theming Guide](./docs/THEMING.md)
- [Examples](./docs/EXAMPLES.md)
- [Security](./docs/SECURITY.md)

---

## 🎨 Available Widgets

### Recovery Phrase Widget (Phase 2.2 - Week 3-4)

Guides users through recovery phrase setup and verification.

```typescript
import { RecoveryPhraseWidget } from '@flowsta/auth-widgets';

const widget = new RecoveryPhraseWidget(container, {
  clientId: 'your-client-id',
  brandingColor: '#FF6B35',
  allowDismiss: true,
  onComplete: (verified) => console.log('Setup complete', verified),
});
```

### Email Verification Widget (Phase 2.3 - Week 5)

Prompts users to verify their email address.

```typescript
import { EmailVerificationWidget } from '@flowsta/auth-widgets';

const widget = new EmailVerificationWidget(container, {
  clientId: 'your-client-id',
  mode: 'banner', // or 'modal' or 'inline'
  onVerified: () => console.log('Email verified!'),
});
```

### Account Recovery Widget (Phase 2.4 - Week 6-7)

Helps users recover accounts using recovery phrase.

```typescript
import { AccountRecoveryWidget } from '@flowsta/auth-widgets';

const widget = new AccountRecoveryWidget(container, {
  clientId: 'your-client-id',
  email: 'user@example.com',
  onRecoveryComplete: (success) => console.log('Recovery', success),
});
```

### Security Dashboard Widget (Phase 2.4 - Week 6-7)

Displays account security status and quick actions.

```typescript
import { SecurityDashboardWidget } from '@flowsta/auth-widgets';

const widget = new SecurityDashboardWidget(container, {
  clientId: 'your-client-id',
  showRecoveryPhrase: true,
  showEmailVerification: true,
});
```

---

## 🎨 Theming

Customize widget appearance with themes:

```typescript
import { RecoveryPhraseWidget, DEFAULT_DARK_THEME } from '@flowsta/auth-widgets';

const widget = new RecoveryPhraseWidget(container, {
  clientId: 'your-client-id',
  theme: {
    ...DEFAULT_DARK_THEME,
    colors: {
      ...DEFAULT_DARK_THEME.colors,
      primary: '#FF6B35', // Your brand color
    },
  },
});
```

Or use simplified branding:

```typescript
const widget = new RecoveryPhraseWidget(container, {
  clientId: 'your-client-id',
  branding: {
    brandingColor: '#FF6B35',
    companyName: 'Acme Corp',
    logoUrl: 'https://acme.com/logo.png',
  },
});
```

---

## 🔐 Security

- **CORS Validation**: API validates partner origins
- **Client ID Required**: Every request includes validated client ID
- **JWT Authentication**: Uses existing user tokens
- **Input Sanitization**: All user input sanitized with DOMPurify
- **CSP Compatible**: Works with strict Content Security Policy

---

## 🧪 Browser Support

- Chrome 63+
- Firefox 63+
- Safari 11.1+
- Edge 79+

Requires Shadow DOM and Custom Events support.

---

## 📊 Bundle Size

- Core (gzipped): ~25KB
- With all widgets (gzipped): ~45KB
- Target: < 50KB gzipped

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run e2e tests
npm run test:e2e
```

---

## 📝 Current Status

### ✅ Phase 2.1 Complete (Foundation)
- [x] Package structure
- [x] TypeScript configuration
- [x] Vite build pipeline
- [x] Base `FlowstaWidget` class
- [x] Shadow DOM utilities
- [x] Event system
- [x] Theming system
- [x] Sanitization utilities
- [x] Base CSS styles

### 🔜 Next: Phase 2.2 (Recovery Phrase Widget)
- [ ] Implement `RecoveryPhraseWidget`
- [ ] 5-step verification flow
- [ ] API integration
- [ ] Comprehensive tests
- [ ] Documentation

---

## 📞 Support

- **Documentation**: https://flowsta.com/docs/widgets
- **GitHub Issues**: https://github.com/WeAreFlowsta/FlowstaAuth/issues
- **Discord**: https://discord.gg/flowsta #widget-support
- **Email**: support@flowsta.com

---

## 📄 License

MIT © Flowsta

---

## 🎉 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

---

**Built with ❤️ by the Flowsta team**

