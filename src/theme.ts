// Light or dark. 'auto' follows the phone's setting, and the other two are
// for a phone kept in light mode in a dim stockroom (or the other way
// round). The choice is kept on the phone.
//
// The inline script in index.html's <head> follows the same rules, so the
// page is drawn in the right theme before this code loads.
import { readItem, writeItem } from './storage.ts';

export type ThemeChoice = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const KEY = 'checkcheck:theme';

// The header's colour in each theme, for the phone's status bar.
export const themeColors: Record<Theme, string> = { light: '#e53a40', dark: '#a32227' };

export function resolveTheme(choice: ThemeChoice, systemDark: boolean): Theme {
  return choice === 'auto' ? (systemDark ? 'dark' : 'light') : choice;
}

// Auto, then the opposite of the phone's setting, then the same as it, so
// the first tap always changes the page.
export function nextThemeChoice(choice: ThemeChoice, systemDark: boolean): ThemeChoice {
  const system: Theme = systemDark ? 'dark' : 'light';
  const other: Theme = systemDark ? 'light' : 'dark';

  if (choice === 'auto') return other;
  return choice === other ? system : 'auto';
}

export function loadThemeChoice(storage?: Storage | null): ThemeChoice {
  const saved = readItem(KEY, storage);
  return saved === 'light' || saved === 'dark' ? saved : 'auto';
}

// Auto isn't saved, so it's what an empty or blocked storage gives.
export function saveThemeChoice(choice: ThemeChoice, storage?: Storage | null): void {
  writeItem(KEY, choice === 'auto' ? null : choice, storage);
}
