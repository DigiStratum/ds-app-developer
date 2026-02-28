# ContentContainer Component

The `ContentContainer` is the main content area where apps mount their UI. It provides a consistent "mount your app here" pattern with built-in support for loading states, error handling, breadcrumb navigation, and scrollable content areas.

## Installation

```typescript
import { ContentContainer } from '@digistratum/layout';
```

## Basic Usage

```tsx
import { ContentContainer } from '@digistratum/layout';

function MyPage() {
  return (
    <ContentContainer>
      <h1>My App Content</h1>
      <p>Mount your app UI here</p>
    </ContentContainer>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | The app content to render |
| `loading` | `LoadingConfig` | - | Loading state configuration |
| `error` | `ErrorConfig` | - | Error state configuration |
| `breadcrumbs` | `BreadcrumbConfig` | - | Breadcrumb navigation configuration |
| `className` | `string` | `''` | Additional className for the container |
| `contentClassName` | `string` | `''` | Additional className for the inner content wrapper |
| `maxWidth` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '7xl' \| 'full' \| 'none'` | `'7xl'` | Max width variant |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Padding variant (responsive) |
| `centered` | `boolean` | `true` | Whether to center content horizontally |
| `scrollable` | `boolean \| 'auto' \| 'always' \| 'none'` | `'auto'` | Enable scrollable content area |
| `height` | `string` | - | Fixed height for scrollable container (CSS value) |
| `minHeight` | `string` | - | Minimum height for the content area |
| `testId` | `string` | - | Test ID for testing |

## Loading State

Display a loading indicator while fetching data:

```tsx
import { ContentContainer } from '@digistratum/layout';

function DataPage() {
  const { data, isLoading, error, refetch } = useData();
  
  return (
    <ContentContainer
      loading={{ 
        isLoading, 
        loadingText: 'Fetching your data...' 
      }}
      error={{ error, onRetry: refetch }}
    >
      <DataDisplay data={data} />
    </ContentContainer>
  );
}
```

### LoadingConfig Interface

```typescript
interface LoadingConfig {
  /** Whether content is currently loading */
  isLoading: boolean;
  /** Custom loading component (defaults to spinner) */
  loadingComponent?: ReactNode;
  /** Loading text/message */
  loadingText?: string;
}
```

### Custom Loading Component

```tsx
<ContentContainer
  loading={{
    isLoading: true,
    loadingComponent: <MySkeleton />
  }}
>
  {/* ... */}
</ContentContainer>
```

## Error Handling

Display errors with optional retry functionality:

```tsx
<ContentContainer
  error={{
    error: new Error('Failed to load data'),
    onRetry: () => refetch(),
    showRetry: true
  }}
>
  <MyContent />
</ContentContainer>
```

### ErrorConfig Interface

```typescript
interface ErrorConfig {
  /** Error object or message */
  error: Error | string | null;
  /** Custom error component */
  errorComponent?: ReactNode;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Whether to show retry button (default: true when onRetry provided) */
  showRetry?: boolean;
}
```

### Custom Error Component

```tsx
<ContentContainer
  error={{
    error: someError,
    errorComponent: <CustomErrorBoundary error={someError} />
  }}
>
  {/* ... */}
</ContentContainer>
```

## Breadcrumb Navigation

Add navigation breadcrumbs at the top of the content area:

```tsx
import { ContentContainer } from '@digistratum/layout';

function ProjectDetailPage() {
  return (
    <ContentContainer
      breadcrumbs={{
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/projects' },
          { label: 'Project Alpha' },  // Current page (no href)
        ]
      }}
    >
      <ProjectDetail />
    </ContentContainer>
  );
}
```

### BreadcrumbConfig Interface

```typescript
interface BreadcrumbConfig {
  /** Breadcrumb items in order (first = root, last = current) */
  items: BreadcrumbItem[];
  /** Custom breadcrumb renderer (overrides default) */
  customRenderer?: (items: BreadcrumbItem[]) => ReactNode;
  /** Separator between breadcrumb items (default: '/') */
  separator?: ReactNode;
  /** Additional className for breadcrumb container */
  className?: string;
}

interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation path (if clickable) */
  href?: string;
  /** Click handler (alternative to href) */
  onClick?: () => void;
  /** Icon to display before label */
  icon?: ReactNode;
}
```

### Breadcrumbs with Icons

```tsx
import { HomeIcon, FolderIcon } from '@heroicons/react/20/solid';

<ContentContainer
  breadcrumbs={{
    items: [
      { label: 'Home', href: '/', icon: <HomeIcon className="h-4 w-4" /> },
      { label: 'Documents', href: '/docs', icon: <FolderIcon className="h-4 w-4" /> },
      { label: 'Report.pdf' },
    ]
  }}
>
  <DocumentViewer />
</ContentContainer>
```

### Custom Breadcrumb Renderer

```tsx
<ContentContainer
  breadcrumbs={{
    items: myItems,
    customRenderer: (items) => (
      <MyCustomBreadcrumb items={items} />
    )
  }}
>
  {/* ... */}
</ContentContainer>
```

## Scrollable Content

Enable scrolling for long content within a fixed-height container:

```tsx
// Auto scrolling (shows scrollbar when needed)
<ContentContainer scrollable>
  <LongContent />
</ContentContainer>

// Fixed height with scrolling
<ContentContainer
  scrollable
  height="calc(100vh - 200px)"
>
  <LongContent />
</ContentContainer>

// Always show scrollbar
<ContentContainer
  scrollable="always"
  height="400px"
>
  <Content />
</ContentContainer>

// No scrolling (content can overflow)
<ContentContainer scrollable="none">
  <Content />
</ContentContainer>
```

## Responsive Padding

The padding prop provides responsive padding that's tighter on mobile:

| Value | Mobile | Desktop |
|-------|--------|---------|
| `none` | 0 | 0 |
| `sm` | px-2 py-3 | px-4 py-4 |
| `md` | px-4 py-6 | px-6 lg:px-8 |
| `lg` | px-6 py-8 | px-8 lg:px-12 |

```tsx
// Tighter padding for dense content
<ContentContainer padding="sm">
  <DenseTable />
</ContentContainer>

// Generous padding for reading content
<ContentContainer padding="lg">
  <Article />
</ContentContainer>
```

## Max Width Variants

Control the maximum width of the content:

```tsx
// Narrow content (forms, cards)
<ContentContainer maxWidth="md">
  <Form />
</ContentContainer>

// Full width (tables, dashboards)
<ContentContainer maxWidth="full">
  <Dashboard />
</ContentContainer>

// Default (7xl - standard page width)
<ContentContainer>
  <PageContent />
</ContentContainer>
```

## Integration with AppShell

ContentContainer is designed to work inside `AppShell`:

```tsx
import { AppShell, ContentContainer } from '@digistratum/layout';

function App() {
  return (
    <AppShell
      appName="MyApp"
      getMenuItems={() => menuItems}
    >
      <ContentContainer
        breadcrumbs={{ items: breadcrumbs }}
        loading={{ isLoading }}
        error={{ error, onRetry: refetch }}
      >
        <MyPageContent />
      </ContentContainer>
    </AppShell>
  );
}
```

## Complete Example

```tsx
import { ContentContainer } from '@digistratum/layout';
import { useQuery } from '@tanstack/react-query';

function ProjectsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  return (
    <ContentContainer
      // Breadcrumb navigation
      breadcrumbs={{
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects' },
        ]
      }}
      
      // Loading state
      loading={{
        isLoading,
        loadingText: 'Loading projects...',
      }}
      
      // Error handling
      error={{
        error,
        onRetry: refetch,
      }}
      
      // Layout options
      maxWidth="7xl"
      padding="md"
      scrollable
      height="calc(100vh - 180px)"
      
      // Testing
      testId="projects-container"
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <ProjectList projects={data} />
      </div>
    </ContentContainer>
  );
}
```

## Accessibility

ContentContainer includes accessibility features:

- Loading state announces via `aria-live="polite"` and `role="status"`
- Error state uses `role="alert"` for immediate announcement
- Breadcrumbs include `aria-label="Breadcrumb"` and `aria-current="page"` for current item
- Focus visible states on interactive elements
- Screen reader text for loading spinner

## Dark Mode

ContentContainer automatically supports dark mode through Tailwind's `dark:` variants. All default states (loading spinner, error display, breadcrumbs) adapt to the current theme.

## Testing

Use the `testId` prop and `data-state` attribute for testing:

```tsx
<ContentContainer testId="my-container">
  {/* ... */}
</ContentContainer>
```

```typescript
// Testing example
const container = screen.getByTestId('my-container');
expect(container).toHaveAttribute('data-state', 'ready');

// Or check for loading
expect(container).toHaveAttribute('data-state', 'loading');
```
