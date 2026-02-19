# Accessibility Standards

> Accessibility guidelines for DigiStratum applications.
> Target: WCAG 2.1 AA compliance. No user left behind.

---

## Quick Reference

| Requirement | Standard | Status |
|-------------|----------|--------|
| NFR-A11Y-001 | WCAG 2.1 AA compliance | 📋 Defined |
| NFR-A11Y-002 | Semantic HTML structure | 📋 Defined |
| NFR-A11Y-003 | Keyboard navigation support | 📋 Defined |
| NFR-A11Y-004 | Screen reader compatibility | 📋 Defined |

---

## WCAG 2.1 AA Compliance

WCAG 2.1 AA is our target conformance level. These four principles (POUR) guide all accessibility work.

### 1. Perceivable

Users must be able to perceive information presented.

| Criterion | ID | Requirement |
|-----------|-----|-------------|
| Text alternatives | 1.1.1 | All non-text content has text alternatives |
| Captions | 1.2.2 | Pre-recorded audio has captions |
| Audio description | 1.2.5 | Pre-recorded video has audio description |
| Info and relationships | 1.3.1 | Structure conveyed through markup, not just visually |
| Meaningful sequence | 1.3.2 | Reading order matches visual order |
| Sensory characteristics | 1.3.3 | Instructions don't rely solely on shape, size, location, or sound |
| Orientation | 1.3.4 | Content not restricted to single orientation |
| Input purpose | 1.3.5 | Input field purpose can be programmatically determined |
| Color contrast | 1.4.3 | Text has 4.5:1 contrast ratio (3:1 for large text) |
| Resize text | 1.4.4 | Text resizable to 200% without loss of functionality |
| Images of text | 1.4.5 | Text used instead of images of text |
| Reflow | 1.4.10 | Content reflows at 320px width without horizontal scroll |
| Non-text contrast | 1.4.11 | UI components have 3:1 contrast ratio |
| Text spacing | 1.4.12 | No loss of content when spacing adjusted |
| Content on hover/focus | 1.4.13 | Additional content dismissible, hoverable, persistent |

### 2. Operable

Users must be able to operate interface components.

| Criterion | ID | Requirement |
|-----------|-----|-------------|
| Keyboard accessible | 2.1.1 | All functionality available via keyboard |
| No keyboard trap | 2.1.2 | Keyboard focus can always be moved away |
| Character key shortcuts | 2.1.4 | Single-key shortcuts can be turned off or remapped |
| Timing adjustable | 2.2.1 | Time limits can be adjusted |
| Pause, stop, hide | 2.2.2 | Moving content can be paused |
| Three flashes | 2.3.1 | No content flashes more than 3x per second |
| Skip links | 2.4.1 | Skip navigation mechanism provided |
| Page titled | 2.4.2 | Pages have descriptive titles |
| Focus order | 2.4.3 | Focus order preserves meaning |
| Link purpose | 2.4.4 | Link purpose clear from text or context |
| Multiple ways | 2.4.5 | Multiple ways to locate pages |
| Headings and labels | 2.4.6 | Headings and labels describe purpose |
| Focus visible | 2.4.7 | Keyboard focus indicator visible |
| Pointer gestures | 2.5.1 | Multi-point gestures have alternatives |
| Pointer cancellation | 2.5.2 | Down-event doesn't trigger action (up-event does) |
| Label in name | 2.5.3 | Accessible name includes visible label |
| Motion actuation | 2.5.4 | Motion-triggered actions have alternatives |

### 3. Understandable

Users must be able to understand information and UI operation.

| Criterion | ID | Requirement |
|-----------|-----|-------------|
| Language of page | 3.1.1 | Page language specified |
| Language of parts | 3.1.2 | Language of passages specified |
| On focus | 3.2.1 | Focus doesn't trigger context change |
| On input | 3.2.2 | Input doesn't trigger unexpected context change |
| Consistent navigation | 3.2.3 | Navigation consistent across pages |
| Consistent identification | 3.2.4 | Same functionality identified consistently |
| Error identification | 3.3.1 | Errors identified and described |
| Labels or instructions | 3.3.2 | Input fields have labels |
| Error suggestion | 3.3.3 | Error correction suggestions provided |
| Error prevention | 3.3.4 | Legal/financial submissions reversible |

### 4. Robust

Content must be robust enough for assistive technologies.

| Criterion | ID | Requirement |
|-----------|-----|-------------|
| Parsing | 4.1.1 | Valid HTML (deprecated in 2.2, still good practice) |
| Name, role, value | 4.1.2 | Custom components expose name, role, value |
| Status messages | 4.1.3 | Status messages announced without focus |

---

## Semantic HTML Patterns

Use semantic HTML as the foundation. It's accessible by default.

### Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - App Name</title>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  
  <header role="banner">
    <nav aria-label="Main navigation">
      <!-- Primary navigation -->
    </nav>
  </header>
  
  <main id="main" tabindex="-1">
    <h1>Page Heading</h1>
    <!-- Page content -->
  </main>
  
  <aside aria-label="Related content">
    <!-- Sidebar content -->
  </aside>
  
  <footer role="contentinfo">
    <!-- Footer content -->
  </footer>
</body>
</html>
```

### Heading Hierarchy

Always maintain proper heading levels. Never skip levels for styling.

```html
<!-- ✅ Correct -->
<h1>Dashboard</h1>
  <h2>Recent Activity</h2>
    <h3>Today</h3>
    <h3>This Week</h3>
  <h2>Quick Actions</h2>

<!-- ❌ Wrong - skips h2 -->
<h1>Dashboard</h1>
  <h3>Recent Activity</h3>
```

### Interactive Elements

Use native elements whenever possible.

```html
<!-- ✅ Use native button -->
<button type="button" onClick={handleClick}>
  Click me
</button>

<!-- ❌ Avoid div buttons -->
<div onClick={handleClick} className="button">
  Click me
</div>

<!-- ✅ Use native link for navigation -->
<a href="/dashboard">Go to Dashboard</a>

<!-- ❌ Avoid onClick for navigation -->
<span onClick={() => navigate('/dashboard')}>
  Go to Dashboard
</span>
```

### Forms

```html
<form onSubmit={handleSubmit}>
  <!-- Always associate labels with inputs -->
  <div>
    <label htmlFor="email">Email address</label>
    <input 
      type="email" 
      id="email" 
      name="email"
      required
      aria-describedby="email-hint email-error"
    />
    <span id="email-hint" className="hint">
      We'll never share your email
    </span>
    <span id="email-error" className="error" role="alert">
      {errors.email}
    </span>
  </div>
  
  <!-- Group related fields -->
  <fieldset>
    <legend>Notification preferences</legend>
    <label>
      <input type="checkbox" name="email_notify" />
      Email notifications
    </label>
    <label>
      <input type="checkbox" name="sms_notify" />
      SMS notifications
    </label>
  </fieldset>
  
  <button type="submit">Save preferences</button>
</form>
```

### Tables

```html
<table>
  <caption>Monthly sales by region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North</th>
      <td>$10,000</td>
      <td>$12,000</td>
    </tr>
  </tbody>
</table>
```

### Lists

```html
<!-- Navigation lists -->
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

<!-- Definition lists for key-value pairs -->
<dl>
  <dt>Status</dt>
  <dd>Active</dd>
  <dt>Created</dt>
  <dd>January 15, 2026</dd>
</dl>
```

---

## ARIA Patterns

ARIA supplements HTML semantics. Use it when native HTML isn't sufficient.

### ARIA Rules

1. **Don't use ARIA if native HTML works** - `<button>` > `<div role="button">`
2. **Don't change native semantics** - Don't add `role="heading"` to `<h1>`
3. **Interactive elements must be keyboard accessible** - Custom widgets need keyboard handling
4. **Don't hide focusable elements** - `aria-hidden="true"` on focusable content breaks accessibility
5. **All interactive elements need accessible names** - Via content, `aria-label`, or `aria-labelledby`

### Common ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-label` | Provides accessible name | `<button aria-label="Close dialog">×</button>` |
| `aria-labelledby` | References visible label | `<div aria-labelledby="section-title">` |
| `aria-describedby` | References description | `<input aria-describedby="hint error">` |
| `aria-hidden` | Hides from assistive tech | `<span aria-hidden="true">★</span>` |
| `aria-expanded` | Indicates expandable state | `<button aria-expanded="false">Menu</button>` |
| `aria-pressed` | Toggle button state | `<button aria-pressed="true">Bold</button>` |
| `aria-selected` | Selection state | `<li role="option" aria-selected="true">` |
| `aria-current` | Current item in set | `<a aria-current="page">Dashboard</a>` |
| `aria-live` | Announces dynamic content | `<div aria-live="polite">` |
| `aria-busy` | Loading state | `<div aria-busy="true">Loading...</div>` |
| `aria-invalid` | Invalid input state | `<input aria-invalid="true">` |
| `aria-required` | Required field | `<input aria-required="true">` |

### Button Patterns

```tsx
// Icon-only button - needs aria-label
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>

// Toggle button
<button 
  aria-pressed={isBold}
  onClick={() => setIsBold(!isBold)}
>
  Bold
</button>

// Menu button
<button 
  aria-haspopup="menu"
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  Actions
</button>
```

### Modal Dialog

```tsx
function Modal({ isOpen, onClose, title, children }) {
  const titleId = useId();
  
  useEffect(() => {
    if (isOpen) {
      // Trap focus inside modal
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

### Tabs

```tsx
function Tabs({ tabs, activeIndex, onChange }) {
  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={index === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== activeIndex}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Accordion

```tsx
function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(-1);
  
  return (
    <div>
      {items.map((item, index) => (
        <div key={item.id}>
          <h3>
            <button
              aria-expanded={openIndex === index}
              aria-controls={`content-${item.id}`}
              onClick={() => setOpenIndex(
                openIndex === index ? -1 : index
              )}
            >
              {item.title}
            </button>
          </h3>
          <div
            id={`content-${item.id}`}
            hidden={openIndex !== index}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Alert and Status Messages

```tsx
// Error alert - interrupts user
<div role="alert">
  Form submission failed. Please try again.
</div>

// Status update - polite announcement
<div role="status" aria-live="polite">
  3 items selected
</div>

// Live region for dynamic updates
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>
```

### Combobox (Autocomplete)

```tsx
function Combobox({ options, value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputId = useId();
  const listboxId = useId();
  
  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} options`}
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Keyboard Navigation

All interactive elements must be keyboard accessible.

### Focus Management

```css
/* Visible focus indicator - NEVER remove outline without replacement */
:focus-visible {
  outline: 2px solid var(--ds-focus-ring);
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: var(--ds-primary);
  color: white;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next focusable element |
| `Shift + Tab` | Move focus to previous focusable element |
| `Enter` / `Space` | Activate button or link |
| `Escape` | Close modal, dropdown, or cancel action |
| `Arrow keys` | Navigate within components (menus, tabs, lists) |
| `Home` / `End` | Jump to first/last item in list |

### Focus Order

```tsx
// Manage focus programmatically when needed
function SearchResults({ results }) {
  const headingRef = useRef(null);
  
  useEffect(() => {
    // Move focus to results heading when results load
    if (results.length > 0) {
      headingRef.current?.focus();
    }
  }, [results]);
  
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1}>
        {results.length} results found
      </h2>
      {/* Results list */}
    </div>
  );
}
```

### Roving Tabindex

For composite widgets (toolbars, menus, tabs), use roving tabindex:

```tsx
function Toolbar({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const handleKeyDown = (e, index) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setActiveIndex((index + 1) % items.length);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setActiveIndex((index - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
    }
  };
  
  return (
    <div role="toolbar" aria-label="Formatting">
      {items.map((item, index) => (
        <button
          key={item.id}
          tabIndex={index === activeIndex ? 0 : -1}
          onKeyDown={e => handleKeyDown(e, index)}
          ref={el => index === activeIndex && el?.focus()}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

### Focus Trap for Modals

```tsx
import { useEffect, useRef } from 'react';

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus first element
    firstElement?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
  
  return containerRef;
}
```

---

## Screen Reader Support

Design content for screen reader users.

### Visually Hidden Content

```css
/* Screen reader only - visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip to focusable - revealed on focus */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### Announcement Patterns

```tsx
// Live region for dynamic announcements
function useAnnounce() {
  const [message, setMessage] = useState('');
  
  const announce = useCallback((text: string) => {
    setMessage('');
    // Small delay ensures screen reader picks up the change
    setTimeout(() => setMessage(text), 100);
  }, []);
  
  const Announcer = () => (
    <div 
      role="status" 
      aria-live="polite" 
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
  
  return { announce, Announcer };
}

// Usage
function SearchForm() {
  const { announce, Announcer } = useAnnounce();
  
  const handleSearch = async (query) => {
    const results = await search(query);
    announce(`${results.length} results found`);
  };
  
  return (
    <>
      <Announcer />
      {/* Form content */}
    </>
  );
}
```

### Image Alternatives

```tsx
// Decorative image - hide from screen readers
<img src="decoration.svg" alt="" aria-hidden="true" />

// Informative image - describe content
<img src="chart.png" alt="Sales increased 25% from Q1 to Q2" />

// Complex image - provide detailed description
<figure>
  <img 
    src="org-chart.png" 
    alt="Organization chart"
    aria-describedby="org-chart-desc"
  />
  <figcaption id="org-chart-desc">
    Organization structure showing CEO at top, 
    with three VPs reporting: VP Engineering (5 teams), 
    VP Sales (3 teams), VP Operations (2 teams).
  </figcaption>
</figure>

// Icon with text - hide redundant icon
<button>
  <SaveIcon aria-hidden="true" />
  Save document
</button>

// Icon only - provide label
<button aria-label="Save document">
  <SaveIcon aria-hidden="true" />
</button>
```

### Link Context

```tsx
// ❌ Avoid ambiguous links
<a href="/report">Read more</a>
<a href="/settings">Click here</a>

// ✅ Descriptive links
<a href="/report">Read the full quarterly report</a>
<a href="/settings">Account settings</a>

// ✅ Or add hidden context
<a href="/report">
  Read more<span className="sr-only"> about quarterly report</span>
</a>
```

### Form Errors

```tsx
function FormField({ label, error, hint, ...inputProps }) {
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  
  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={`${hint ? hintId : ''} ${error ? errorId : ''}`.trim() || undefined}
        {...inputProps}
      />
      
      {error && (
        <span id={errorId} role="alert" className="error">
          {error}
        </span>
      )}
    </div>
  );
}
```

---

## Testing Tools

### Automated Testing

| Tool | Type | Use Case |
|------|------|----------|
| **axe-core** | Library | Integration tests, CI/CD |
| **@axe-core/react** | React | Development-time warnings |
| **eslint-plugin-jsx-a11y** | ESLint | Static analysis in IDE |
| **Lighthouse** | Browser | Manual audits, CI via CLI |
| **Pa11y** | CLI | CI/CD pipeline testing |
| **WAVE** | Browser extension | Manual audits |

### Setup: axe-core with Vitest

```ts
// vitest.setup.ts
import { configureAxe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Configure axe for your needs
export const axe = configureAxe({
  rules: {
    // Disable rules that don't apply
    'region': { enabled: false }, // If using landmarks differently
  },
});
```

```tsx
// Component.test.tsx
import { render } from '@testing-library/react';
import { axe } from '../vitest.setup';
import { MyComponent } from './MyComponent';

describe('MyComponent accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Setup: eslint-plugin-jsx-a11y

```json
// .eslintrc.json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/anchor-is-valid": ["error", {
      "components": ["Link"],
      "specialLink": ["to"]
    }]
  }
}
```

### Setup: @axe-core/react (Development)

```tsx
// main.tsx (development only)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Manual Testing Checklist

Run these checks before each release:

#### Keyboard Navigation

- [ ] All interactive elements reachable via Tab
- [ ] Focus order matches visual order
- [ ] Focus indicator visible on all elements
- [ ] No keyboard traps
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys work in composite widgets

#### Screen Reader

- [ ] Page title announced on load
- [ ] Headings create logical outline
- [ ] Images have appropriate alt text
- [ ] Forms have proper labels
- [ ] Error messages announced
- [ ] Dynamic content announced via live regions

#### Visual

- [ ] Color contrast passes (4.5:1 for text)
- [ ] Content readable at 200% zoom
- [ ] No horizontal scroll at 320px width
- [ ] Focus indicator visible
- [ ] Not relying on color alone for meaning

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - run: npm ci
      - run: npm run build
      
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/dashboard
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

```json
// lighthouse-budget.json
[
  {
    "path": "/*",
    "options": {
      "preset": "desktop"
    },
    "assertions": {
      "categories:accessibility": ["error", { "minScore": 0.9 }],
      "categories:best-practices": ["warn", { "minScore": 0.9 }]
    }
  }
]
```

---

## Component Checklist

Use this checklist when building components:

### Interactive Components

- [ ] Uses semantic HTML element (button, a, input)
- [ ] Has accessible name (visible text, aria-label, or aria-labelledby)
- [ ] Keyboard accessible (Tab, Enter, Space, Escape as appropriate)
- [ ] Focus indicator visible
- [ ] State communicated (aria-expanded, aria-pressed, aria-selected)
- [ ] Disabled state communicated (disabled attribute or aria-disabled)

### Forms

- [ ] All inputs have associated labels
- [ ] Required fields indicated (required attribute + visual)
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Error messages use role="alert" for immediate announcement
- [ ] Fieldset/legend for related inputs
- [ ] Autocomplete attributes for common fields

### Images & Icons

- [ ] Informative images have descriptive alt text
- [ ] Decorative images have empty alt or aria-hidden
- [ ] Icons with text have aria-hidden on icon
- [ ] Icon-only buttons have aria-label

### Dynamic Content

- [ ] Loading states communicated (aria-busy, status message)
- [ ] Content changes announced (aria-live regions)
- [ ] Focus managed after content changes
- [ ] No content flashing more than 3x/second

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)
- [Deque University](https://dequeuniversity.com/)
