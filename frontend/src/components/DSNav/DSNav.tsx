import { useState, useEffect, useRef } from 'react'
import './DSNav.css'

interface User {
  name?: string
  email?: string
}

interface App {
  id: string
  name: string
  url: string
  status: string
}

interface DSNavProps {
  user: User
  onLogout: () => void
  currentAppId: string
  appName?: string
  registryUrl?: string
}

/**
 * Shared navigation component for DS ecosystem apps
 * 
 * Fetches app list from DSAppRegistry and provides cross-app navigation.
 */
export function DSNav({ 
  user, 
  onLogout, 
  currentAppId,
  appName = 'DS App',
  registryUrl = 'https://registry.digistratum.com'
}: DSNavProps) {
  const [apps, setApps] = useState<App[]>([])
  const [showAppSwitcher, setShowAppSwitcher] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const appSwitcherRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Fetch apps from registry
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await fetch(`${registryUrl}/api/apps`)
        if (res.ok) {
          const data = await res.json()
          // Only show production apps with URLs
          const productionApps = data.filter((app: App) => 
            app.status === 'production' && app.url
          )
          setApps(productionApps)
        }
      } catch (err) {
        console.error('Failed to fetch apps:', err)
      }
    }
    fetchApps()
  }, [registryUrl])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (appSwitcherRef.current && !appSwitcherRef.current.contains(e.target as Node)) {
        setShowAppSwitcher(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setShowUserMenu(false)
    onLogout()
  }

  const userInitial = (user.name || user.email || 'U')[0].toUpperCase()

  return (
    <nav className="ds-nav">
      <div className="ds-nav-left">
        {/* App Switcher */}
        <div className="ds-nav-app-switcher" ref={appSwitcherRef}>
          <button 
            className="ds-nav-switcher-btn"
            onClick={() => setShowAppSwitcher(!showAppSwitcher)}
            aria-label="Switch apps"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="2" width="6" height="6" rx="1" />
              <rect x="12" y="2" width="6" height="6" rx="1" />
              <rect x="2" y="12" width="6" height="6" rx="1" />
              <rect x="12" y="12" width="6" height="6" rx="1" />
            </svg>
          </button>
          
          {showAppSwitcher && (
            <div className="ds-nav-dropdown">
              <div className="ds-nav-dropdown-header">DigiStratum Apps</div>
              {apps.length === 0 ? (
                <div className="ds-nav-dropdown-empty">Loading apps...</div>
              ) : (
                <ul className="ds-nav-app-list">
                  {apps.map(app => (
                    <li key={app.id}>
                      <a 
                        href={app.url}
                        className={app.id === currentAppId ? 'current' : ''}
                      >
                        <span className="app-name">{app.name}</span>
                        {app.id === currentAppId && (
                          <span className="current-badge">Current</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ds-nav-dropdown-footer">
                <a href="https://account.digistratum.com">
                  DS Account →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* App Name */}
        <span className="ds-nav-app-name">{appName}</span>
      </div>

      <div className="ds-nav-right">
        {/* User Menu */}
        {user && (
          <div className="ds-nav-user-menu" ref={userMenuRef}>
            <button 
              className="ds-nav-user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="user-avatar">{userInitial}</span>
              <span className="user-name">{user.name || user.email}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="ds-nav-dropdown ds-nav-user-dropdown">
                <div className="ds-nav-user-info">
                  <div className="user-avatar large">{userInitial}</div>
                  <div className="user-details">
                    <span className="user-name">{user.name || 'User'}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                </div>
                <div className="ds-nav-dropdown-divider" />
                <a href="https://account.digistratum.com" className="ds-nav-menu-item">
                  Manage Account
                </a>
                <button onClick={handleLogout} className="ds-nav-menu-item ds-nav-logout">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default DSNav
