import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* TODO: Add DSAppShell from @digistratum/layout */}
      <header className="bg-ds-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">{'{{APP_NAME}}'}</h1>
          <nav>
            <a href="/" className="mr-4 hover:underline">Home</a>
            <a href="/dashboard" className="hover:underline">Dashboard</a>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
      
      <footer className="bg-gray-100 dark:bg-gray-800 p-4 mt-8">
        <div className="container mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} DigiStratum. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
