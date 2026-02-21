import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  appName: string;
}

/**
 * App header with navigation and auth controls
 * 
 * Features:
 * - App name/logo (links to home)
 * - Navigation links
 * - Theme toggle (light/dark mode)
 * - User menu (login/logout, tenant switcher)
 */
export function Header({ appName }: HeaderProps) {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        {/* Logo / App Name */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white hover:text-ds-primary">
            {appName}
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              About
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Right side: Theme toggle + User menu */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
