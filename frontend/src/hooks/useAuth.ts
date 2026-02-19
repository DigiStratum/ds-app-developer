import { useState, useEffect, useCallback } from 'react'
import * as authService from '../services/auth'

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    authService.me()
      .then(setUser)
      .catch(() => {
        // No valid session
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((userData: User) => {
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (err) {
      console.error('Logout failed:', err)
    }
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      await authService.refresh()
    } catch (err) {
      console.error('Session refresh failed:', err)
      setUser(null)
    }
  }, [])

  return {
    user,
    loading,
    login,
    logout,
    refreshSession,
    isAuthenticated: !!user,
  }
}
