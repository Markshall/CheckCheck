const phonetic = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'X-RAY', 'YANKEE', 'ZULU'];
const numbers = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
const fixedCheckChars: Record<string, string> = { DPA: 'VICTOR', SOB: 'SIERRA' };
const returnsAliases = ['RETUR', 'RETURN', 'RETURNS'];

// Both formulas weight the four characters 5, 7, 7, 3.
const weights = [5, 7, 7, 3];

export interface CheckCharResult {
  text: string;
  checkChar: string;
}

export interface LabelledResult extends CheckCharResult {
  label: string | null;
}

export interface SimilarLocation {
  location: string;
  text: string;
  reason: string;
  // Which check characters it shares, for four letter locations that have
  // a Store and an RFC one, e.g. ['Store', 'RFC']. Empty for the others.
  labels: string[];
}

// Locations grouped by aisle, e.g. { '10': ['10AK', '10BF'] }. Locations
// with no aisle (CA12, DPA) are under ''.
export type LocationsByAisle = Record<string, string[]>;

export type LocationKind = 'shelf' | 'afterBefore' | 'jewellery' | 'security' | 'linbin' | 'bulk' | 'cashOffice' | 'collectionPoint' | 'other';

// Every location of one kind with a check character, e.g. the jewellery
// locations that use NOVEMBER.
export interface LocationGroup {
  kind: LocationKind;
  total: number;
  aisles: LocationsByAisle;
}

function getPhonetic(char: string): string | undefined {
  return /^[A-Z]$/.test(char) ? phonetic[char.charCodeAt(0) - 65] : undefined;
}

function speak(char: string): string {
  return (/^[0-9]$/.test(char) ? numbers[Number(char)] : getPhonetic(char)) || '?';
}

// Turns the spoken characters into what's said to the headset, e.g.
// J1PG -> JEWELLERY ONE PAPA GOLF, 10A+ -> AFTER ONE ZERO ALPHA.
function getLocationName(location: string, words: string[]): string {
  const prefix = location.substring(0, 2);
  const lastChar = location.slice(-1);
  let name = words.join(' ');

  switch (location[0]) {
    case 'J':
      name = 'JEWELLERY ' + words.slice(1).join(' ');
      break;
    case 'S':
      name = 'SECURITY ' + words.slice(1).join(' ');
      break;
    case 'L':
      name = words.slice(1, 3).join(' ') + ' LINBIN ' + words[3];
      break;
    case 'Z':
      name = words.slice(1, 3).join(' ') + ' BULK ' + words[3];
      break;
  }

  if (lastChar === '+') {
    name = 'AFTER ' + words.slice(0, 3).join(' ');
  } else if (lastChar === '-') {
    name = 'BEFORE ' + words.slice(0, 3).join(' ');
  }

  if (prefix === 'CA') {
    name = 'CASH OFFICE ' + words.slice(2).join(' ');
  } else if (prefix === 'CP') {
    name = 'COLLECTION POINT ' + words.slice(2).join(' ');
  } else if (location === 'RETS') {
    name = 'RETURNS';
  } else if (location.startsWith('DPA')) {
    name = 'DPA';
  } else if (location.startsWith('SOB')) {
    name = 'SOB';
  }

  return name;
}

function isRfcLocation(location: string): boolean {
  return /^[A-Z]{4}$/i.test(location);
}

// Returns a list of results, each { label, text, checkChar }. There are
// two (Store and RFC) for 4-letter locations, otherwise one with no label.
function getCheckChar(location: string): LabelledResult[] {
  location = location.toUpperCase();

  if (returnsAliases.includes(location)) {
    return [{ label: null, text: 'RETURNS', checkChar: 'FOUR EIGHT / OSCAR' }];
  }

  location = location.substring(0, 4);

  if (location in fixedCheckChars) {
    return [{ label: null, text: location, checkChar: fixedCheckChars[location] }];
  }

  const store = checkCharStore(location);

  if (isRfcLocation(location)) {
    return [
      { label: 'Store', ...store },
      { label: 'RFC', ...checkCharRFC(location) }
    ];
  }

  return [{ label: null, ...store }];
}

function checkCharStore(location: string): CheckCharResult {
  if (location.length < 4) {
    return { text: 'NULL', checkChar: 'NULL' };
  }

  const chars = location.substring(0, 4).split('');
  const total = chars.reduce((sum, char, i) => sum + char.charCodeAt(0) * weights[i], 0);

  return {
    text: getLocationName(location, chars.map(speak)),
    checkChar: phonetic[total % 26]
  };
}

function checkCharRFC(location: string): CheckCharResult {
  const chars = location.substring(0, 4).split('');
  const total = chars.reduce((sum, char, i) => sum + (char.charCodeAt(0) - 65) * weights[i], 45);
  const checkDigit = total % 99;

  return {
    text: chars.map(getPhonetic).join(' '),
    checkChar: numbers[Math.floor(checkDigit / 10)] + ' ' + numbers[checkDigit % 10]
  };
}

// The check character the headset expects in store, including the fixed ones.
function storeCheckChar(location: string): string {
  return fixedCheckChars[location] ?? checkCharStore(location).checkChar;
}

const letters = phonetic.map(word => word[0]);
const singleDigits = numbers.map((_, i) => String(i));
const aisleNumbers = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));

// Every location in the formats in the README, with its kind and aisle, in
// the order they're listed. Four letter RFC locations are left out, as
// there are 456,976 of them.
function* allLocations(): Generator<[LocationKind, string, string]> {
  for (const aisle of aisleNumbers) {
    for (const bay of letters) {
      for (const shelf of letters) yield ['shelf', aisle, aisle + bay + shelf];
    }
  }

  for (const aisle of aisleNumbers) {
    for (const bay of letters) {
      for (const sign of ['+', '-']) yield ['afterBefore', aisle, aisle + bay + sign];
    }
  }

  for (const [kind, prefix] of [['jewellery', 'J'], ['security', 'S']] as const) {
    for (const aisle of singleDigits) {
      for (const bay of letters) {
        for (const shelf of letters) yield [kind, aisle, prefix + aisle + bay + shelf];
      }
    }
  }

  for (const [kind, prefix] of [['linbin', 'L'], ['bulk', 'Z']] as const) {
    for (const aisle of aisleNumbers) {
      for (const bay of letters) yield [kind, aisle, prefix + aisle + bay];
    }
  }

  for (const [kind, prefix] of [['cashOffice', 'CA'], ['collectionPoint', 'CP']] as const) {
    for (const number of aisleNumbers) yield [kind, '', prefix + number];
  }

  for (const location of ['RETS', 'DPA', 'SOB']) yield ['other', '', location];
}

let reverseIndex: Record<string, LocationGroup[]> | null = null;

// Every location with a check character, grouped by kind (in the order of
// allLocations) and then by aisle. Built on first use and reused after that.
function reverseLookup(checkChar: string): LocationGroup[] {
  if (!reverseIndex) {
    const index: Record<string, Map<LocationKind, LocationGroup>> = {};

    for (const [kind, aisle, location] of allLocations()) {
      const groups = (index[storeCheckChar(location)] ??= new Map());
      let group = groups.get(kind);

      if (!group) {
        group = { kind, total: 0, aisles: {} };
        groups.set(kind, group);
      }
      group.total++;
      (group.aisles[aisle] ??= []).push(location);
    }

    reverseIndex = Object.fromEntries(Object.entries(index).map(([char, groups]) => [char, [...groups.values()]]));
  }

  return reverseIndex[checkChar.toUpperCase()] ?? [];
}

const locationPatterns = [
  /^\d\d[A-Z][A-Z]$/, // 10AK
  /^[JS]\d[A-Z][A-Z]$/, // S1PG
  /^[LZ]\d\d[A-Z]$/, // L10A
  /^C[AP]\d\d$/ // CA12
];
const prefixWords: Record<string, string> = { J: 'JEWELLERY', S: 'SECURITY', L: 'LINBIN', Z: 'BULK' };
const locationChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function isLocation(location: string): boolean {
  return locationPatterns.some(pattern => pattern.test(location));
}

function wordAt(location: string, i: number): string {
  return (i === 0 && prefixWords[location[0]]) || speak(location[i]);
}

// Locations one mistake away from the given one (a single character
// misheard, or two characters swapped) that share its check character,
// so the headset would have accepted either. A four letter location has a
// Store and an RFC check character, and is compared with other four letter
// locations on both.
function similarLocations(location: string): SimilarLocation[] {
  location = location.toUpperCase().substring(0, 4);

  const isRfc = isRfcLocation(location);

  if (!isRfc && !isLocation(location)) {
    return [];
  }

  const checks: [string, (location: string) => string][] = isRfc
    ? [['Store', candidate => checkCharStore(candidate).checkChar], ['RFC', candidate => checkCharRFC(candidate).checkChar]]
    : [['Store', candidate => checkCharStore(candidate).checkChar]];
  const fits = isRfc ? isRfcLocation : isLocation;
  const word = (location: string, i: number) => isRfc ? speak(location[i]) : wordAt(location, i);
  const found = new Map<string, SimilarLocation>();

  function consider(candidate: string, reason: string): void {
    if (candidate === location || found.has(candidate) || !fits(candidate)) return;

    const labels = checks.filter(([, checkChar]) => checkChar(candidate) === checkChar(location)).map(([label]) => label);

    if (labels.length) {
      found.set(candidate, { location: candidate, text: checkCharStore(candidate).text, reason, labels: isRfc ? labels : [] });
    }
  }

  for (let i = 0; i < 4; i++) {
    for (const char of locationChars) {
      const candidate = location.substring(0, i) + char + location.substring(i + 1);
      consider(candidate, word(candidate, i) + ' heard as ' + word(location, i));
    }
  }

  // Only neighbouring digits or neighbouring letters, e.g. ONE ZERO said
  // as ZERO ONE, as a prefix like JEWELLERY can't swap with a digit.
  for (let i = 0; i < 3; i++) {
    const chars = location.split('');

    if (/\d/.test(chars[i]) === /\d/.test(chars[i + 1])) {
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      consider(chars.join(''), word(location, i) + ' and ' + word(location, i + 1) + ' swapped');
    }
  }

  return Array.from(found.values());
}

export { phonetic, numbers, isRfcLocation, getCheckChar, checkCharStore, checkCharRFC, storeCheckChar, reverseLookup, similarLocations };
