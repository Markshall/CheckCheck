import * as CheckCheck from './checkchar.ts';
import { lookup, filterAisles } from './lookup.ts';
import type { View } from './lookup.ts';
import { addRecent, loadRecent, saveRecent } from './recent.ts';

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
const checkCharOutput = find('#check-char');
const noteOutput = find('#input-note');
const suggestionsOutput = find('#suggestions');
const recentOutput = find('#recent');
const similarOutput = find('#similar-locations');
const reverseResultsOutput = find('#reverse-lookup-results');
let lastTrackedLocation: string | null = null;
let shownCheckChar: string | null = null;
let recent = loadRecent();
let rememberTimer: number | undefined;

// How long a lookup has to stay in the box before it's remembered, so the
// steps on the way (1, 10, 10A) aren't.
const REMEMBER_AFTER = 1500;

const notes = {
  unknown: 'That isn’t a usual location, so check what you’ve typed.',
  extra: 'Only the first four characters count.'
};

function show(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
}

interface Row {
  label: string | null;
  value: string;
}

// One row per result, so a four letter location shows its store and RFC
// answers one above the other with their labels kept small.
function renderRows(element: HTMLElement, rows: Row[]): void {
  element.classList.remove('is-hint', 'is-error');
  element.replaceChildren(...rows.map(function (row) {
    const line = create('div', 'row');

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

function renderSuggestions(suggestions: string[]): void {
  show(suggestionsOutput, suggestions.length > 0);
  if (!suggestions.length) return;

  suggestionsOutput.replaceChildren(
    create('span', '', 'Find every location with'),
    ...suggestions.map(function (word) {
      const button = create('button', 'suggestion', word);
      button.type = 'button';
      button.addEventListener('click', function () {
        input.value = word;
        update();
      });
      return button;
    })
  );
}

function remember(value: string): void {
  recent = addRecent(recent, value);
  saveRecent(recent);
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
  header.append(create('h2', 'recent-heading', 'Recent'), clear);

  list.replaceChildren(...recent.map(function (value) {
    const view = lookup(value);
    const button = create('button', 'recent-item');

    button.type = 'button';
    if (view.kind === 'checkChar') {
      button.classList.add('is-check-char');
      button.append(create('span', 'recent-caption', 'Every location with'), create('span', 'recent-location', value));
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
      update();
      remember(value);
    });

    return button;
  }));

  recentOutput.replaceChildren(header, list);
}

// Locations the headset would also accept for this one, so stock voiced
// here may really be there (or the other way round).
function renderSimilar(similar: CheckCheck.SimilarLocation[]): void {
  show(similarOutput, similar.length > 0);
  if (!similar.length) return;

  const list = create('ul');

  list.replaceChildren(...similar.map(function (result) {
    const item = create('li');
    item.append(create('strong', '', result.location), ' “' + result.text + '”', create('small', '', result.reason));
    return item;
  }));

  similarOutput.replaceChildren(create('p', '', 'Same check character, easily confused with:'), list);
}

function plural(count: number, noun: string): string {
  return count.toLocaleString('en-GB') + ' ' + noun + (count === 1 ? '' : 's');
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

function renderReverse(view: Extract<View, { kind: 'checkChar' }>): void {
  // Typing in the box fires for every key, so keep the aisle box (and what's
  // typed in it) while the check character stays the same.
  if (view.checkChar === shownCheckChar) return;
  shownCheckChar = view.checkChar;

  const aisles = Object.keys(view.aisles).sort();
  const heading = create('p', 'reverse-heading');
  const filter = create('div', 'aisle-filter');
  const filterLabel = create('label', '', 'Jump to aisle');
  const filterInput = create('input');
  const grid = create('div', 'aisles');

  heading.append(
    create('strong', '', plural(view.total, 'shelf location')),
    ' have the check character ' + view.checkChar + '. Tap an aisle to see which shelves they are.'
  );

  filterLabel.htmlFor = 'aisle-filter';
  Object.assign(filterInput, {
    id: 'aisle-filter',
    type: 'text',
    inputMode: 'numeric',
    maxLength: 2,
    placeholder: 'All',
    autocomplete: 'off'
  });
  filter.append(filterLabel, filterInput);

  function renderGrid(): void {
    const query = filterInput.value.replace(/\D/g, '');
    const shown = filterAisles(aisles, query);

    if (!shown.length) {
      grid.replaceChildren(create('p', 'aisles-empty', 'No locations in aisle ' + query + ' use ' + view.checkChar + '.'));
      return;
    }

    // A whole aisle number opens that aisle.
    const openOne = query.length === 2 && shown.length === 1;
    grid.replaceChildren(...shown.map(aisle => renderAisle(aisle, view.aisles[aisle], openOne)));
  }

  filterInput.addEventListener('input', renderGrid);
  renderGrid();

  reverseResultsOutput.replaceChildren(heading, filter, grid);
}

function track(value: string): void {
  const location = value.toUpperCase().substring(0, 4);

  if (CheckCheck.isRfcLocation(location) && location !== lastTrackedLocation) {
    lastTrackedLocation = location;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'event': 'checkcheck_input',
      'locationName': location
    });
  }
}

function render(view: View): void {
  const isCheckChar = view.kind === 'checkChar';

  show(locationText, !isCheckChar);
  show(checkCharOutput, !isCheckChar);
  show(reverseResultsOutput, isCheckChar);
  show(noteOutput, view.kind === 'location' && view.note !== null);
  renderSuggestions(view.kind === 'partial' || view.kind === 'location' ? view.suggestions : []);
  renderSimilar(view.kind === 'location' ? view.similar : []);
  renderRecent(view.kind === 'empty');

  if (!isCheckChar) shownCheckChar = null;

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
      renderRows(locationText, view.results.map(result => ({ label: result.label, value: '“' + result.text + '”' })));
      renderRows(checkCharOutput, view.results.map(result => ({ label: result.label, value: result.checkChar })));
      if (view.note) noteOutput.textContent = notes[view.note];
      break;
    case 'checkChar':
      renderReverse(view);
      break;
  }
}

function update(): void {
  const view = lookup(input.value);

  if (view.kind === 'location') track(input.value.trim());
  render(view);

  // Only whole lookups: a known location, or a check character.
  window.clearTimeout(rememberTimer);
  if ((view.kind === 'location' && view.note === null && !view.suggestions.length) || view.kind === 'checkChar') {
    const value = input.value.trim().toUpperCase();
    rememberTimer = window.setTimeout(() => remember(value), REMEMBER_AFTER);
  }
}

input.addEventListener('input', update);

checkCharOutput.addEventListener('click', function () {
  input.focus();
});

// The browser may refill the box when coming back to the page.
update();

// Cache the app so it opens with no signal (see public/sw.js). Not in
// development, where the cache would serve stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(function (error: unknown) {
    console.warn('CheckCheck will not work offline:', error);
  });
}
