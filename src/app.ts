import type { LocationGroup, LocationKind, SimilarLocation } from './checkchar.ts';
import { fromHash, toHash } from './link.ts';
import { lookup, filterAisles } from './lookup.ts';
import type { LocationMatch, View } from './lookup.ts';
import { addRecent, loadRecent, saveRecent } from './recent.ts';
import { loadThemeChoice, nextThemeChoice, resolveTheme, saveThemeChoice, themeColors } from './theme.ts';
import type { ThemeChoice } from './theme.ts';

declare global {
  interface Window {
    // Google Tag Manager's queue (see index.html).
    dataLayer?: Record<string, unknown>[];
  }
}

function find<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} is missing from the page`);
  return element;
}

function create<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const input = find<HTMLInputElement>('#location-name');
const locationText = find('#location-text');
const checkCharOutput = find<HTMLButtonElement>('#check-char');
const statusOutput = find('#lookup-status');
const noteOutput = find('#input-note');
const suggestionsOutput = find('#suggestions');
const recentOutput = find('#recent');
const examplesOutput = find('#examples');
const similarOutput = find('#similar-locations');
const reverseResultsOutput = find('#reverse-lookup-results');
let lastTracked: string | null = null;
let shownCheckChar: string | null = null;
let recent = loadRecent();
let settleTimer: number | undefined;

// How long a lookup has to stay in the box before it's tracked and
// remembered, so the steps on the way (1, 10, 10A) aren't.
const SETTLE_AFTER = 1500;

const notes = {
  unknown: 'That isn’t a usual location, so check what you’ve typed.',
  extra: 'Only the first four characters count.'
};

const groupNames: Record<LocationKind, string> = {
  shelf: 'Shelves',
  afterBefore: 'After and before',
  jewellery: 'Jewellery',
  security: 'Security',
  linbin: 'Linbin',
  bulk: 'Bulk',
  cashOffice: 'Cash office',
  collectionPoint: 'Collection point',
  other: 'Other'
};

// Kinds with enough locations in an aisle to show each aisle as a tile.
// The rest are one list.
const tiledKinds: LocationKind[] = ['shelf', 'jewellery', 'security'];

function show(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
}

function plural(count: number, noun: string): string {
  return count.toLocaleString('en-GB') + ' ' + noun + (count === 1 ? '' : 's');
}

interface Row {
  label: string | null;
  value: string;
}

// One row per result, so a four letter location shows its store and RFC
// answers one above the other with their labels kept small. Spans, as the
// check character strip is a button.
function renderRows(element: HTMLElement, rows: Row[]): void {
  element.classList.remove('is-hint', 'is-error');
  element.replaceChildren(...rows.map(function (row) {
    const line = create('span', 'row');

    if (row.label) line.append(create('span', 'row-label', row.label), ' ');
    line.appendChild(create('span', 'row-value', row.value));

    return line;
  }));
}

// Placeholder text on the label, e.g. KEEP TYPING… while a location is
// half typed, and CHECK CHARACTER in the strip until there is one.
function renderHint(text: string, isError = false): void {
  locationText.classList.add('is-hint');
  locationText.classList.toggle('is-error', isError);
  locationText.textContent = text;
  checkCharOutput.classList.add('is-hint');
  checkCharOutput.textContent = 'Check character';
}

// What a screen reader announces: the answer, not every keystroke's hint.
function announce(text: string): void {
  if (statusOutput.textContent !== text) statusOutput.textContent = text;
}

function announcement(view: View, match: LocationMatch | null): string {
  const parts = match
    ? match.results.map(result => (result.label ? result.label + ' check character ' : 'Check character ') + result.checkChar)
    : [];

  if (view.kind === 'checkChar') parts.push(plural(view.total, 'location') + ' have the check character ' + view.checkChar);
  return parts.join('. ');
}

// Buttons that fill the box, e.g. NOVEMBER for NOV, or 01AK for 1AK.
function renderSuggestions(caption: string, words: string[], className = ''): void {
  show(suggestionsOutput, words.length > 0);
  if (!words.length) return;

  suggestionsOutput.replaceChildren(
    create('span', '', caption),
    ...words.map(function (word) {
      const button = create('button', ('suggestion ' + className).trim(), word);
      button.type = 'button';
      button.addEventListener('click', function () {
        input.value = word;
        update(true);
      });
      return button;
    })
  );
}

// Recent lookups as small copies of the label with their check characters,
// so they can often be read without tapping. A check character looked up
// on its own is shown as just the black strip.
function renderRecent(visible: boolean): void {
  show(recentOutput, visible && recent.length > 0);
  if (!visible || !recent.length) return;

  const header = create('div', 'recent-header');
  const clear = create('button', 'recent-clear', 'Clear');
  const list = create('div', 'recent-list');

  clear.type = 'button';
  clear.addEventListener('click', function () {
    recent = [];
    saveRecent(recent);
    renderRecent(false);
  });
  header.append(create('h2', 'section-heading', 'Recent'), clear);

  list.replaceChildren(...recent.map(function (value) {
    const view = lookup(value);
    const button = create('button', 'recent-item');

    button.type = 'button';
    if (view.kind === 'checkChar') {
      button.classList.add('is-check-char');
      button.append(create('span', 'recent-caption', 'Every location with'), create('span', 'recent-location', view.checkChar));
    } else if (view.kind === 'location') {
      button.append(
        create('span', 'recent-location', value),
        create('span', 'recent-check-char', view.results.map(result => result.checkChar).join(' / '))
      );
    } else {
      button.append(create('span', 'recent-location', value));
    }
    button.addEventListener('click', function () {
      input.value = value;
      update(true);
    });

    return button;
  }));

  recentOutput.replaceChildren(header, list);
}

// Locations the headset would also accept for this one, so stock voiced
// here may really be there (or the other way round).
function renderSimilar(similar: SimilarLocation[]): void {
  show(similarOutput, similar.length > 0);
  if (!similar.length) return;

  const list = create('ul');

  list.replaceChildren(...similar.map(function (result) {
    const item = create('li');
    const reason = result.labels.length ? result.reason + ' · same ' + result.labels.join(' and ') : result.reason;

    const text = create('span', 'similar-text');

    text.append('“' + result.text + '”', create('small', '', reason));
    item.append(create('strong', 'similar-location', result.location), text);
    return item;
  }));

  similarOutput.replaceChildren(create('p', 'similar-heading', 'Same check character, easily confused with'), list);
}

function renderAisle(aisle: string, locations: string[], open: boolean): HTMLDetailsElement {
  const details = create('details');
  const summary = create('summary');
  const list = create('ul');

  summary.append(
    create('span', 'aisle-caption', 'Aisle'),
    create('span', 'aisle-number', aisle),
    create('small', '', plural(locations.length, 'location'))
  );
  list.replaceChildren(...locations.map(location => create('li', '', location)));

  details.open = open;
  details.append(summary, list);
  return details;
}

// One kind of location, e.g. jewellery, showing only the aisles that match
// the aisle box. null when none do.
function renderGroup(group: LocationGroup, query: string): HTMLElement | null {
  const aisles = filterAisles(Object.keys(group.aisles).sort(), query);
  if (!aisles.length) return null;

  const count = aisles.reduce((sum, aisle) => sum + group.aisles[aisle].length, 0);
  let body: HTMLElement;

  if (tiledKinds.includes(group.kind)) {
    // A whole aisle number opens that aisle.
    body = create('div', 'aisles');
    body.replaceChildren(...aisles.map(aisle => renderAisle(aisle, group.aisles[aisle], aisle === query)));
  } else {
    body = create('ul', 'location-list');
    body.replaceChildren(...aisles.flatMap(aisle => group.aisles[aisle]).map(location => create('li', '', location)));
  }

  const name = create('span', 'group-name', groupNames[group.kind]);
  const total = create('small', '', plural(count, 'location'));

  // Shelves are what's looked for most, so they're always open. The rest
  // open once the aisle box narrows them down.
  if (group.kind === 'shelf') {
    const section = create('section', 'location-group');
    const heading = create('h3', 'group-heading');

    heading.append(name, total);
    section.append(heading, body);
    return section;
  }

  const details = create('details', 'location-group');
  const summary = create('summary', 'group-heading');

  summary.append(name, total);
  details.open = query !== '';
  details.append(summary, body);
  return details;
}

function renderReverse(view: Extract<View, { kind: 'checkChar' }>): void {
  // Typing in the box fires for every key, so keep the aisle box (and what's
  // typed in it) while the check character stays the same.
  if (view.checkChar === shownCheckChar) return;
  shownCheckChar = view.checkChar;

  const heading = create('p', 'reverse-heading');
  const filter = create('div', 'aisle-filter');
  const filterLabel = create('label', '', 'Jump to aisle');
  const filterInput = create('input');
  const groups = create('div', 'location-groups');

  heading.append(
    create('strong', 'reverse-total', view.total.toLocaleString('en-GB')),
    create('span', 'reverse-text', (view.total === 1 ? ' location has' : ' locations have') + ' the check character ' + view.checkChar + '. Tap an aisle or a group to see which they are.')
  );

  filterLabel.htmlFor = 'aisle-filter';
  Object.assign(filterInput, {
    id: 'aisle-filter',
    type: 'text',
    inputMode: 'numeric',
    enterKeyHint: 'done',
    maxLength: 2,
    placeholder: 'All',
    autocomplete: 'off'
  });
  dismissKeyboardOnEnter(filterInput);
  filter.append(filterLabel, filterInput);

  function renderGroups(): void {
    const query = filterInput.value.replace(/\D/g, '');
    const shown = view.groups.map(group => renderGroup(group, query)).filter(group => group !== null);

    if (!shown.length) {
      groups.replaceChildren(create('p', 'aisles-empty', 'No locations in aisle ' + query + ' use ' + view.checkChar + '.'));
      return;
    }

    groups.replaceChildren(...shown);
  }

  filterInput.addEventListener('input', renderGroups);
  renderGroups();

  reverseResultsOutput.replaceChildren(heading, filter, groups);
}

function render(view: View): void {
  // A check character like GOLF is a four letter location too, so it
  // shows on the label as well as listing its locations.
  const match = view.kind === 'location' ? view : view.kind === 'checkChar' ? view.location : null;
  const showLabel = view.kind !== 'checkChar' || match !== null;

  show(locationText, showLabel);
  show(checkCharOutput, showLabel);
  show(reverseResultsOutput, view.kind === 'checkChar');
  show(noteOutput, view.kind === 'location' && view.note !== null);
  renderSimilar(match ? match.similar : []);
  renderRecent(view.kind === 'empty');
  show(examplesOutput, view.kind === 'empty');
  announce(announcement(view, match));

  if (view.kind === 'invalid' && view.didYouMean) {
    renderSuggestions('Did you mean', [view.didYouMean], 'is-location');
  } else {
    renderSuggestions('Find every location with', view.kind === 'partial' || view.kind === 'location' ? view.suggestions : []);
  }

  if (match) {
    renderRows(locationText, match.results.map(result => ({ label: result.label, value: '“' + result.text + '”' })));
    renderRows(checkCharOutput, match.results.map(result => ({ label: result.label, value: result.checkChar })));
  }

  if (view.kind !== 'checkChar') shownCheckChar = null;

  switch (view.kind) {
    case 'empty':
      renderHint('Type a shelf location');
      break;
    case 'partial':
      renderHint('Keep typing…');
      break;
    case 'invalid':
      renderHint('That isn’t a location', true);
      break;
    case 'location':
      if (view.note) noteOutput.textContent = notes[view.note];
      break;
    case 'checkChar':
      renderReverse(view);
      break;
  }
}

type Settled = Extract<View, { kind: 'location' | 'checkChar' }>;

function track(value: string, view: Settled): void {
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

function remember(value: string): void {
  recent = addRecent(recent, value);
  saveRecent(recent);
}

// A lookup that's stayed in the box, or was tapped: tracked, and kept in
// recent lookups if it's a whole one (a known location, or a check
// character) rather than the start of one, like NOVE.
function settle(value: string, view: Settled): void {
  track(value, view);
  if ((view.kind === 'location' && view.note === null && !view.suggestions.length) || view.kind === 'checkChar') {
    remember(value);
  }
}

// now: settle straight away, for a tap or the Done key, rather than after
// SETTLE_AFTER.
function update(now = false): void {
  const value = input.value.trim().toUpperCase();
  const view = lookup(value);

  input.classList.toggle('is-long', value.length > 5);
  render(view);
  updateLink(value);

  window.clearTimeout(settleTimer);
  if (view.kind === 'location' || view.kind === 'checkChar') {
    if (now) {
      settle(value, view);
    } else {
      settleTimer = window.setTimeout(() => settle(value, view), SETTLE_AFTER);
    }
  }
}

// The keyboard's Done (enterkeyhint) puts it away, so the results under
// the box can be seen.
function dismissKeyboardOnEnter(field: HTMLInputElement, onEnter?: () => void): void {
  field.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onEnter?.();
    field.blur();
  });
}

input.addEventListener('input', () => update());

// An example looks itself up, as if it was typed, and the page goes back
// up to the label to show it.
document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(function (button) {
  button.addEventListener('click', function () {
    input.value = button.dataset.example ?? '';
    update(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
dismissKeyboardOnEnter(input, () => update(true));

// Tapping the strip selects what's typed, ready for the next location.
checkCharOutput.addEventListener('click', function () {
  input.focus();
  input.select();
});

// The link follows what's typed, so it can be copied or shared from the
// browser. Replaced rather than added to, so Back leaves the page rather
// than stepping back through every key.
function updateLink(value: string): void {
  const hash = toHash(value);

  if (hash !== location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search + hash);
  }
}

// A link like /check/#10AK looks it up straight away, as if it was tapped.
function openLink(): void {
  input.value = fromHash(location.hash);
  update(true);
}

window.addEventListener('hashchange', openLink);

// Otherwise the browser may refill the box when coming back to the page.
if (location.hash) {
  openLink();
} else {
  update();
}

const themeToggle = find<HTMLButtonElement>('#theme-toggle');
const themeName = find('#theme-name');
const themeColor = find<HTMLMetaElement>('meta[name="theme-color"]');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
let themeChoice = loadThemeChoice();

const themeNames: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

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

// Cache the app so it opens with no signal (see public/sw.js). Not in
// development, where the cache would serve stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(function (error: unknown) {
    console.warn('CheckCheck will not work offline:', error);
  });
}
