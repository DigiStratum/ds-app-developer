import { ReactNode, useRef, useState, useEffect } from 'react';

export interface CustomHeaderZoneProps {
  /** Content to render in the custom header zone. When undefined/null, the zone collapses to zero height. */
  children?: ReactNode;
  /** Additional CSS classes for the zone container */
  className?: string;
  /** Duration of collapse/expand animation in milliseconds. Set to 0 to disable animation. Default: 200 */
  animationDuration?: number;
}

/**
 * CustomHeaderZone - Full-width zone above the DS Header for custom branding/content
 * 
 * This component provides a designated area for apps to inject custom content
 * (logos, announcements, branding) above the standard DigiStratum header.
 * 
 * **Key Features:**
 * - Full-width and responsive
 * - Collapses to zero height when empty (no children) with smooth animation
 * - Smooth expand/collapse transitions
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
 *           {/* INSERT YOUR CUSTOM BRANDING/CONTENT HERE *\/}
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
 * **Empty State (Zone Collapses with Animation):**
 * 
 * When no children are provided, the zone smoothly collapses to zero height:
 * 
 * @example
 * ```tsx
 * // This renders nothing - zero height (with smooth collapse)
 * <CustomHeaderZone />
 * 
 * // Conditional rendering with smooth transitions
 * const [showBanner, setShowBanner] = useState(true);
 * <CustomHeaderZone>
 *   {showBanner && <AnnouncementBanner />}
 * </CustomHeaderZone>
 * 
 * // Disable animation for instant transitions
 * <CustomHeaderZone animationDuration={0}>
 *   {content}
 * </CustomHeaderZone>
 * ```
 */
export function CustomHeaderZone({ 
  children, 
  className = '',
  animationDuration = 200,
}: CustomHeaderZoneProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(!!children);

  // Track whether we have children
  const hasChildren = !!children;

  // Update expansion state when children change
  useEffect(() => {
    setIsExpanded(hasChildren);
  }, [hasChildren]);

  // Measure content height when children change
  useEffect(() => {
    if (contentRef.current && hasChildren) {
      // Use ResizeObserver for dynamic content changes
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      
      resizeObserver.observe(contentRef.current);
      
      // Initial measurement
      setContentHeight(contentRef.current.scrollHeight);
      
      return () => resizeObserver.disconnect();
    } else if (!hasChildren) {
      setContentHeight(0);
    }
  }, [hasChildren, children]);

  // Don't render anything if never had children (initial empty state)
  // This prevents an empty container from taking any space on initial render
  const [hasEverHadChildren, setHasEverHadChildren] = useState(hasChildren);
  
  useEffect(() => {
    if (hasChildren) {
      setHasEverHadChildren(true);
    }
  }, [hasChildren]);

  if (!hasEverHadChildren) {
    return null;
  }

  const transitionStyle = animationDuration > 0 
    ? `height ${animationDuration}ms ease-in-out, opacity ${animationDuration}ms ease-in-out`
    : 'none';

  return (
    <div 
      className={`ds-custom-header-zone w-full overflow-hidden ${className}`}
      style={{
        height: isExpanded ? contentHeight : 0,
        opacity: isExpanded ? 1 : 0,
        transition: transitionStyle,
      }}
      data-testid="custom-header-zone"
      aria-hidden={!isExpanded}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
