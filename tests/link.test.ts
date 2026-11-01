import test from 'node:test';
import assert from 'node:assert/strict';
import { fromHash, toHash } from '../src/link.ts';

test('a link opens the lookup after its #', () => {
  assert.equal(fromHash('#10AK'), '10AK');
  assert.equal(fromHash('#10ak'), '10AK');
  assert.equal(fromHash('#10A+'), '10A+');
  assert.equal(fromHash('#10A%2B'), '10A+');
  assert.equal(fromHash('#X-RAY'), 'X-RAY');
  assert.equal(fromHash('#%20j1pg%20'), 'J1PG');
});

test('a link with nothing after its # opens an empty box', () => {
  assert.equal(fromHash(''), '');
  assert.equal(fromHash('#'), '');
});

test('a link is cut to what fits in the box', () => {
  assert.equal(fromHash('#NOVEMBERX'), 'NOVEMBER');
});

test('a broken escape is used as it is', () => {
  assert.equal(fromHash('#10%'), '10%');
});

test('what is typed goes in the link', () => {
  assert.equal(toHash('10ak'), '#10AK');
  assert.equal(toHash(' 10A+ '), '#10A+');
  assert.equal(toHash('X-RAY'), '#X-RAY');
  assert.equal(toHash('A B'), '#A%20B');
  assert.equal(toHash(''), '');
  assert.equal(toHash('  '), '');
});

test('a link reads back as what was typed', () => {
  for (const value of ['10AK', '10A+', '10A-', 'J1PG', 'NOVEMBER', 'X-RAY', 'A B', '50%']) {
    assert.equal(fromHash(toHash(value)), value, value);
  }
});
