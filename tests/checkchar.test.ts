import test from 'node:test';
import assert from 'node:assert/strict';
import * as CheckCheck from '../src/checkchar.ts';

test('store check characters', () => {
  const cases = {
    '00AA': { text: 'ZERO ZERO ALPHA ALPHA', checkChar: 'ECHO' },
    '01AK': { text: 'ZERO ONE ALPHA KILO', checkChar: 'PAPA' },
    '10AK': { text: 'ONE ZERO ALPHA KILO', checkChar: 'NOVEMBER' },
    '99ZZ': { text: 'NINE NINE ZULU ZULU', checkChar: 'YANKEE' },
    'S1PG': { text: 'SECURITY ONE PAPA GOLF', checkChar: 'X-RAY' },
    'Z99Z': { text: 'NINE NINE BULK ZULU', checkChar: 'KILO' },
  };

  for (const [location, expected] of Object.entries(cases)) {
    assert.deepEqual(CheckCheck.checkCharStore(location), expected, location);
  }
});

test('swapped digits give a different check character', () => {
  assert.notEqual(CheckCheck.checkCharStore('10AK').checkChar, CheckCheck.checkCharStore('01AK').checkChar);
});

test('RFC check characters', () => {
  assert.deepEqual(CheckCheck.checkCharRFC('AAAA'), { text: 'ALPHA ALPHA ALPHA ALPHA', checkChar: 'FOUR FIVE' });
  assert.deepEqual(CheckCheck.checkCharRFC('ABCD'), { text: 'ALPHA BRAVO CHARLIE DELTA', checkChar: 'SEVEN FIVE' });
  assert.deepEqual(CheckCheck.checkCharRFC('RETS'), { text: 'ROMEO ECHO TANGO SIERRA', checkChar: 'FOUR EIGHT' });
  assert.deepEqual(CheckCheck.checkCharRFC('ZZZZ'), { text: 'ZULU ZULU ZULU ZULU', checkChar: 'ZERO ONE' });
});

test('after and before locations', () => {
  assert.deepEqual(CheckCheck.checkCharStore('10A+'), { text: 'AFTER ONE ZERO ALPHA', checkChar: 'VICTOR' });
  assert.deepEqual(CheckCheck.checkCharStore('10A-'), { text: 'BEFORE ONE ZERO ALPHA', checkChar: 'BRAVO' });
});

test('special location names', () => {
  const cases = {
    'J1PG': { text: 'JEWELLERY ONE PAPA GOLF', checkChar: 'ECHO' },
    'S1PG': { text: 'SECURITY ONE PAPA GOLF', checkChar: 'X-RAY' },
    'L10A': { text: 'ONE ZERO LINBIN ALPHA', checkChar: 'GOLF' },
    'Z10A': { text: 'ONE ZERO BULK ALPHA', checkChar: 'YANKEE' },
    'CA12': { text: 'CASH OFFICE ONE TWO', checkChar: 'JULIET' },
    'CP12': { text: 'COLLECTION POINT ONE TWO', checkChar: 'KILO' },
    'RETS': { text: 'RETURNS', checkChar: 'OSCAR' },
  };

  for (const [location, expected] of Object.entries(cases)) {
    assert.deepEqual(CheckCheck.checkCharStore(location), expected, location);
  }
});

test('getCheckChar uppercases and truncates input', () => {
  assert.deepEqual(CheckCheck.getCheckChar('10ak'), CheckCheck.getCheckChar('10AK'));
  assert.deepEqual(CheckCheck.getCheckChar('10AKXYZ'), CheckCheck.getCheckChar('10AK'));
});

test('getCheckChar gives a single unlabelled result for store locations', () => {
  assert.deepEqual(CheckCheck.getCheckChar('10AK'), [
    { label: null, text: 'ONE ZERO ALPHA KILO', checkChar: 'NOVEMBER' },
  ]);
});

test('getCheckChar shows both store and RFC results for 4 letters', () => {
  assert.deepEqual(CheckCheck.getCheckChar('ABCD'), [
    { label: 'Store', text: 'ALPHA BRAVO CHARLIE DELTA', checkChar: 'ECHO' },
    { label: 'RFC', text: 'ALPHA BRAVO CHARLIE DELTA', checkChar: 'SEVEN FIVE' },
  ]);
});

test('fixed check characters', () => {
  assert.deepEqual(CheckCheck.getCheckChar('DPA'), [{ label: null, text: 'DPA', checkChar: 'VICTOR' }]);
  assert.deepEqual(CheckCheck.getCheckChar('SOB'), [{ label: null, text: 'SOB', checkChar: 'SIERRA' }]);

  for (const input of ['RETUR', 'RETURN', 'RETURNS', 'returns']) {
    assert.deepEqual(CheckCheck.getCheckChar(input), [
      { label: null, text: 'RETURNS', checkChar: 'FOUR EIGHT / OSCAR' },
    ], input);
  }
});

test('too short to have a check character', () => {
  for (const input of ['', '1', '10']) {
    assert.equal(CheckCheck.getCheckChar(input)[0].checkChar, 'NULL', input);
  }
});

test('reverse lookup finds every location with a check character', () => {
  const groups = CheckCheck.reverseLookup('november');
  const shelves = groups.find(group => group.kind === 'shelf');

  assert.ok(shelves?.aisles['10'].includes('10AK'));

  for (const group of groups) {
    const locations = Object.values(group.aisles).flat();

    assert.equal(group.total, locations.length, group.kind);
    for (const location of locations) {
      assert.equal(CheckCheck.storeCheckChar(location), 'NOVEMBER', location);
    }
  }
});

test('reverse lookup covers every location format', () => {
  const totals: Record<string, number> = {};

  for (const char of CheckCheck.phonetic) {
    for (const group of CheckCheck.reverseLookup(char)) {
      totals[group.kind] = (totals[group.kind] ?? 0) + group.total;
    }
  }

  assert.deepEqual(totals, {
    shelf: 100 * 26 * 26, // 00AA-99ZZ
    afterBefore: 100 * 26 * 2, // 00A+-99Z-
    jewellery: 10 * 26 * 26, // J0AA-J9ZZ
    security: 10 * 26 * 26,
    linbin: 100 * 26, // L00A-L99Z
    bulk: 100 * 26,
    cashOffice: 100, // CA00-CA99
    collectionPoint: 100,
    other: 3 // RETS, DPA, SOB
  });
});

test('reverse lookup groups by aisle in the README order', () => {
  const groups = CheckCheck.reverseLookup('ECHO');

  assert.deepEqual(groups.map(group => group.kind).slice(0, 3), ['shelf', 'afterBefore', 'jewellery']);
  assert.ok(groups.find(group => group.kind === 'jewellery')?.aisles['1'].includes('J1PG'));
  assert.ok(CheckCheck.reverseLookup('GOLF').find(group => group.kind === 'linbin')?.aisles['10'].includes('L10A'));
  assert.ok(CheckCheck.reverseLookup('JULIET').find(group => group.kind === 'cashOffice')?.aisles[''].includes('CA12'));
  assert.deepEqual(CheckCheck.reverseLookup('VICTOR').find(group => group.kind === 'other')?.aisles[''], ['DPA']);
  assert.deepEqual(CheckCheck.reverseLookup('OSCAR').find(group => group.kind === 'other')?.aisles[''], ['RETS']);
});

test('reverse lookup of an unknown check character is empty', () => {
  assert.deepEqual(CheckCheck.reverseLookup('NOPE'), []);
});

test('characters with no phonetic spelling show as ?', () => {
  assert.equal(CheckCheck.getCheckChar('1#AK')[0].text, 'ONE ? ALPHA KILO');
  assert.equal(CheckCheck.getCheckChar('1 AK')[0].text, 'ONE ? ALPHA KILO');
});

test('similar locations from issue #5', () => {
  assert.deepEqual(CheckCheck.similarLocations('07AZ'), [
    { location: 'J7AZ', reason: 'JEWELLERY heard as ZERO', text: 'JEWELLERY SEVEN ALPHA ZULU', labels: [] },
  ]);
  assert.deepEqual(CheckCheck.similarLocations('J7AZ').map(r => r.location), ['07AZ']);
});

test('similar locations include security and swapped characters', () => {
  const locations = (input: string) => CheckCheck.similarLocations(input).map(r => r.location);

  assert.deepEqual(locations('97AZ'), ['S7AZ']);
  assert.deepEqual(locations('10AN'), ['10NA']);
  assert.deepEqual(locations('l10a'), ['L01A']);
  assert.deepEqual(locations('S7AZ'), ['97AZ']);
});

test('similar locations all share the check character', () => {
  for (const location of ['07AZ', '97AZ', '10AN', 'J7AZ', 'S7AZ', 'L10A', 'S1PG']) {
    const checkChar = CheckCheck.checkCharStore(location).checkChar;

    for (const result of CheckCheck.similarLocations(location)) {
      assert.equal(CheckCheck.checkCharStore(result.location).checkChar, checkChar, location + ' -> ' + result.location);
      assert.notEqual(result.location, location);
    }
  }
});

test('similar RFC locations', () => {
  // The two middle letters have the same weight, so swapping them never
  // changes either check character.
  assert.deepEqual(CheckCheck.similarLocations('abcd'), [
    { location: 'ACBD', reason: 'BRAVO and CHARLIE swapped', text: 'ALPHA CHARLIE BRAVO DELTA', labels: ['Store', 'RFC'] },
  ]);

  // Letters 13 apart share a store check character when swapped next to
  // a letter with a different weight, but not an RFC one.
  assert.deepEqual(CheckCheck.similarLocations('ANAA').map(r => [r.location, r.labels]), [
    ['NAAA', ['Store']],
    ['AANA', ['Store', 'RFC']],
  ]);

  // Only other four letter locations, never store formats like J1CD.
  for (const location of ['ABCD', 'JBCD', 'ZZZZ', 'RETS', 'GOLF']) {
    for (const result of CheckCheck.similarLocations(location)) {
      assert.match(result.location, /^[A-Z]{4}$/, location + ' -> ' + result.location);
      for (const label of result.labels) {
        const checkChar = label === 'RFC' ? CheckCheck.checkCharRFC : CheckCheck.checkCharStore;
        assert.equal(checkChar(result.location).checkChar, checkChar(location).checkChar, location + ' -> ' + result.location);
      }
    }
  }
});

test('no similar locations for unique or unknown locations', () => {
  for (const input of ['10AK', 'Z99Z', 'CA12', 'AAAA', '10A+', 'DPA', 'J10A', '', '10']) {
    assert.deepEqual(CheckCheck.similarLocations(input), [], input);
  }
});
