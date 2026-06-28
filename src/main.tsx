import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // UNREGISTER all service workers to prevent aggressive PWA caching during active development
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister().then(boolean => {
            if(boolean) {
                console.log('[SW] Unregistered successfully.');
                // Force reload once to fetch new non-cached assets
                if (!sessionStorage.getItem('sw_reloaded')) {
                    sessionStorage.setItem('sw_reloaded', 'true');
                    window.location.reload();
                }
            }
        });
      }
    });
  });
}

// Global Error Handler moved to index.html for better coverage

console.log('[AYA Boot] localStorage aya_user_id:', 
  localStorage.getItem('aya_user_id'))
console.log('[AYA Boot] sessionStorage aya_user_id:', 
  sessionStorage.getItem('aya_user_id'))
console.log('[AYA Boot] Zustand persisted store:', 
  localStorage.getItem('aya-user-store'))
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
