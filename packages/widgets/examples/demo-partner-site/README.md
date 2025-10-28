# Development Sandbox

A simple demo partner site for testing Flowsta Auth widgets locally.

## 🚀 Quick Start

### Option 1: Using Vite Dev Server (Recommended)

From the widgets package directory:

```bash
npm run dev
```

Then open http://localhost:5173/examples/demo-partner-site/

### Option 2: Serve Directly

Using any static file server:

```bash
# Using Python
cd examples/demo-partner-site
python3 -m http.server 8000

# Using Node.js (http-server)
npx http-server examples/demo-partner-site -p 8000

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000

## 📋 What's Included

- **Simple Partner Site UI**: Mimics a partner website integrating Flowsta widgets
- **Widget Preview Area**: Container for testing widgets
- **System Status**: Shows current configuration and status
- **Widget Cards**: Buttons to launch each widget type

## 🎨 Current Status (Phase 2.1)

**Foundation Complete** ✅

The following are ready:
- Package infrastructure
- Base widget class
- UI components (Button, Input, Checkbox, Card, Modal)
- Theme system
- Testing infrastructure

**Widgets Coming Soon:**

- **Phase 2.2 (Week 3-4)**: Recovery Phrase Widget 🔐
- **Phase 2.3 (Week 5)**: Email Verification Widget ✉️
- **Phase 2.4 (Week 6-7)**: Account Recovery Widget 🔑
- **Phase 2.4 (Week 6-7)**: Security Dashboard Widget 🛡️

## 🔧 Development

Once widgets are built (Phase 2.2+), update the script section in `index.html` to import and initialize widgets:

```javascript
import { RecoveryPhraseWidget } from '../../dist/index.esm.js';

window.showRecoveryPhraseWidget = () => {
  const container = document.getElementById('widget-mount');
  container.innerHTML = '';
  
  const widget = new RecoveryPhraseWidget(container, {
    clientId: 'demo-client-id',
    brandingColor: '#667eea',
    companyName: 'Demo Partner Site',
    getAuthToken: () => 'demo-token',
    onComplete: () => {
      console.log('✅ Recovery phrase setup complete!');
    },
    onDismiss: () => {
      console.log('⚠️ User dismissed recovery phrase setup');
    }
  });
  
  widget.show();
};
```

## 📦 Testing Different Configurations

You can test different configurations by modifying the widget options:

### Theme Colors
```javascript
{
  brandingColor: '#FF6B35', // Your brand color
  companyName: 'Acme Corp',
}
```

### Full Theme
```javascript
{
  theme: {
    colors: {
      primary: '#FF6B35',
      background: '#1f2937',
      text: '#f9fafb',
    },
  },
}
```

### Different Display Modes (Email Verification)
```javascript
{
  mode: 'banner', // or 'modal' or 'inline'
}
```

## 🧪 Testing Checklist

Once widgets are available, test:

- [ ] Widget renders correctly
- [ ] Theme customization works
- [ ] Shadow DOM isolation (styles don't leak)
- [ ] Event handlers fire correctly
- [ ] API calls work (with mock data)
- [ ] Error states display properly
- [ ] Loading states work
- [ ] Responsive on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## 📝 Notes

- This is a development sandbox - not for production use
- Replace `demo-client-id` with real client ID for production testing
- Update API URL in production (`https://api.flowsta.com`)
- Test with real auth tokens for integration testing

## 🔗 Related Documentation

- [Widget Package README](../../README.md)
- [Technical Specification](../../../build-docs/planning/PARTNER_WIDGET_SDK_SPEC.md)
- [Phase 2 Kickoff](../../../build-docs/current/PHASE_2_PARTNER_WIDGETS_KICKOFF.md)

