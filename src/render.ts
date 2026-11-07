// Draws a View on the page: the label and its check character strip, the
// suggestions, recent lookups, similar locations and the reverse lookup.
import type { SimilarLocation } from './checkchar.ts';
import { create, find, plural, show } from './dom.ts';
import { lookup } from './lookup.ts';
import type { LocationMatch, View } from './lookup.ts';
import { renderReverse, resetReverse } from './reverse.ts';

export interface Actions {
  // A suggestion or recent lookup was tapped, to fill the box with.
  pick(value: string): void;
  clearRecent(): void;
}

const locationText = find('#location-text');
const checkCharOutput = find<HTMLButtonElement>('#check-char');
const statusOutput = find('#lookup-status');
const noteOutput = find('#input-note');
const suggestionsOutput = find('#suggestions');
const recentOutput = find('#recent');
const examplesOutput = find('#examples');
const similarOutput = find('#similar-locations');
const reverseResultsOutput = find('#reverse-lookup-results');

const notes = {
  unknown: 'That isn’t a usual location, so check what you’ve typed.',
  extra: 'Only the first four characters count.'
};

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
function renderSuggestions(actions: Actions, caption: string, words: string[], className = ''): void {
  show(suggestionsOutput, words.length > 0);
  if (!words.length) return;

  suggestionsOutput.replaceChildren(
    create('span', '', caption),
    ...words.map(function (word) {
      const button = create('button', ('suggestion ' + className).trim(), word);
      button.type = 'button';
      button.addEventListener('click', () => actions.pick(word));
      return button;
    })
  );
}

// Recent lookups as small copies of the label with their check characters,
// so they can often be read without tapping. A check character looked up
// on its own is shown as just the black strip.
function renderRecent(actions: Actions, recent: string[], visible: boolean): void {
  show(recentOutput, visible && recent.length > 0);
  if (!visible || !recent.length) return;

  const header = create('div', 'recent-header');
  const clear = create('button', 'recent-clear', 'Clear');
  const list = create('div', 'recent-list');

  clear.type = 'button';
  clear.addEventListener('click', function () {
    actions.clearRecent();
    show(recentOutput, false);
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
    button.addEventListener('click', () => actions.pick(value));

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

export function render(view: View, recent: string[], actions: Actions): void {
  // A check character like GOLF is a four letter location too, so it
  // shows on the label as well as listing its locations.
  const match = view.kind === 'location' ? view : view.kind === 'checkChar' ? view.location : null;
  const showLabel = view.kind !== 'checkChar' || match !== null;

  show(locationText, showLabel);
  show(checkCharOutput, showLabel);
  show(reverseResultsOutput, view.kind === 'checkChar');
  show(noteOutput, view.kind === 'location' && view.note !== null);
  renderSimilar(match ? match.similar : []);
  renderRecent(actions, recent, view.kind === 'empty');
  show(examplesOutput, view.kind === 'empty');
  announce(announcement(view, match));

  if (view.kind === 'invalid' && view.didYouMean) {
    renderSuggestions(actions, 'Did you mean', [view.didYouMean], 'is-location');
  } else {
    renderSuggestions(actions, 'Find every location with', view.kind === 'partial' || view.kind === 'location' ? view.suggestions : []);
  }

  if (match) {
    renderRows(locationText, match.results.map(result => ({ label: result.label, value: '“' + result.text + '”' })));
    renderRows(checkCharOutput, match.results.map(result => ({ label: result.label, value: result.checkChar })));
  }

  if (view.kind !== 'checkChar') resetReverse();

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
      renderReverse(reverseResultsOutput, view);
      break;
  }
}
