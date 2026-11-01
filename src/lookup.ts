// Decides what the page shows for whatever is typed in the box, without
// touching the page, so it can be tested. src/app.ts draws the result.
import * as CheckCheck from './checkchar.ts';
import type { LabelledResult, LocationsByAisle, SimilarLocation } from './checkchar.ts';

export type View =
  // Nothing typed yet.
  | { kind: 'empty' }
  // The start of a location or check character, e.g. 10A or NOV.
  | { kind: 'partial'; suggestions: string[] }
  // Can't become a location or check character, e.g. XQ9.
  | { kind: 'invalid' }
  | {
      kind: 'location';
      results: LabelledResult[];
      similar: SimilarLocation[];
      // Check characters the input could be the start of, e.g. NOVE.
      suggestions: string[];
      note: Note | null;
    }
  // A check character, e.g. NOVEMBER: every location that uses it.
  | { kind: 'checkChar'; checkChar: string; aisles: LocationsByAisle; total: number };

// 'unknown': it has a check character but isn't a location format we know,
// e.g. 1A2B. 'extra': only the first four characters count, e.g. 10AKX.
export type Note = 'unknown' | 'extra';

const D = '[0-9]';
const L = '[A-Z]';

// The location formats in the README, one pattern per character.
const formats = [
  [D, D, L, L], // 10AK
  [D, D, L, '[+-]'], // 10A+
  ['[JS]', D, L, L], // J1PG, S1PG
  ['[LZ]', D, D, L], // L10A, Z10A
  ['C', '[AP]', D, D], // CA12, CP12
  [L, L, L, L] // ABCD (RFC)
].map(format => format.map(pattern => new RegExp('^' + pattern + '$')));

// Locations typed as words. RETUR and RETURN are the start of RETURNS.
const words = ['RETS', 'RETURNS', 'DPA', 'SOB'];

function matchesFormat(value: string, partial: boolean): boolean {
  if (value.length > 4 || (!partial && value.length < 4)) return false;

  return formats.some(format => [...value].every((char, i) => format[i].test(char)));
}

function isKnownLocation(value: string): boolean {
  return words.includes(value) || value === 'RETUR' || value === 'RETURN' || matchesFormat(value, false);
}

function isLocationStart(value: string): boolean {
  return words.some(word => word.startsWith(value)) || matchesFormat(value, true);
}

// Check characters that start with what's typed. From two characters, as
// one letter would suggest a word for every letter of the alphabet.
function suggestionsFor(value: string): string[] {
  if (value.length < 2) return [];

  return CheckCheck.phonetic.filter(word => word.startsWith(value) && word !== value);
}

export function lookup(input: string): View {
  const value = input.trim().toUpperCase();

  if (!value) return { kind: 'empty' };

  if (CheckCheck.phonetic.includes(value)) {
    const aisles = CheckCheck.reverseLookup(value);
    const total = Object.values(aisles).reduce((sum, locations) => sum + locations.length, 0);

    return { kind: 'checkChar', checkChar: value, aisles, total };
  }

  const suggestions = suggestionsFor(value);
  const results = CheckCheck.getCheckChar(value);

  if (results[0].checkChar === 'NULL') {
    return isLocationStart(value) || suggestions.length ? { kind: 'partial', suggestions } : { kind: 'invalid' };
  }

  let note: Note | null = null;

  if (!suggestions.length && !isKnownLocation(value)) {
    note = value.length > 4 && isKnownLocation(value.substring(0, 4)) ? 'extra' : 'unknown';
  }

  return { kind: 'location', results, similar: CheckCheck.similarLocations(value), suggestions, note };
}

// The aisles whose number starts with what's typed in the aisle box, e.g. 7
// for 70-79. Anything but digits is ignored, and an empty box shows them all.
export function filterAisles(aisles: string[], query: string): string[] {
  const digits = query.replace(/\D/g, '');

  return aisles.filter(aisle => aisle.startsWith(digits));
}
