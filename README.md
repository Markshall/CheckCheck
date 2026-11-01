# CheckCheck

A stockroom tool I built during my time working at Argos.

## What is it?
Argos' stockroom is built with shelves in aisles ranging from bay A (alpha) to bay Z (zulu).  This means, as you stand in an aisle, you'll start at A and work your way down to Z. Each letter is a 'bay' and each bay has at-most 26 shelves (again, A-Z).  When voicing stock away using the headsets, you are prompted to say a location to it. Location names are written on the shelving and you simply just read out what is on that shelf.

To stop stock becoming lost, shelves use what is known as a 'check character' that acts as a password to the specific shelf. If you were to say "`ONE ZERO ALPHA KILO`" to the headset, it may pick it up wrong as "`ZERO ONE ALPHA KILO`" due to the headsets not always being accurate. The headset doesn't repeat back to you what you have said as the location, so you assume the stock is being voiced to wherever you have said. This is where the check character comes in to play. The check character for `ONE ZERO ALPHA KILO` will be different to the one for `ZERO ONE ALPHA KILO`, so when voicing stock, the headset will tell you it is the incorrect check character.

Now the boring stuff is out of the way, the main reason I built this is because a location name may be missing off a shelf and you need to obtain its check character; how are you going to do it with no check character written on the shelf? Easy, just punch in the location name to this web-app and it will tell you its check character.

It's also useful for stores which have multiple floors.  If a store has 2 floors, and aisles 1-40 are on the ground floor and aisles 41-70 are on the top floor whilst you are on the ground floor, you can grab the check character for a top floor location whilst you are downstairs, saving you having to go upstairs and find it manually.

This web-app has saved many people lots of time pointlessly going to locations when they aren't needed, or reluctantly going through every letter of the phonetic alphabet to find the correct check character if it is missing from a shelf.

## Usage
Type a location into the box and its check character is shown underneath. Letters can be upper or lower case.

| You type | Example | Read out as |
| --- | --- | --- |
| Aisle, bay and shelf | `10AK` | ONE ZERO ALPHA KILO |
| After / before a location (`+` / `-`) | `10A+` | AFTER ONE ZERO ALPHA |
| Jewellery (`J`) | `J1PG` | JEWELLERY ONE PAPA GOLF |
| Security (`S`) | `S1PG` | SECURITY ONE PAPA GOLF |
| Linbin (`L`) | `L10A` | ONE ZERO LINBIN ALPHA |
| Bulk (`Z`) | `Z10A` | ONE ZERO BULK ALPHA |
| Cash office (`CA`) | `CA12` | CASH OFFICE ONE TWO |
| Collection point (`CP`) | `CP12` | COLLECTION POINT ONE TWO |
| Returns | `RETS` or `RETURNS` | RETURNS |
| DPA / SOB | `DPA`, `SOB` | DPA, SOB |

Four letters (e.g. `ABCD`) show both the store and the RFC check character.

While a location is half typed the label says to keep typing, and it says when what's typed can't be a location (e.g. `XQ9`). A location in none of the formats above, or with more than four characters, still gets a check character, with a note underneath.

If another location has the same check character and is only one mistake away (a misheard character, e.g. `07AZ` and `J7AZ`, or two swapped, e.g. `L10A` and `L01A`), it's listed underneath. The headset accepts either, so stock voiced to one may really be at the other. Four letter locations are compared with other four letter locations on both their Store and RFC check characters. Swapping the middle two letters (e.g. `ABCD` and `ACBD`) never changes either, so almost every one has a match.

Lookups you've stayed on for a moment are listed under the box while it's empty, with their check characters, so they can be read or tapped again. They're kept in the browser's local storage and never leave the phone.

Type a check character instead (e.g. `NOVEMBER`) to list every location that uses it, in each format in the table above except four letters (there are 456,976 of those). Shelves from `00AA` to `99ZZ` are shown by aisle, and the other kinds (jewellery, linbin and so on) open when tapped. The start of one (e.g. `NOV`) offers it as a button, and the aisle box jumps to one aisle.

## Offline
CheckCheck works with no signal once it has been opened, and phones can add it to the home screen. `public/sw.js` is a service worker that caches the page, its built CSS and JS, and the font (served from `assets/` rather than Google Fonts). The page comes from the network when it can, so a deploy shows up straight away, and from the cache when the network is down or takes more than 3 seconds. It only runs in the built app, not the dev server.

The icons in `public/icons/` are drawn in `icon.svg`. `icon-maskable-512.png` is the same drawing scaled to 80%, so Android can crop it to a circle.

## How it works
CheckCheck takes the location the user enters and splits it digit by digit.  Argos use a formula which determines check characters for locations which involves quite a bit of maths, I simply took this and used it to my advantage to make this app.

The formulas live in `src/checkchar.ts`. `src/lookup.ts` decides what to show for what's typed, and `src/app.ts` draws it on the page. Only `app.ts` touches the page, so the other two are tested directly.

## Development
The app is written in TypeScript and built with [Vite](https://vite.dev). Run the dev server in Docker:

```
docker compose up
```

then open http://localhost:5174. Or, with Node 24 or later, run `npm install` and `npm run dev`.

`npm run build` type checks the code and writes the built app to `dist/`, and `npm run preview` serves it. `npm run typecheck` only type checks.

## Tests
```
npm test
```

## Deploying
CheckCheck is served at [www.mark-eriksson.com/check/](https://www.mark-eriksson.com/check/), inside the portfolio's web root, so the portfolio's `.htaccess` applies here too. It leaves `/check/` out of its Content-Security-Policy and caching rules, and the portfolio's deploy leaves the `check/` folder alone.

Pull requests into `master` run `.github/workflows/check.yml`, which runs the tests, type checks and builds the app, but never deploys. Only the merge deploys. [Dependabot](https://docs.github.com/en/code-security/dependabot) (`.github/dependabot.yml`) opens dependency PRs every Monday, and they go through the same check.

Pushing to `master` runs `.github/workflows/deploy.yml` when the push touches something that affects the built app (`index.html`, `css/`, `src/`, `public/`, dependencies, the Vite or TypeScript config, or the deploy scripts and workflow). README-only commits don't deploy. You can also run it by hand from the Actions tab. The workflow tests, type checks and builds the app, then uploads `dist/` with rsync over SSH. The server's SSH port is firewalled, so the runner joins the tailnet first and connects to the server's Tailscale address, the same way the portfolio deploys. It needs these repository secrets:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Server's Tailscale IP (`tailscale ip -4`) |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_PATH` | The `check/` folder, e.g. `/var/www/mark-eriksson.com/check` |
| `DEPLOY_PORT` | Optional, defaults to 22 |
| `DEPLOY_SSH_KEY` | Private key for a deploy-only key pair |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan <DEPLOY_HOST>` |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID (auth keys write scope, tag `tag:ci`) |
| `TS_OAUTH_SECRET` | Tailscale OAuth client secret |
| `CLOUDFLARE_ZONE_ID` | Optional, Cloudflare zone ID for the site |
| `CLOUDFLARE_API_TOKEN` | Optional, token with only Zone → Cache Purge |

To deploy by hand, copy `.env.example` to `.env`, fill it in, then:

```
./scripts/deploy.sh -n   # dry run
npm run deploy           # build + upload
```

The upload uses `rsync --delete`, so anything in the `check/` folder that isn't in `dist/` is removed. `deploy.sh` refuses to run unless `DEPLOY_PATH` ends in `/check`, so it can't wipe the portfolio by mistake.

`public/.htaccess` sets cache headers. Built CSS and JS go in `assets/` with a content hash in their names, so they're cached for good and a change gets a new URL. Browsers check for a new `index.html` every time, and Cloudflare keeps it for up to 4 hours. `sw.js` and `manifest.webmanifest` are checked like `index.html`, and the icons are cached for a day like the logo. After the upload, any changed file that keeps its URL (`index.html`, `sw.js`, the icons) is purged from Cloudflare's cache. The purge only runs when both Cloudflare settings are set. Old links to `index.php` redirect to `/check/`.

## Privacy
The page loads Google Tag Manager and AdSense. In the UK, EEA and Switzerland, [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) defaults (at the top of `index.html`) stop them storing anything until the visitor agrees in Google's consent message. That message is set up in AdSense under Privacy & messaging, not in this repo.

## Issues
Any issues should be reported to markeriksson94@live.co.uk or [filed here](https://github.com/Markshall/CheckCheck/issues).
