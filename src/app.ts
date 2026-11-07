// Wires the page together: the box, the link, examples and the theme.
// render.ts draws what lookup.ts decides to show.
import { track } from './analytics.ts';
import type { Settled } from './analytics.ts';
import { dismissKeyboardOnEnter, find } from './dom.ts';
import { fromHash, toHash } from './link.ts';
import { lookup } from './lookup.ts';
import { renderPrint } from './print.ts';
import { addRecent, loadRecent, saveRecent } from './recent.ts';
import { render } from './render.ts';
import type { Actions } from './render.ts';
import { setUpThemeToggle } from './theme-toggle.ts';

const input = find<HTMLInputElement>('#location-name');
const checkCharOutput = find<HTMLButtonElement>('#check-char');
let recent = loadRecent();
let settleTimer: number | undefined;

// How long a lookup has to stay in the box before it's tracked and
// remembered, so the steps on the way (1, 10, 10A) aren't.
const SETTLE_AFTER = 1500;

const actions: Actions = {
  pick(value) {
    input.value = value;
    update(true);
  },
  clearRecent() {
    recent = [];
    saveRecent(recent);
  }
};

function remember(value: string): void {
  recent = addRecent(recent, value);
  saveRecent(recent);
}

// A lookup that's stayed in the box, or was tapped: tracked, and kept in
// recent lookups if it's a whole one (a known location, or a check
// character) rather than the start of one, like NOVE.
function settle(value: string, view: Settled): void {
  track(value, view);
  if ((view.kind === 'location' && view.note === null && !view.suggestions.length) || view.kind === 'checkChar') {
    remember(value);
  }
}

// now: settle straight away, for a tap or the Done key, rather than after
// SETTLE_AFTER.
function update(now = false): void {
  const value = input.value.trim().toUpperCase();
  const view = lookup(value);

  input.classList.toggle('is-long', value.length > 5);
  render(view, recent, actions);
  renderPrint(value, view);
  updateLink(value);

  window.clearTimeout(settleTimer);
  if (view.kind === 'location' || view.kind === 'checkChar') {
    if (now) {
      settle(value, view);
    } else {
      settleTimer = window.setTimeout(() => settle(value, view), SETTLE_AFTER);
    }
  }
}

// The link follows what's typed, so it can be copied or shared from the
// browser. Replaced rather than added to, so Back leaves the page rather
// than stepping back through every key.
function updateLink(value: string): void {
  const hash = toHash(value);

  if (hash !== location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search + hash);
  }
}

// A link like /check/#10AK looks it up straight away, as if it was tapped.
// A hash that isn't a lookup (e.g. #google_vignette) leaves the box as it is.
function openLink(): boolean {
  const value = fromHash(location.hash);
  if (value === null) return false;

  input.value = value;
  update(true);
  return true;
}

input.addEventListener('input', () => update());
dismissKeyboardOnEnter(input, () => update(true));

// An example looks itself up, as if it was typed, and the page goes back
// up to the label to show it.
document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(function (button) {
  button.addEventListener('click', function () {
    actions.pick(button.dataset.example ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Tapping the strip selects what's typed, ready for the next location.
checkCharOutput.addEventListener('click', function () {
  input.focus();
  input.select();
});

window.addEventListener('hashchange', openLink);

// Otherwise the browser may refill the box when coming back to the page.
if (!location.hash || !openLink()) {
  update();
}

setUpThemeToggle();

// Cache the app so it opens with no signal (see public/sw.js). Not in
// development, where the cache would serve stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(function (error: unknown) {
    console.warn('CheckCheck will not work offline:', error);
  });
}
