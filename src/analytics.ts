// Lookups sent to Google Tag Manager (see index.html).
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
