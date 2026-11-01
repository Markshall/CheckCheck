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

export interface SimilarLocation extends CheckCharResult {
  location: string;
  reason: string;
}

// Store locations grouped by aisle, e.g. { '10': ['10AK', '10BF'] }.
export type LocationsByAisle = Record<string, string[]>;

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
  return /[A-Z]{4}/i.test(location);
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

let reverseIndex: Record<string, LocationsByAisle> | null = null;

// Every store location 00AA-99ZZ grouped by check character, then by
// aisle. Built on first use and reused after that.
function reverseLookup(checkChar: string): LocationsByAisle {
  if (!reverseIndex) {
    reverseIndex = {};

    for (let i = 0; i <= 99; i++) {
      const aisle = i.toString().padStart(2, '0');

      for (const first of phonetic) {
        for (const second of phonetic) {
          const location = aisle + first[0] + second[0];
          const char = checkCharStore(location).checkChar;

          const aisles = (reverseIndex[char] ??= {});
          (aisles[aisle] ??= []).push(location);
        }
      }
    }
  }

  return reverseIndex[checkChar.toUpperCase()] || {};
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
// so the headset would have accepted either. Each is
// { location, text, checkChar, reason }.
function similarLocations(location: string): SimilarLocation[] {
  location = location.toUpperCase().substring(0, 4);

  if (!isLocation(location)) {
    return [];
  }

  const checkChar = checkCharStore(location).checkChar;
  const found = new Map<string, SimilarLocation>();

  function consider(candidate: string, reason: string): void {
    if (candidate !== location && !found.has(candidate) && isLocation(candidate) &&
        checkCharStore(candidate).checkChar === checkChar) {
      found.set(candidate, { location: candidate, reason, ...checkCharStore(candidate) });
    }
  }

  for (let i = 0; i < 4; i++) {
    for (const char of locationChars) {
      const candidate = location.substring(0, i) + char + location.substring(i + 1);
      consider(candidate, wordAt(candidate, i) + ' heard as ' + wordAt(location, i));
    }
  }

  // Only neighbouring digits or neighbouring letters, e.g. ONE ZERO said
  // as ZERO ONE, as a prefix like JEWELLERY can't swap with a digit.
  for (let i = 0; i < 3; i++) {
    const chars = location.split('');

    if (/\d/.test(chars[i]) === /\d/.test(chars[i + 1])) {
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      consider(chars.join(''), wordAt(location, i) + ' and ' + wordAt(location, i + 1) + ' swapped');
    }
  }

  return Array.from(found.values());
}

export { phonetic, numbers, isRfcLocation, getCheckChar, checkCharStore, checkCharRFC, reverseLookup, similarLocations };
