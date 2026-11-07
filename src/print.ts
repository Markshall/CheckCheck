// The print button, and the sheet of replacement labels it prints.
// labels.ts decides what goes on them.
import { create, find, plural, show } from './dom.ts';
import { makeLabel, printRun } from './labels.ts';
import type { Label, Row } from './labels.ts';
import type { View } from './lookup.ts';

const printOutput = find('#print-labels');
const printSheet = find('#print-sheet');

// Set while the print button's labels are printing, so printing the page
// any other way (e.g. Ctrl+P) prints the page rather than the last labels.
let printingLabels = false;

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

// A replacement label, laid out like the one on the shelf.
function renderLabel(label: Label): HTMLElement {
  const element = create('div', 'print-label');

  element.append(
    create('div', 'print-location', label.location),
    renderRows('print-text', label.texts),
    renderRows('print-check-char', label.checkChars)
  );
  return element;
}

// The inline styles of everything hidden for the labels, to put back after.
const hiddenStyles = new Map<HTMLElement, string | null>();

// AdSense's auto ads go straight into <body> with an inline
// display: ... !important, which beats the print styles, so they'd print
// above the labels. Only another inline !important beats it.
function hideAllButSheet(): void {
  for (const element of document.body.children) {
    if (!(element instanceof HTMLElement) || element === printSheet || hiddenStyles.has(element)) continue;
    hiddenStyles.set(element, element.getAttribute('style'));
    element.style.setProperty('display', 'none', 'important');
  }
}

function showAll(): void {
  hiddenStyles.forEach(function (style, element) {
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  });
  hiddenStyles.clear();
}

function printLabels(locations: string[]): void {
  printSheet.replaceChildren(...locations.map(location => renderLabel(makeLabel(location))));
  document.documentElement.classList.add('is-printing-labels');
  hideAllButSheet();
  printingLabels = true;
  window.print();
}

window.addEventListener('beforeprint', function () {
  if (printingLabels) return;
  showAll();
  document.documentElement.classList.remove('is-printing-labels');
  printSheet.replaceChildren();
});

// Some phones fire this as soon as their print screen opens, so the labels
// are left on the sheet until the page is next printed, and the page comes
// back when it's next touched, which can only be once that screen is shut.
window.addEventListener('afterprint', function () {
  printingLabels = false;
  if (hiddenStyles.size === 0) return;
  window.addEventListener('pointerdown', showAll, { once: true });
  window.addEventListener('keydown', showAll, { once: true });
});

// A button to print a label for what's typed, or every label in a bay.
export function renderPrint(value: string, view: View): void {
  const run = printRun(value, view);

  show(printOutput, run !== null);
  if (!run) return;

  const button = create('button', 'print-button');
  const text = create('span');
  const first = run.locations[0];
  const last = run.locations[run.locations.length - 1];

  button.type = 'button';
  button.appendChild(text);
  text.append(
    create('span', 'print-button-title', run.bay ? 'Print labels for bay ' + run.bay : 'Print a label for ' + first),
    create('small', '', run.bay ? plural(run.locations.length, 'label') + ', ' + first + ' to ' + last : 'For a shelf whose label is missing')
  );
  button.addEventListener('click', () => printLabels(run.locations));

  printOutput.replaceChildren(button);
}
