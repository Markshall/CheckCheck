// The last few lookups, kept on the phone so they can be tapped again.
// Storage can be missing or blocked (private browsing, cleared site data),
// so it fails quietly and the page works without it.

const KEY = 'checkcheck:recent';
export const MAX_RECENT = 6;

// Puts value first, without repeating it, and keeps at most MAX_RECENT.
export function addRecent(list: string[], value: string): string[] {
  return [value, ...list.filter(item => item !== value)].slice(0, MAX_RECENT);
}

// Reading localStorage itself throws in some browsers when it's blocked, so
// this is only called inside a try. null means there's no storage.
function resolve(storage: Storage | null | undefined): Storage | null {
  return storage === undefined ? globalThis.localStorage ?? null : storage;
}

export function loadRecent(storage?: Storage | null): string[] {
  try {
    const saved: unknown = JSON.parse(resolve(storage)?.getItem(KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter(item => typeof item === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecent(list: string[], storage?: Storage | null): void {
  try {
    if (list.length) {
      resolve(storage)?.setItem(KEY, JSON.stringify(list));
    } else {
      resolve(storage)?.removeItem(KEY);
    }
  } catch {
    // Not saved, which only means it's forgotten next time.
  }
}
