import { useState, useEffect } from 'react'
import { initiateSSO, ssoStatus } from '../services/auth'
import type { User } from '../hooks/useAuth'

interface LoginProps {
  onLogin: (user: User) => void
}

function Login({ onLogin }: LoginProps) {
  const [ssoEnabled, setSsoEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if SSO is enabled
    ssoStatus()
      .then(status => setSsoEnabled(status.enabled))
      .catch(() => setSsoEnabled(false))
  }, [])

  const handleSSOLogin = () => {
    setLoading(true)
    initiateSSO(window.location.pathname)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DS App</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        {ssoEnabled === null ? (
          <div className="text-center text-gray-500">Checking authentication...</div>
        ) : ssoEnabled ? (
          <button
            onClick={handleSSOLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Sign in with DS Account</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center text-red-600">
            SSO is not configured. Please set up DSAccount integration.
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <a href="https://account.digistratum.com" className="text-blue-600 hover:underline">
            Create an account
          </a>
          {' · '}
          <a href="https://account.digistratum.com/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login
