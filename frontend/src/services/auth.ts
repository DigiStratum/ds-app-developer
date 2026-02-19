const API_URL = import.meta.env.VITE_API_URL || ''

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // Include session cookie
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Get current user info
 */
export async function me(): Promise<User> {
  return apiCall('/api/auth/me')
}

/**
 * End current session
 */
export async function logout(): Promise<void> {
  await apiCall('/api/auth/logout', { method: 'POST' })
}

/**
 * Refresh current session
 */
export async function refresh(): Promise<{ expires_at: number }> {
  return apiCall('/api/auth/refresh', { method: 'POST' })
}

/**
 * Initiate SSO login flow
 * @param returnUrl - URL to redirect to after login
 */
export function initiateSSO(returnUrl?: string): void {
  const params = new URLSearchParams()
  if (returnUrl) {
    params.set('return_url', returnUrl)
  }
  const url = returnUrl 
    ? `${API_URL}/api/auth/sso?${params.toString()}`
    : `${API_URL}/api/auth/sso`
  
  window.location.href = url
}

/**
 * Check SSO status
 */
export async function ssoStatus(): Promise<{
  enabled: boolean
  dsaccount_url: string
  app_id: string
  redirect_uri: string
}> {
  return apiCall('/api/auth/sso/status')
}
