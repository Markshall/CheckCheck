// Things kept on the phone, like recent lookups and the theme. Storage can
// be missing or blocked (private browsing, cleared site data), so it fails
// quietly and the page works without it.

// Reading localStorage itself throws in some browsers when it's blocked, so
// this is only called inside a try. null means there's no storage.
function resolve(storage: Storage | null | undefined): Storage | null {
  return storage === undefined ? globalThis.localStorage ?? null : storage;
}

export function readItem(key: string, storage?: Storage | null): string | null {
  try {
    return resolve(storage)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

// null removes it.
export function writeItem(key: string, value: string | null, storage?: Storage | null): void {
  try {
    if (value === null) {
      resolve(storage)?.removeItem(key);
    } else {
      resolve(storage)?.setItem(key, value);
    }
  } catch {
    // Not saved, which only means it's forgotten next time.
  }
}
