/**
 * ContentContainer - Main content area for app UI mounting
 * 
 * A composable content container that provides:
 * - React mount point for app-specific content
 * - Built-in loading/error states
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
} from './types';
