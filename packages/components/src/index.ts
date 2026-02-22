/**
 * @digistratum/components
 * 
 * Reusable UI components for DigiStratum applications.
 * 
 * @example
 * ```tsx
 * import { Button, Card, Modal, Callout } from '@digistratum/components';
 * ```
 */

// Buttons
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Cards
export { Card, ArticleCard } from './Card';
export type { CardProps, ArticleCardProps } from './Card';

// Modals & Dialogs
export { Modal, Dialog } from './Modal';
export type { ModalProps, DialogProps } from './Modal';

// Callouts & Alerts
export { InsetBox, Callout } from './Callout';
export type { InsetBoxProps, CalloutProps } from './Callout';

// Loading States
export { LoadingSpinner, LoadingOverlay, Skeleton } from './Loading';
export type { LoadingSpinnerProps, LoadingOverlayProps, SkeletonProps } from './Loading';

// Empty States
export { EmptyState, EmptyIcon } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Error Handling
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';
