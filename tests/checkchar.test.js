const test = require('node:test');
const assert = require('node:assert/strict');
const CheckCheck = require('../js/checkchar.js');

test('store check characters', () => {
  const cases = {
    '00AA': { text: 'ZERO ZERO ALPHA ALPHA', checkChar: 'ECHO' },
    '01AK': { text: 'ZERO ONE ALPHA KILO', checkChar: 'PAPA' },
    '10AK': { text: 'ONE ZERO ALPHA KILO', checkChar: 'NOVEMBER' },
    '99ZZ': { text: 'NINE NINE ZULU ZULU', checkChar: 'YANKEE' },
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
    'J10A': { text: 'JEWELLERY ONE ZERO ALPHA', checkChar: 'WHISKEY' },
    'S10A': { text: 'SECURITY ONE ZERO ALPHA', checkChar: 'PAPA' },
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

test('reverse lookup finds every store location with a check character', () => {
  const results = CheckCheck.reverseLookup('november');
  const locations = Object.values(results).flat();

  assert.ok(results['10'].includes('10AK'));
  assert.ok(locations.length > 0);

  for (const location of locations) {
    assert.equal(CheckCheck.checkCharStore(location).checkChar, 'NOVEMBER', location);
  }

  const total = CheckCheck.phonetic
    .map(char => Object.values(CheckCheck.reverseLookup(char)).flat().length)
    .reduce((a, b) => a + b);

  assert.equal(total, 100 * 26 * 26);
});

test('reverse lookup of an unknown check character is empty', () => {
  assert.deepEqual(CheckCheck.reverseLookup('NOPE'), {});
});

test('characters with no phonetic spelling show as ?', () => {
  assert.equal(CheckCheck.getCheckChar('1#AK')[0].text, 'ONE ? ALPHA KILO');
  assert.equal(CheckCheck.getCheckChar('1 AK')[0].text, 'ONE ? ALPHA KILO');
});
