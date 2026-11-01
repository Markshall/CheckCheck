#!/usr/bin/env bash
# Purge the files a deploy changed from Cloudflare's cache. Run by deploy.sh.
#
# Usage: ./scripts/purge-cache.sh <rsync itemized output> [--dry-run]
#
# Settings come from the environment (deploy.sh loads .env):
#   CLOUDFLARE_ZONE_ID    the zone for the site
#   CLOUDFLARE_API_TOKEN  a token with only Zone → Cache Purge on that zone
#   SITE_URL              optional, defaults to https://www.mark-eriksson.com/check
# Without the Cloudflare settings it does nothing, so local deploys still work.
set -euo pipefail

cd "$(dirname "$0")/.."

changes=${1:?usage: purge-cache.sh <rsync output> [--dry-run]}
dry_run=${2:-}

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" || -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Cloudflare settings not set, skipping cache purge."
  exit 0
fi

site=${SITE_URL:-https://www.mark-eriksson.com/check}
site=${site%/}

# Files rsync sent ("<f" pushing to a server, ">f" locally). Files under
# assets/ have a content hash in their name, so a change gives them a new URL
# and the old cached copy is never requested again: they don't need purging.
# Deleted files are left alone for the same reason.
urls=()
while IFS= read -r path; do
  [[ "$path" == assets/* ]] && continue
  urls+=("$site/$path")
  if [[ "$path" == index.html || "$path" == */index.html ]]; then
    urls+=("$site/${path%index.html}")
  fi
done < <(sed -n 's/^[<>]f[^ ]* //p' "$changes")

if ((${#urls[@]} == 0)); then
  echo "No cached URLs changed, nothing to purge."
  exit 0
fi

# CI logs are public, so only print the count there.
if [[ -z "${CI:-}" ]]; then
  printf '  %s\n' "${urls[@]}"
fi

if [[ -n "$dry_run" ]]; then
  echo "Would purge ${#urls[@]} URL(s) from Cloudflare (dry run)."
  exit 0
fi

# Cloudflare accepts at most 30 URLs per purge request on the Free plan.
for ((i = 0; i < ${#urls[@]}; i += 30)); do
  body=$(printf '%s\n' "${urls[@]:i:30}" | jq -Rn '{files: [inputs]}')
  response=$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "$body")
  if [[ "$(jq -r '.success' <<<"$response")" != true ]]; then
    echo "Cloudflare cache purge failed:" >&2
    jq -r '.errors[]? | "  \(.code): \(.message)"' <<<"$response" >&2
    exit 1
  fi
done

echo "Purged ${#urls[@]} URL(s) from Cloudflare."
