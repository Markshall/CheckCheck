// The last few lookups, kept on the phone so they can be tapped again.
import { readItem, writeItem } from './storage.ts';

const KEY = 'checkcheck:recent';
export const MAX_RECENT = 6;

// Puts value first, without repeating it, and keeps at most MAX_RECENT.
export function addRecent(list: string[], value: string): string[] {
  return [value, ...list.filter(item => item !== value)].slice(0, MAX_RECENT);
}

export function loadRecent(storage?: Storage | null): string[] {
  try {
    const saved: unknown = JSON.parse(readItem(KEY, storage) ?? '[]');
    return Array.isArray(saved) ? saved.filter(item => typeof item === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecent(list: string[], storage?: Storage | null): void {
  writeItem(KEY, list.length ? JSON.stringify(list) : null, storage);
}
