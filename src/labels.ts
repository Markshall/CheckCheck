// Replacement labels, printed from the page for a shelf whose label is
// missing or worn, so it doesn't have to be looked up every time. Decides
// what's printed without touching the page, so it can be tested. src/print.ts
// draws the labels and prints them.
import { getCheckChar, phonetic } from './checkchar.ts';
import type { View } from './lookup.ts';

// A line on the label, e.g. { label: 'RFC', value: 'FOUR TWO' }. label is
// null when there's only one answer.
export interface Row {
  label: string | null;
  value: string;
}

export interface Label {
  location: string;
  // How it's read out, e.g. ONE ZERO ALPHA KILO.
  texts: Row[];
  checkChars: Row[];
}

// What a print button prints: one location, or every shelf in a bay.
export interface PrintRun {
  // The bay, e.g. 10A, or null for one location.
  bay: string | null;
  locations: string[];
}

// A bay with shelves A to Z: 10A for 10AA to 10AZ, or J1P and S1P for
// jewellery and security.
const bayPattern = /^(\d\d|[JS]\d)[A-Z]$/;

// RETUR and RETURN are the start of RETURNS, but the label says it in full.
const returnsAliases = ['RETUR', 'RETURN'];

export function bayShelves(value: string): string[] | null {
  const bay = value.trim().toUpperCase();

  return bayPattern.test(bay) ? phonetic.map(word => bay + word[0]) : null;
}

export function makeLabel(location: string): Label {
  let value = location.trim().toUpperCase();
  if (returnsAliases.includes(value)) value = 'RETURNS';

  const results = getCheckChar(value);
  // A four letter location has a Store and an RFC answer. They're usually
  // read out the same, so the words are only printed twice when they differ
  // (e.g. JABC, where the store one starts JEWELLERY).
  const sameText = results.every(result => result.text === results[0].text);

  return {
    location: value,
    texts: sameText ? [{ label: null, value: results[0].text }] : results.map(result => ({ label: result.label, value: result.text })),
    checkChars: results.map(result => ({ label: result.label, value: result.checkChar }))
  };
}

// What can be printed for what's typed: a location that's known (not one
// with a note, like 1A2B), a check character that's a location too (GOLF),
// or a bay (10A). null for anything else.
export function printRun(value: string, view: View): PrintRun | null {
  const typed = value.trim().toUpperCase();

  if ((view.kind === 'location' && view.note === null) || (view.kind === 'checkChar' && view.location)) {
    return { bay: null, locations: [typed] };
  }

  const shelves = view.kind === 'partial' ? bayShelves(typed) : null;

  return shelves ? { bay: typed, locations: shelves } : null;
}
