// The labels page (labels.html): the replacement labels for what's in its
// link, e.g. labels.html#10A for every shelf in bay 10A, printed as soon as
// they're drawn. It's a page of its own, with no Tag Manager or AdSense, so
// no ads can print on the labels. src/print.ts links to it, and
// src/labels.ts decides what goes on the labels.
import { create, find, plural, show } from './dom.ts';
import { makeLabel, printRun } from './labels.ts';
import type { Label, Row } from './labels.ts';
import { fromHash, toHash } from './link.ts';
import { lookup } from './lookup.ts';

const back = find<HTMLAnchorElement>('#labels-back');
const title = find('#labels-title');
const printButton = find<HTMLButtonElement>('#labels-print');
const note = find('#labels-note');
const sheet = find('#print-sheet');

function renderRows(className: string, rows: Row[]): HTMLElement {
  const element = create('div', className);

  element.replaceChildren(...rows.map(function (row) {
    const line = create('span', 'print-row');

    if (row.label) line.append(create('span', 'print-row-label', row.label), ' ');
    line.append(row.value);
    return line;
  }));
  return element;
}

// A replacement label, laid out like the one on the shelf and the main
// page: a black keyline inside a yellow edge, with the check character in
// yellow on a black strip.
function renderLabel(label: Label): HTMLElement {
  const element = create('div', 'print-label');
  const main = create('div', 'print-label-main');

  main.append(
    create('div', 'print-location', label.location),
    // In quotes, like the main page: it's how the location is read out.
    renderRows('print-text', label.texts.map(row => ({ label: row.label, value: '“' + row.value + '”' }))),
    renderRows('print-check-char', label.checkChars)
  );
  element.append(main);
  return element;
}

const value = fromHash(location.hash) ?? '';
const run = printRun(value, lookup(value));

// Back to the lookup the labels came from.
back.href = './' + toHash(value);

// Opened from the print button, Back goes back to that page as it was
// rather than opening it again on top.
back.addEventListener('click', function (event) {
  if (!document.referrer || history.length < 2) return;

  const from = new URL(document.referrer);
  if (from.origin === location.origin && from.pathname === back.pathname) {
    event.preventDefault();
    history.back();
  }
});

if (run) {
  const heading = run.bay ? 'Bay ' + run.bay + ', ' + plural(run.locations.length, 'label') : run.locations[0];

  document.title = heading + ' · CheckCheck labels';
  title.textContent = heading;
  sheet.replaceChildren(...run.locations.map(location => renderLabel(makeLabel(location))));
  show(printButton, true);
  printButton.addEventListener('click', () => window.print());

  // Once the font has loaded, so the labels don't print in a fallback.
  // The Print button is there for a browser that won't print by itself, or
  // to print them again.
  document.fonts.ready.then(() => window.print());
} else {
  title.textContent = 'No labels';
  note.textContent = value
    ? 'There’s no label to print for ' + value + '. Type a location (e.g. 10AK) or a bay (e.g. 10A).'
    : 'There’s nothing to print. Type a location (e.g. 10AK) or a bay (e.g. 10A).';
  show(note, true);
}

// The link is the labels, so a different one is a different sheet.
window.addEventListener('hashchange', () => location.reload());
