'use client';
import { useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

export function useClickTracker(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    // Generate (or reuse) a lightweight session id for anonymous uniqueness. Persist for the browser session.
    let sessionId = sessionStorage.getItem('mlk_ses');
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2, 12);
      try { sessionStorage.setItem('mlk_ses', sessionId); } catch (_) {}
    }
    const handler = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const actionable = target.closest('a,button,[role="button"],[data-track-click]');
        if (!actionable) return;
        const path = window.location.pathname;
        const payload = { event_type: 'click', path, session_id: sessionId };
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`${API_BASE_URL}/analytics/event/`, new Blob([body], { type: 'application/json' }));
        } else {
          fetch(`${API_BASE_URL}/analytics/event/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
        }
      } catch (_) {}
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [enabled]);
}
