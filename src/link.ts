// A lookup in the page's link, e.g. /check/#10AK, so a link (or a QR code
// stuck to a shelf) opens straight to it. It goes after the # rather than in
// a ?query, as the part after the # never reaches the server or Cloudflare:
// every link is the same cached page, online or off.

// The longest thing that can be typed in the box (NOVEMBER).
export const MAX_LENGTH = 8;

// What to put in the box for a link's hash ('#10AK', or '' for none), or
// null for a hash that isn't a lookup. AdSense adds #google_vignette when it
// shows a vignette ad, and anything longer than the box can't be a link to
// one of ours, so it's left alone rather than cut down to GOOGLE_V.
export function fromHash(hash: string): string | null {
  let value = hash.replace(/^#/, '');

  try {
    value = decodeURIComponent(value);
  } catch {
    // A stray % that isn't part of an escape. Use it as it is.
  }

  value = value.trim().toUpperCase();

  return value.length > MAX_LENGTH ? null : value;
}

// The hash for what's typed, or '' when the box is empty. + is left as it
// is (10A+ rather than 10A%2B), as it means nothing special after the #.
export function toHash(value: string): string {
  const trimmed = value.trim().toUpperCase();

  return trimmed ? '#' + encodeURIComponent(trimmed).replace(/%2B/g, '+') : '';
}
