import test from 'node:test';
import assert from 'node:assert/strict';
import { lookup, filterAisles } from '../src/lookup.ts';

test('an empty box', () => {
  assert.deepEqual(lookup(''), { kind: 'empty' });
  assert.deepEqual(lookup('   '), { kind: 'empty' });
});

test('the start of a location asks for more', () => {
  for (const value of ['1', '10', '10A', '10a', 'J1', 'S1P', 'L10', 'Z', 'C', 'CA1', 'CP', 'RE', 'RET', 'DP', 'SO', 'AB']) {
    assert.equal(lookup(value).kind, 'partial', value);
  }
});

test('input that can never be a location', () => {
  for (const value of ['!!', 'XQ9', '1A', '1-', 'J1+', 'C1', 'L1+']) {
    assert.deepEqual(lookup(value), { kind: 'invalid', didYouMean: null }, value);
  }
});

test('a missing 0 in the aisle is suggested', () => {
  const cases = { '1AK': '01AK', '1ak': '01AK', '7A+': '07A+', '7A-': '07A-', 'L1A': 'L01A', 'Z9Z': 'Z09Z' };

  for (const [value, didYouMean] of Object.entries(cases)) {
    assert.deepEqual(lookup(value), { kind: 'invalid', didYouMean }, value);
  }
});

test('the start of a check character suggests it', () => {
  assert.deepEqual(lookup('NOV'), { kind: 'partial', suggestions: ['NOVEMBER'] });
  assert.deepEqual(lookup('x-'), { kind: 'partial', suggestions: ['X-RAY'] });
  assert.deepEqual(lookup('XR'), { kind: 'partial', suggestions: ['X-RAY'] });
  assert.deepEqual(lookup('N'), { kind: 'partial', suggestions: [] });

  const view = lookup('NOVE');
  assert.equal(view.kind, 'location');
  assert.ok(view.kind === 'location' && view.suggestions.includes('NOVEMBER') && view.note === null);
});

test('a location', () => {
  const view = lookup(' 10ak ');
  assert.equal(view.kind, 'location');
  if (view.kind !== 'location') return;

  assert.deepEqual(view.results, [{ label: null, text: 'ONE ZERO ALPHA KILO', checkChar: 'NOVEMBER' }]);
  assert.deepEqual(view.suggestions, []);
  assert.equal(view.note, null);
});

test('locations typed as words need no note', () => {
  for (const value of ['DPA', 'SOB', 'RETS', 'RETUR', 'RETURN', 'RETURNS', '10A+', 'CA12', 'L10A', 'ABCD']) {
    const view = lookup(value);
    assert.ok(view.kind === 'location' && view.note === null, value);
  }
});

test('notes on unusual locations', () => {
  const unknown = lookup('1A2B');
  assert.ok(unknown.kind === 'location' && unknown.note === 'unknown');

  const extra = lookup('10AKX');
  assert.ok(extra.kind === 'location' && extra.note === 'extra');

  const both = lookup('99999');
  assert.ok(both.kind === 'location' && both.note === 'unknown');
});

test('a check character lists its locations', () => {
  const view = lookup('november');
  assert.equal(view.kind, 'checkChar');
  if (view.kind !== 'checkChar') return;

  assert.equal(view.checkChar, 'NOVEMBER');
  assert.equal(view.total, view.groups.reduce((sum, group) => sum + group.total, 0));
  assert.ok(view.groups[0].kind === 'shelf' && view.groups[0].aisles['10'].includes('10AK'));
  assert.equal(view.location, null);
});

test('X-RAY can be typed without its hyphen', () => {
  for (const value of ['X-RAY', 'xray']) {
    const view = lookup(value);
    assert.ok(view.kind === 'checkChar' && view.checkChar === 'X-RAY', value);
  }
});

test('check characters that are also four letter locations show both', () => {
  for (const value of ['ECHO', 'GOLF', 'KILO', 'LIMA', 'MIKE', 'PAPA', 'ZULU', 'XRAY']) {
    const view = lookup(value);
    assert.equal(view.kind, 'checkChar', value);
    if (view.kind !== 'checkChar') continue;

    assert.ok(view.location, value);
    assert.deepEqual(view.location.results.map(result => result.label), ['Store', 'RFC'], value);
  }

  const golf = lookup('GOLF');
  assert.ok(golf.kind === 'checkChar' && golf.location?.similar.some(result => result.location === 'GLOF'));

  for (const value of ['NOVEMBER', 'X-RAY', 'ALPHA']) {
    const view = lookup(value);
    assert.ok(view.kind === 'checkChar' && view.location === null, value);
  }
});

test('filtering aisles', () => {
  const aisles = ['00', '07', '10', '70', '73', '99'];

  assert.deepEqual(filterAisles(aisles, ''), aisles);
  assert.deepEqual(filterAisles(aisles, '7'), ['70', '73']);
  assert.deepEqual(filterAisles(aisles, '73'), ['73']);
  assert.deepEqual(filterAisles(aisles, ' 0'), ['00', '07']);
  assert.deepEqual(filterAisles(aisles, '74'), []);
});
