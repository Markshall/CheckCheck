import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecent, loadRecent, saveRecent, MAX_RECENT } from '../src/recent.ts';

// Just enough of localStorage for the tests.
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: key => void data.delete(key),
    clear: () => data.clear(),
    key: i => [...data.keys()][i] ?? null,
    get length() { return data.size; }
  };
}

test('newest first, without repeats', () => {
  assert.deepEqual(addRecent([], '10AK'), ['10AK']);
  assert.deepEqual(addRecent(['10AK', 'NOVEMBER'], 'L10A'), ['L10A', '10AK', 'NOVEMBER']);
  assert.deepEqual(addRecent(['10AK', 'NOVEMBER', 'L10A'], 'L10A'), ['L10A', '10AK', 'NOVEMBER']);
});

test(`keeps the last ${MAX_RECENT}`, () => {
  let list: string[] = [];
  for (const value of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) list = addRecent(list, value);
  assert.deepEqual(list, ['H', 'G', 'F', 'E', 'D', 'C']);
});

test('saves and loads', () => {
  const storage = memoryStorage();
  saveRecent(['10AK', 'NOVEMBER'], storage);
  assert.deepEqual(loadRecent(storage), ['10AK', 'NOVEMBER']);

  saveRecent([], storage);
  assert.equal(storage.length, 0);
});

test('ignores bad or missing storage', () => {
  assert.deepEqual(loadRecent(null), []);
  assert.deepEqual(loadRecent(memoryStorage({ 'checkcheck:recent': 'not json' })), []);
  assert.deepEqual(loadRecent(memoryStorage({ 'checkcheck:recent': '{"a":1}' })), []);
  assert.deepEqual(loadRecent(memoryStorage({ 'checkcheck:recent': '["10AK",5,null]' })), ['10AK']);

  const blocked = memoryStorage();
  blocked.getItem = () => { throw new Error('SecurityError'); };
  blocked.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.deepEqual(loadRecent(blocked), []);
  assert.doesNotThrow(() => saveRecent(['10AK'], blocked));
});
