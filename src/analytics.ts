// Lookups and label prints sent to Google Tag Manager (see index.html).
import type { View } from './lookup.ts';

declare global {
  interface Window {
    // Google Tag Manager's queue (see index.html).
    dataLayer?: Record<string, unknown>[];
  }
}

// A lookup worth tracking and remembering: a location or a check character.
export type Settled = Extract<View, { kind: 'location' | 'checkChar' }>;

let lastTracked: string | null = null;

export function track(value: string, view: Settled): void {
  if (value === lastTracked) return;
  lastTracked = value;

  window.dataLayer = window.dataLayer || [];
  if (view.kind === 'location' || view.location) {
    window.dataLayer.push({ event: 'checkcheck_lookup', locationName: value });
  }
  if (view.kind === 'checkChar') {
    window.dataLayer.push({ event: 'checkcheck_reverse_lookup', checkChar: view.checkChar });
  }
}

// The print button, pressed for a location (e.g. 10AK) or a bay (10A).
// Sent from the main page as it opens the labels page, which has no Tag
// Manager. GA4 sends it with keepalive, so it isn't lost as the page changes.
export function trackPrint(printed: string, labelCount: number): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'checkcheck_print', locationName: printed, labelCount });
}
