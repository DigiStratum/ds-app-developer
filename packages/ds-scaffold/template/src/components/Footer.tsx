import { Link } from 'react-router-dom';
import { GdprManageLink } from '@digistratum/ds-ui';

interface FooterProps {
  appName: string;
}

/**
 * App footer with copyright and links
 */
export function Footer({ appName }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Copyright */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {currentYear} DigiStratum LLC. All rights reserved.
        </p>
        
        {/* Footer Links */}
        <div className="flex items-center gap-4 text-sm">
          <Link to="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Terms of Service
          </Link>
          <GdprManageLink className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
        </div>
      </div>
    </div>
  );
}
