import test from 'node:test';
import assert from 'node:assert/strict';
import { loadThemeChoice, nextThemeChoice, resolveTheme, saveThemeChoice } from '../src/theme.ts';

// Just enough of localStorage for the tests.
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: key => void data.delete(key),
    clear: () => data.clear(),
    key: i => [...data.keys()][i] ?? null,
    get length() { return data.size; }
  };
}

test('auto follows the phone, the others ignore it', () => {
  assert.equal(resolveTheme('auto', false), 'light');
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('the first tap always changes the page', () => {
  // A phone in light mode: auto (light), dark, light, auto.
  assert.equal(nextThemeChoice('auto', false), 'dark');
  assert.equal(nextThemeChoice('dark', false), 'light');
  assert.equal(nextThemeChoice('light', false), 'auto');

  // A phone in dark mode: auto (dark), light, dark, auto.
  assert.equal(nextThemeChoice('auto', true), 'light');
  assert.equal(nextThemeChoice('light', true), 'dark');
  assert.equal(nextThemeChoice('dark', true), 'auto');
});

test('saves and loads the choice', () => {
  const storage = memoryStorage();

  saveThemeChoice('dark', storage);
  assert.equal(loadThemeChoice(storage), 'dark');

  saveThemeChoice('light', storage);
  assert.equal(loadThemeChoice(storage), 'light');

  // Auto is what's there when nothing is.
  saveThemeChoice('auto', storage);
  assert.equal(storage.length, 0);
  assert.equal(loadThemeChoice(storage), 'auto');
});

test('ignores bad or missing storage', () => {
  assert.equal(loadThemeChoice(null), 'auto');
  assert.equal(loadThemeChoice(memoryStorage({ 'checkcheck:theme': 'purple' })), 'auto');

  const blocked = memoryStorage();
  blocked.getItem = () => { throw new Error('SecurityError'); };
  blocked.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(loadThemeChoice(blocked), 'auto');
  assert.doesNotThrow(() => saveThemeChoice('dark', blocked));
});
