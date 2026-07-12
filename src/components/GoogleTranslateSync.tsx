import { useEffect } from 'react';
import { useUserStore } from '../store/userStore';

export function GoogleTranslateSync() {
    const appLanguage = useUserStore((state) => state.appLanguage);

    useEffect(() => {
        const syncLanguage = () => {
            const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
            if (selectElement) {
                // If it's already set correctly, do nothing
                if (selectElement.value === appLanguage) return;
                
                selectElement.value = appLanguage;
                selectElement.dispatchEvent(new Event('change'));
            }
        };

        // Try syncing immediately
        syncLanguage();

        // Also set up an interval to catch when Google Translate finally loads
        // The script loads asynchronously, so the DOM element might not exist yet
        const intervalId = setInterval(() => {
            const selectElement = document.querySelector('.goog-te-combo');
            if (selectElement) {
                syncLanguage();
                // We keep running the interval just in case the user changes it later,
                // but actually we only need to sync when appLanguage changes.
                // However, Google Translate might reset it if we don't watch it.
                // Let's clear interval once we successfully find the element.
                clearInterval(intervalId);
            }
        }, 500);

        return () => clearInterval(intervalId);
    }, [appLanguage]);

    return null; // This is a logic-only component
}
