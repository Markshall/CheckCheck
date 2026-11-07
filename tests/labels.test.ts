import test from 'node:test';
import assert from 'node:assert/strict';
import { bayShelves, makeLabel, printRun } from '../src/labels.ts';
import { lookup } from '../src/lookup.ts';

const run = (value: string) => printRun(value, lookup(value));

test('a bay has a shelf for every letter', () => {
  const shelves = bayShelves('10a');

  assert.equal(shelves?.length, 26);
  assert.equal(shelves?.[0], '10AA');
  assert.equal(shelves?.[25], '10AZ');
  assert.deepEqual(bayShelves('J1P')?.slice(0, 2), ['J1PA', 'J1PB']);
  assert.deepEqual(bayShelves('S1P')?.slice(-1), ['S1PZ']);
});

test('only shelf, jewellery and security bays are bays', () => {
  for (const value of ['10', '1A', '10AK', 'L10', 'Z10', 'CA1', 'NOV', 'ABC', '']) {
    assert.equal(bayShelves(value), null, value);
  }
});

test('a label has the location, how it is read out and its check character', () => {
  assert.deepEqual(makeLabel(' 10ak '), {
    location: '10AK',
    texts: [{ label: null, value: 'ONE ZERO ALPHA KILO' }],
    checkChars: [{ label: null, value: 'NOVEMBER' }]
  });
});

test('a four letter label has its Store and RFC check characters', () => {
  const label = makeLabel('ABCD');

  assert.deepEqual(label.texts, [{ label: null, value: 'ALPHA BRAVO CHARLIE DELTA' }]);
  assert.deepEqual(label.checkChars.map(row => row.label), ['Store', 'RFC']);

  // Read out differently in store and on the RFC, so both are printed.
  assert.deepEqual(makeLabel('JABC').texts.map(row => row.label), ['Store', 'RFC']);
});

test('the start of RETURNS is printed in full', () => {
  for (const value of ['RETUR', 'RETURN', 'RETURNS']) {
    assert.equal(makeLabel(value).location, 'RETURNS', value);
  }
});

test('a known location prints one label', () => {
  for (const value of ['10AK', '10A+', 'J1PG', 'L10A', 'CA12', 'RETS', 'DPA', 'ABCD', 'GOLF']) {
    assert.deepEqual(run(value), { bay: null, locations: [value] }, value);
  }
});

test('a bay prints every shelf in it', () => {
  const bay = run('10a');

  assert.equal(bay?.bay, '10A');
  assert.equal(bay?.locations.length, 26);
});

test('nothing to print for anything else', () => {
  for (const value of ['', '1', '10', 'NOV', 'NOVEMBER', 'XQ9', '1AK', '1A2B', '10AKX']) {
    assert.equal(run(value), null, value);
  }
});
