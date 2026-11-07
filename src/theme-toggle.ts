// The header's theme button. The rules live in theme.ts.
import { find } from './dom.ts';
import { loadThemeChoice, nextThemeChoice, resolveTheme, saveThemeChoice, themeColors } from './theme.ts';
import type { ThemeChoice } from './theme.ts';

const themeNames: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

export function setUpThemeToggle(): void {
  const themeToggle = find<HTMLButtonElement>('#theme-toggle');
  const themeName = find('#theme-name');
  const themeColor = find<HTMLMetaElement>('meta[name="theme-color"]');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  let themeChoice = loadThemeChoice();

  // The index.html script has already set the theme. This keeps it up to
  // date when it's changed here, or on the phone while it's on auto.
  function applyTheme(): void {
    const theme = resolveTheme(themeChoice, systemDark.matches);

    document.documentElement.dataset.theme = theme;
    themeColor.content = themeColors[theme];
    themeToggle.dataset.choice = themeChoice;
    themeName.textContent = themeNames[themeChoice];
  }

  themeToggle.addEventListener('click', function () {
    themeChoice = nextThemeChoice(themeChoice, systemDark.matches);
    saveThemeChoice(themeChoice);
    applyTheme();
  });
  systemDark.addEventListener('change', applyTheme);
  applyTheme();
  themeToggle.hidden = false;
}
