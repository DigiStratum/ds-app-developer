/**
 * ContentContainer - Main content area for app UI mounting
 * 
 * A composable content container that provides:
 * - React mount point for app-specific content
 * - Built-in loading/error states
 * - Optional breadcrumb navigation
 * - Scrollable content area with configurable height
 * - Responsive padding and max-width variants
 * 
 * @example
 * ```tsx
 * import { ContentContainer } from '@digistratum/layout';
 * 
 * function App() {
 *   return (
 *     <ContentContainer
 *       loading={{ isLoading: false }}
 *       error={{ error: null }}
 *       breadcrumbs={{
 *         items: [
 *           { label: 'Home', href: '/' },
 *           { label: 'Dashboard' },
 *         ]
 *       }}
 *     >
 *       <YourAppContent />
 *     </ContentContainer>
 *   );
 * }
 * ```
 */

export { ContentContainer } from './ContentContainer';
export type { 
  ContentContainerProps,
  LoadingConfig,
  ErrorConfig,
  BreadcrumbItem,
  BreadcrumbConfig,
} from './types';
