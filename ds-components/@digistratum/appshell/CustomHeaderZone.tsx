import { ReactNode } from 'react';

interface CustomHeaderZoneProps {
  children?: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * CustomHeaderZone - A slot for app-specific content above the main header
 * 
 * Used for announcements, branding, or other content that should appear
 * above the standard DSHeader component.
 * 
 * @example
 * ```tsx
 * <CustomHeaderZone>
 *   <AnnouncementBanner message="Site maintenance scheduled" />
 * </CustomHeaderZone>
 * ```
 */
export function CustomHeaderZone({ children, className }: CustomHeaderZoneProps) {
  if (!children) return null;
  
  return (
    <div className={`ds-custom-header-zone ${className || ''}`}>
      {children}
    </div>
  );
}
