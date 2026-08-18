import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { autoSubscribeIfGranted } from './utils/pushNotifications.ts';

const FORCE_RELOAD_VERSION = 'v1.1.3';
if (localStorage.getItem('aya_pwa_version') !== FORCE_RELOAD_VERSION) {
    localStorage.setItem('aya_pwa_version', FORCE_RELOAD_VERSION);
    
    // Wipe out the levels array in the Zustand store so it gets re-fetched or re-generated
    try {
        const storeStr = localStorage.getItem('aya-user-store');
        if (storeStr) {
            const store = JSON.parse(storeStr);
            if (store.state && Array.isArray(store.state.levels)) {
                store.state.levels = [];
                localStorage.setItem('aya-user-store', JSON.stringify(store));
                console.log('[Cache Clear] Wiped levels from local storage');
            }
        }
    } catch (e) {
        console.error('[Cache Clear] Failed to parse local store', e);
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
            }
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[SW] Service Worker registered with scope:', registration.scope);
        // Force checking for updates from Vercel immediately
        registration.update().catch(() => {});
        // Auto-subscribe if notification permission was previously granted
        autoSubscribeIfGranted();
      },
      (error) => {
        console.error('[SW] Service Worker registration failed:', error);
      }
    );
  });
}

// Global Error Handler moved to index.html for better coverage

// ============================================================
// iOS Safari Viewport Height Fix
// Must run before React renders
// ============================================================
function setVhVariable() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set on load
setVhVariable();

// Update on resize (iOS fires this when address bar shows/hides)
window.addEventListener('resize', setVhVariable, { passive: true });
window.addEventListener('orientationchange', () => {
  setTimeout(setVhVariable, 200); // Delay for iOS orientation animation
}, { passive: true });

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
