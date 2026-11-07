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

function printLabels(locations: string[]): void {
  printSheet.replaceChildren(...locations.map(location => renderLabel(makeLabel(location))));
  document.documentElement.classList.add('is-printing-labels');
  printingLabels = true;
  window.print();
}

window.addEventListener('beforeprint', function () {
  if (printingLabels) return;
  document.documentElement.classList.remove('is-printing-labels');
  printSheet.replaceChildren();
});

// Some phones fire this as soon as their print screen opens, so the labels
// are left on the sheet until the page is next printed.
window.addEventListener('afterprint', function () {
  printingLabels = false;
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
