// Decides what the page shows for whatever is typed in the box, without
// touching the page, so it can be tested. src/app.ts draws the result.
import * as CheckCheck from './checkchar.ts';
import type { LabelledResult, LocationGroup, SimilarLocation } from './checkchar.ts';

// A location's check characters, and the locations easily confused with it.
export interface LocationMatch {
  results: LabelledResult[];
  similar: SimilarLocation[];
}

export type View =
  // Nothing typed yet.
  | { kind: 'empty' }
  // The start of a location or check character, e.g. 10A or NOV.
  | { kind: 'partial'; suggestions: string[] }
  // Can't become a location or check character, e.g. XQ9. didYouMean is
  // the location with an aisle's missing 0 put back, e.g. 01AK for 1AK.
  | { kind: 'invalid'; didYouMean: string | null }
  | (LocationMatch & {
      kind: 'location';
      // Check characters the input could be the start of, e.g. NOVE.
      suggestions: string[];
      note: Note | null;
    })
  // A check character, e.g. NOVEMBER: every location that uses it. Seven
  // of them (ECHO, GOLF, KILO, LIMA, MIKE, PAPA, ZULU) and XRAY are four
  // letter RFC locations too, and location has that location's answer.
  | { kind: 'checkChar'; checkChar: string; groups: LocationGroup[]; total: number; location: LocationMatch | null };

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

// X-RAY can be typed without its hyphen, which is awkward on a phone.
function spellings(word: string): string[] {
  return [word, word.replace('-', '')];
}

function findCheckChar(value: string): string | null {
  return CheckCheck.phonetic.find(word => spellings(word).includes(value)) ?? null;
}

// Check characters that start with what's typed. From two characters, as
// one letter would suggest a word for every letter of the alphabet.
function suggestionsFor(value: string): string[] {
  if (value.length < 2) return [];

  return CheckCheck.phonetic.filter(word => word !== value && spellings(word).some(spelling => spelling.startsWith(value)));
}

// Aisles 00-09 typed without their 0, e.g. 1AK, 1A+ or L1A.
function withLeadingZero(value: string): string | null {
  if (/^\d[A-Z][A-Z+-]$/.test(value)) return '0' + value;
  if (/^[LZ]\d[A-Z]$/.test(value)) return value[0] + '0' + value.substring(1);
  return null;
}

function match(value: string): LocationMatch {
  return { results: CheckCheck.getCheckChar(value), similar: CheckCheck.similarLocations(value) };
}

export function lookup(input: string): View {
  const value = input.trim().toUpperCase();

  if (!value) return { kind: 'empty' };

  const checkChar = findCheckChar(value);

  if (checkChar) {
    const groups = CheckCheck.reverseLookup(checkChar);
    const total = groups.reduce((sum, group) => sum + group.total, 0);

    return { kind: 'checkChar', checkChar, groups, total, location: isKnownLocation(value) ? match(value) : null };
  }

  const suggestions = suggestionsFor(value);

  if (CheckCheck.getCheckChar(value)[0].checkChar === 'NULL') {
    return isLocationStart(value) || suggestions.length
      ? { kind: 'partial', suggestions }
      : { kind: 'invalid', didYouMean: withLeadingZero(value) };
  }

  let note: Note | null = null;

  if (!suggestions.length && !isKnownLocation(value)) {
    note = value.length > 4 && isKnownLocation(value.substring(0, 4)) ? 'extra' : 'unknown';
  }

  return { kind: 'location', ...match(value), suggestions, note };
}

// The aisles whose number starts with what's typed in the aisle box, e.g. 7
// for 70-79. Anything but digits is ignored, and an empty box shows them all.
export function filterAisles(aisles: string[], query: string): string[] {
  const digits = query.replace(/\D/g, '');

  return aisles.filter(aisle => aisle.startsWith(digits));
}
