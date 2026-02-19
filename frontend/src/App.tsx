import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { DSNav } from './components/DSNav'
import Login from './components/Login'

function App() {
  const { user, loading, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={login} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DSNav 
        user={{ name: user.name, email: user.email }}
        onLogout={logout}
        currentAppId="myapp"
        appName="My App"
      />

      <main className="flex-1 bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome, {user.name || user.email}!
          </h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">
              This is your DS App skeleton. Start building your application here.
            </p>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="font-semibold text-blue-900">Getting Started</h2>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• Add your routes to the backend in <code className="bg-blue-100 px-1 rounded">internal/api/handler.go</code></li>
                <li>• Create components in <code className="bg-blue-100 px-1 rounded">src/components/</code></li>
                <li>• Update infrastructure in <code className="bg-blue-100 px-1 rounded">infra/lib/app-stack.ts</code></li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-3 text-center text-sm text-gray-500 border-t bg-white">
        © 2016 - 2026 DigiStratum, LLC
      </footer>
    </div>
  )
}

export default App
