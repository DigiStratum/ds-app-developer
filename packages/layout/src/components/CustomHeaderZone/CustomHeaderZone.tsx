import { ReactNode } from 'react';

export interface CustomHeaderZoneProps {
  /** Content to render in the custom header zone. When undefined/null, the zone collapses to zero height. */
  children?: ReactNode;
  /** Additional CSS classes for the zone container */
  className?: string;
}

/**
 * CustomHeaderZone - Full-width zone above the DS Header for custom branding/content
 * 
 * This component provides a designated area for apps to inject custom content
 * (logos, announcements, branding) above the standard DigiStratum header.
 * 
 * **Key Features:**
 * - Full-width and responsive
 * - Collapses to zero height when empty (no children)
 * - Styled to integrate with DS theme (light/dark mode support)
 * 
 * **Usage Pattern:**
 * 
 * In your app's layout, wrap your custom header content with CustomHeaderZone:
 * 
 * @example
 * ```tsx
 * import { AppShell, CustomHeaderZone } from '@digistratum/layout';
 * 
 * function App() {
 *   return (
 *     <AppShell
 *       appName="MyApp"
 *       customHeader={
 *         <CustomHeaderZone>
 *           {/* INSERT YOUR CUSTOM BRANDING HERE *\/}
 *           <div className="flex items-center justify-center py-2 bg-blue-600 text-white">
 *             <img src="/my-logo.svg" alt="My Company" className="h-8" />
 *             <span className="ml-2 font-semibold">My Company</span>
 *           </div>
 *         </CustomHeaderZone>
 *       }
 *     >
 *       <YourContent />
 *     </AppShell>
 *   );
 * }
 * ```
 * 
 * **Empty State (Zone Collapses):**
 * 
 * When no children are provided, the zone renders nothing and takes no space:
 * 
 * @example
 * ```tsx
 * // This renders nothing - zero height
 * <CustomHeaderZone />
 * 
 * // Conditional rendering also works
 * <CustomHeaderZone>
 *   {showBanner && <AnnouncementBanner />}
 * </CustomHeaderZone>
 * ```
 */
export function CustomHeaderZone({ children, className = '' }: CustomHeaderZoneProps) {
  // Collapse to zero height when no children
  if (!children) {
    return null;
  }

  return (
    <div 
      className={`ds-custom-header-zone w-full ${className}`}
      data-testid="custom-header-zone"
    >
      {children}
    </div>
  );
}
