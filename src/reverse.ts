// Every location with a check character, e.g. NOVEMBER, grouped by kind
// and aisle, with a box to jump to an aisle.
import type { LocationGroup, LocationKind } from './checkchar.ts';
import { create, dismissKeyboardOnEnter, plural } from './dom.ts';
import { filterAisles } from './lookup.ts';
import type { View } from './lookup.ts';

const groupNames: Record<LocationKind, string> = {
  shelf: 'Shelves',
  afterBefore: 'After and before',
  jewellery: 'Jewellery',
  security: 'Security',
  linbin: 'Linbin',
  bulk: 'Bulk',
  cashOffice: 'Cash office',
  collectionPoint: 'Collection point',
  other: 'Other'
};

// Kinds with enough locations in an aisle to show each aisle as a tile.
// The rest are one list.
const tiledKinds: LocationKind[] = ['shelf', 'jewellery', 'security'];

let shownCheckChar: string | null = null;

function renderAisle(aisle: string, locations: string[], open: boolean): HTMLDetailsElement {
  const details = create('details');
  const summary = create('summary');
  const list = create('ul');

  summary.append(
    create('span', 'aisle-caption', 'Aisle'),
    create('span', 'aisle-number', aisle),
    create('small', '', plural(locations.length, 'location'))
  );
  list.replaceChildren(...locations.map(location => create('li', '', location)));

  details.open = open;
  details.append(summary, list);
  return details;
}

// One kind of location, e.g. jewellery, showing only the aisles that match
// the aisle box. null when none do.
function renderGroup(group: LocationGroup, query: string): HTMLElement | null {
  const aisles = filterAisles(Object.keys(group.aisles).sort(), query);
  if (!aisles.length) return null;

  const count = aisles.reduce((sum, aisle) => sum + group.aisles[aisle].length, 0);
  let body: HTMLElement;

  if (tiledKinds.includes(group.kind)) {
    // A whole aisle number opens that aisle.
    body = create('div', 'aisles');
    body.replaceChildren(...aisles.map(aisle => renderAisle(aisle, group.aisles[aisle], aisle === query)));
  } else {
    body = create('ul', 'location-list');
    body.replaceChildren(...aisles.flatMap(aisle => group.aisles[aisle]).map(location => create('li', '', location)));
  }

  const name = create('span', 'group-name', groupNames[group.kind]);
  const total = create('small', '', plural(count, 'location'));

  // Shelves are what's looked for most, so they're always open. The rest
  // open once the aisle box narrows them down.
  if (group.kind === 'shelf') {
    const section = create('section', 'location-group');
    const heading = create('h3', 'group-heading');

    heading.append(name, total);
    section.append(heading, body);
    return section;
  }

  const details = create('details', 'location-group');
  const summary = create('summary', 'group-heading');

  summary.append(name, total);
  details.open = query !== '';
  details.append(summary, body);
  return details;
}

// Forgets what's shown, so the next check character is drawn afresh.
export function resetReverse(): void {
  shownCheckChar = null;
}

export function renderReverse(element: HTMLElement, view: Extract<View, { kind: 'checkChar' }>): void {
  // Typing in the box fires for every key, so keep the aisle box (and what's
  // typed in it) while the check character stays the same.
  if (view.checkChar === shownCheckChar) return;
  shownCheckChar = view.checkChar;

  const heading = create('p', 'reverse-heading');
  const filter = create('div', 'aisle-filter');
  const filterLabel = create('label', '', 'Jump to aisle');
  const filterInput = create('input');
  const groups = create('div', 'location-groups');

  heading.append(
    create('strong', 'reverse-total', view.total.toLocaleString('en-GB')),
    create('span', 'reverse-text', (view.total === 1 ? ' location has' : ' locations have') + ' the check character ' + view.checkChar + '. Tap an aisle or a group to see which they are.')
  );

  filterLabel.htmlFor = 'aisle-filter';
  Object.assign(filterInput, {
    id: 'aisle-filter',
    type: 'text',
    inputMode: 'numeric',
    enterKeyHint: 'done',
    maxLength: 2,
    placeholder: 'All',
    autocomplete: 'off'
  });
  dismissKeyboardOnEnter(filterInput);
  filter.append(filterLabel, filterInput);

  function renderGroups(): void {
    const query = filterInput.value.replace(/\D/g, '');
    const shown = view.groups.map(group => renderGroup(group, query)).filter(group => group !== null);

    if (!shown.length) {
      groups.replaceChildren(create('p', 'aisles-empty', 'No locations in aisle ' + query + ' use ' + view.checkChar + '.'));
      return;
    }

    groups.replaceChildren(...shown);
  }

  filterInput.addEventListener('input', renderGroups);
  renderGroups();

  element.replaceChildren(heading, filter, groups);
}
