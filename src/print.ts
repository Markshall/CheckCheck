// The button to print a replacement label for what's typed, or every label
// in a bay. It opens the labels page (labels.html, src/labels-page.ts),
// which prints them: a page of its own, with no ads to print on them.
// labels.ts decides what goes on them.
import { trackPrint } from './analytics.ts';
import { create, find, plural, show } from './dom.ts';
import { printRun } from './labels.ts';
import { toHash } from './link.ts';
import type { View } from './lookup.ts';

const printOutput = find('#print-labels');

export function renderPrint(value: string, view: View): void {
  const run = printRun(value, view);

  show(printOutput, run !== null);
  if (!run) return;

  const button = create('a', 'print-button');
  const text = create('span');
  const first = run.locations[0];
  const last = run.locations[run.locations.length - 1];

  button.href = './labels.html' + toHash(value);
  button.addEventListener('click', () => trackPrint(run.bay ?? first, run.locations.length));
  button.appendChild(text);
  text.append(
    create('span', 'print-button-title', run.bay ? 'Print labels for bay ' + run.bay : 'Print a label for ' + first),
    create('small', '', run.bay ? plural(run.locations.length, 'label') + ', ' + first + ' to ' + last : 'For a shelf whose label is missing')
  );

  printOutput.replaceChildren(button);
}
