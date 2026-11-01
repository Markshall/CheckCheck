import * as CheckCheck from './checkchar.ts';

declare global {
  interface Window {
    // Google Tag Manager's queue (see index.html).
    dataLayer?: Record<string, unknown>[];
  }
}

function find<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} is missing from the page`);
  return element;
}

const input = find<HTMLInputElement>('#location-name');
const locationText = find('#location-text');
const checkCharOutput = find('#check-char');
const reverseResultsOutput = find('#reverse-lookup-results');
const similarOutput = find('#similar-locations');
let lastTrackedLocation: string | null = null;

interface Row {
  label: string | null;
  value: string;
}

// One row per result, so a four letter location shows its store and RFC
// answers one above the other with their labels kept small.
function renderRows(element: HTMLElement, rows: Row[]): void {
  element.replaceChildren(...rows.map(function (row) {
    const line = document.createElement('div');
    line.className = 'row';

    if (row.label) {
      const label = document.createElement('span');
      label.className = 'row-label';
      label.textContent = row.label;
      line.append(label, ' ');
    }

    const value = document.createElement('span');
    value.className = 'row-value';
    value.textContent = row.value;
    line.appendChild(value);

    return line;
  }));
}

// Locations the headset would also accept for this one, so stock voiced
// here may really be there (or the other way round).
function showSimilarLocations(value: string): void {
  const results = CheckCheck.similarLocations(value);

  if (!results.length) {
    similarOutput.style.display = 'none';
    similarOutput.replaceChildren();
    return;
  }

  const heading = document.createElement('p');
  const list = document.createElement('ul');

  heading.textContent = 'Same check character, easily confused with:';
  list.replaceChildren(...results.map(function (result) {
    const item = document.createElement('li');
    const location = document.createElement('strong');
    const reason = document.createElement('small');

    location.textContent = result.location;
    reason.textContent = result.reason;

    item.append(location, ' “' + result.text + '”', reason);
    return item;
  }));

  similarOutput.replaceChildren(heading, list);
  similarOutput.style.display = 'block';
}

function plural(count: number, noun: string): string {
  return count.toLocaleString('en-GB') + ' ' + noun + (count === 1 ? '' : 's');
}

function showReverseLookup(checkChar: string): void {
  const results = CheckCheck.reverseLookup(checkChar);
  const aisles = Object.keys(results).sort();
  const total = aisles.reduce(function (sum, aisle) {
    return sum + results[aisle].length;
  }, 0);

  locationText.style.display = 'none';
  checkCharOutput.style.display = 'none';
  similarOutput.style.display = 'none';
  reverseResultsOutput.style.display = 'block';

  const heading = document.createElement('p');
  const count = document.createElement('strong');
  const grid = document.createElement('div');

  heading.className = 'reverse-heading';
  count.textContent = plural(total, 'shelf location');
  heading.append(
    count,
    ' have the check character ' + checkChar.toUpperCase() + '. Tap an aisle to see which shelves they are.'
  );
  grid.className = 'aisles';

  grid.replaceChildren(...aisles.map(function (aisle) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const caption = document.createElement('span');
    const number = document.createElement('span');
    const size = document.createElement('small');
    const locations = document.createElement('ul');

    caption.className = 'aisle-caption';
    caption.textContent = 'Aisle';
    number.className = 'aisle-number';
    number.textContent = aisle;
    size.textContent = plural(results[aisle].length, 'location');
    summary.append(caption, number, size);

    locations.replaceChildren(...results[aisle].map(function (location) {
      const item = document.createElement('li');
      item.textContent = location;
      return item;
    }));

    details.append(summary, locations);
    return details;
  }));

  reverseResultsOutput.replaceChildren(heading, grid);
}

function showCheckChar(value: string): void {
  const results = CheckCheck.getCheckChar(value);
  const location = value.toUpperCase().substring(0, 4);

  locationText.style.display = 'block';
  checkCharOutput.style.display = 'block';
  reverseResultsOutput.style.display = 'none';

  if (CheckCheck.isRfcLocation(location) && location !== lastTrackedLocation) {
    lastTrackedLocation = location;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'event': 'checkcheck_input',
      'locationName': location
    });
  }

  renderRows(locationText, results.map(function (result) {
    return { label: result.label, value: '“' + result.text + '”' };
  }));
  renderRows(checkCharOutput, results.map(function (result) {
    return { label: result.label, value: result.checkChar };
  }));
  showSimilarLocations(value);
}

input.addEventListener('input', function () {
  const value = input.value.trim();

  if (CheckCheck.phonetic.includes(value.toUpperCase())) {
    showReverseLookup(value);
  } else {
    showCheckChar(value);
  }
});

checkCharOutput.addEventListener('click', function () {
  input.focus();
});

// Cache the app so it opens with no signal (see public/sw.js). Not in
// development, where the cache would serve stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(function (error: unknown) {
    console.warn('CheckCheck will not work offline:', error);
  });
}
