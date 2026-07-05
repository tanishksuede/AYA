import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[SW] Service Worker registered with scope:', registration.scope);
        // Force checking for updates from Vercel immediately
        registration.update().catch(() => {});
      },
      (error) => {
        console.error('[SW] Service Worker registration failed:', error);
      }
    );
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
