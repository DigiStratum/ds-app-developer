import { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Card component for content sections
 */
export function Card({
  children,
  title,
  subtitle,
  footer,
  className = '',
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm
        border border-gray-200 dark:border-gray-700
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow w-full text-left' : ''}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          {footer}
        </div>
      )}
    </Component>
  );
}

export interface ArticleCardProps {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  date?: string;
  author?: string;
  href?: string;
  className?: string;
}

/**
 * Article card for blog posts, news items, etc.
 */
export function ArticleCard({
  title,
  description,
  image,
  imageAlt,
  date,
  author,
  href,
  className = '',
}: ArticleCardProps) {
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`
        block bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden
        border border-gray-200 dark:border-gray-700
        ${href ? 'hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
    >
      {image && (
        <div className="aspect-video overflow-hidden">
          <img
            src={image}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
            {description}
          </p>
        )}
        {(date || author) && (
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            {author && <span>{author}</span>}
            {author && date && <span className="mx-2">•</span>}
            {date && <span>{date}</span>}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
