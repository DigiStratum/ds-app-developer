import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { t } = useTranslation();
  const { isAuthenticated, user, login } = useAuth();

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-4">{t('home.title', 'Welcome to {{APP_NAME}}')}</h1>
      
      {isAuthenticated ? (
        <div>
          <p className="mb-4">Hello, {user?.name || user?.email}!</p>
          <a 
            href="/dashboard" 
            className="inline-block px-4 py-2 bg-ds-primary text-white rounded hover:bg-ds-primary-dark"
          >
            Go to Dashboard
          </a>
        </div>
      ) : (
        <div>
          <p className="mb-4">{t('home.login_prompt', 'Please log in to continue.')}</p>
          <button 
            onClick={login}
            className="px-4 py-2 bg-ds-primary text-white rounded hover:bg-ds-primary-dark"
          >
            {t('auth.login', 'Log In')}
          </button>
        </div>
      )}
    </div>
  );
}
