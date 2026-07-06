import { supabase } from './supabase';
import { useUserStore } from '../store/userStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a URL-safe base64 VAPID public key to the Uint8Array that
 * pushManager.subscribe() expects as `applicationServerKey`.
 *
 * This is the canonical implementation — matches the web-push npm package
 * and the W3C Push API spec exactly.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  // Allocate with an explicit ArrayBuffer so the type satisfies the Push API's
  // BufferSource constraint (which requires ArrayBuffer, not ArrayBufferLike).
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  // ── Requested early diagnostic logs ───────────────────────────────────────
  console.log('[Push] Starting subscription...');
  console.log('[Push] VAPID key:', import.meta.env.VITE_VAPID_PUBLIC_KEY?.substring(0, 20));

  try {
    // ── 1. Feature-detect ──────────────────────────────────────────────────
    if (!('serviceWorker' in navigator)) {
      console.error('[Push] FAIL — serviceWorker not supported in this browser.');
      return null;
    }
    if (!('PushManager' in window)) {
      console.error('[Push] FAIL — PushManager not supported in this browser.');
      return null;
    }

    // ── 2. Validate VAPID key ──────────────────────────────────────────────
    const DEFAULT_VAPID_KEY = 'BKuBEyjIX-OtnnyJ7cyBMLwAycYv6POyGVFIxPnlzbReZLxv3S-QP9wcJ-YIE38w_al1tqIDwSf41MUG8JgipZE';
    const VAPID_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || DEFAULT_VAPID_KEY;
    console.log('[Push] VAPID key length:', VAPID_KEY.length, '(expected 87 for unpadded base64url)');

    // ── 3. Wait for the controlling service worker ─────────────────────────
    // We do NOT register sw.js here — main.tsx already handles registration
    // on page load. We just wait for whatever SW is in control.
    console.log('[Push] Step 1 — waiting for service worker via navigator.serviceWorker.ready…');
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Step 1 ✓ SW ready. Scope:', registration.scope, '| Active SW:', registration.active?.scriptURL);

    // ── 4. Request notification permission ────────────────────────────────
    console.log('[Push] Step 2 — requesting Notification permission…');
    const permission = await Notification.requestPermission();
    console.log('[Push] Step 2 — permission result:', permission);
    if (permission !== 'granted') {
      console.warn('[Push] Step 2 — user did not grant permission. Aborting.');
      return null;
    }

    // ── 5. Convert VAPID key ───────────────────────────────────────────────
    console.log('[Push] Step 3 — converting VAPID key to Uint8Array…');
    let applicationServerKey: Uint8Array;
    try {
      applicationServerKey = urlBase64ToUint8Array(VAPID_KEY);
    } catch (e) {
      console.error('[Push] Step 3 ✗ — VAPID key conversion threw:', e);
      throw e;
    }
    console.log('[Push] Step 3 ✓ — key byte length:', applicationServerKey.length, '(expected 65)');

    // ── 6. Subscribe ───────────────────────────────────────────────────────
    console.log('[Push] Step 4 — calling pushManager.subscribe()…');
    let subscription: PushSubscription;
    try {
      // Pass the key read fresh from env (not a cached module-level variable)
      // to match exactly what the user requested.
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
    } catch (subErr: any) {
      console.error(
        '[Push] Step 4 ✗ — pushManager.subscribe() threw:', subErr.name, subErr.message,
        '\n  Common causes of AbortError / "push service error":',
        '\n  • VITE_VAPID_PUBLIC_KEY does not match the private key used by web-push on the server',
        '\n  • The SW scope is not at root "/" (current scope:', registration.scope, ')',
        '\n  • The browser cannot reach the FCM/Mozilla push endpoint (network issue)',
        '\n  • An existing subscription used a different VAPID key — try unsubscribing first',
        '\n  Full error object:', subErr
      );
      throw subErr;
    }
    console.log('[Push] Step 4 ✓ — subscribed. Endpoint prefix:', subscription.endpoint.slice(0, 50) + '…');

    // ── 7. Persist via server-side API (uses service role key) ─────────────
    console.log('[Push] Step 5 — saving subscription via /api/push-subscribe…');
    let targetUserId: string | null = useUserStore.getState().profile?.id || localStorage.getItem('aya_user_id') || null;
    
    // Fallback to supabase auth user if present
    if (!targetUserId) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) targetUserId = authUser.id;
      } catch (e) {
        console.warn('[Push] Auth check failed:', e);
      }
    }

    const subJson = subscription.toJSON();

    try {
      console.log('[Push] Step 5 — POSTing to /api/push-subscribe with endpoint:', subJson.endpoint?.substring(0, 50));
      const apiRes = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subJson, userId: targetUserId })
      });

      const apiText = await apiRes.text();
      console.log('[Push] Step 5 — API response status:', apiRes.status, 'body:', apiText);

      let apiData: any;
      try { apiData = JSON.parse(apiText); } catch { apiData = { raw: apiText }; }

      if (!apiRes.ok || !apiData.success) {
        console.error('[Push] Step 5 ✗ — Server save failed:', apiData);
      } else {
        console.log('[Push] Step 5 ✓ — subscription saved via API:', apiData.id || apiData.message);
      }
    } catch (apiErr) {
      console.error('[Push] Step 5 ✗ — Network error saving subscription:', apiErr);
    }

    // ── 8. Fire immediate welcome/test notification ───────────────────────
    try {
      await sendTestNotification();
    } catch (e) {
      console.warn('[Push] Immediate welcome notification could not be shown:', e);
    }

    return subscription;

  } catch (err) {
    console.error('[Push] subscribeUserToPush() failed:', err);
    return null;
  }
}

/**
 * Trigger an instant test notification on the user's device.
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      alert("Notifications are not supported by this browser.");
      return false;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      alert("Notification permission is not granted. Please allow notifications in your browser settings!");
      return false;
    }

    // Attempt 1: Service Worker Notification
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification('🌟 AYA Notifications Active!', {
            body: 'Welcome! You will receive daily mindset reminders and streak alerts.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'aya-test-notification'
          } as NotificationOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('[Push] ServiceWorker showNotification failed, falling back to window Notification:', swErr);
      }
    }

    // Attempt 2: Direct Window Notification fallback
    new Notification('🌟 AYA Notifications Active!', {
      body: 'Welcome! You will receive daily mindset reminders and streak alerts.',
      icon: '/icons/icon-192x192.png'
    });
    return true;
  } catch (err: any) {
    console.error('[Push] Failed to show test notification:', err);
    alert('Could not show notification: ' + (err?.message || err));
    return false;
  }
}

/**
 * Silently subscribe and register push notifications if permission is already granted.
 */
export async function autoSubscribeIfGranted(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    console.log('[Push] Permission already granted — auto-registering device...');
    try {
      await subscribeUserToPush();
    } catch (e) {
      console.warn('[Push] Auto-subscription silent error:', e);
    }
  }
}
