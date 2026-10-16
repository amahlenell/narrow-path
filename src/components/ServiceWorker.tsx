'use client';

import { useEffect } from 'react';

// Registers the minimal service worker (installability + offline page).
// It does NOT handle push yet — see docs/NOTIFICATIONS.md.
export function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
