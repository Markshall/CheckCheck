#!/bin/sh
# Starts this checkout's dev server in Docker and prints its URL.
#
# The main checkout gets 5174, as before. Each worktree gets the next free
# port from 5175 up (5173 is the portfolio's), so several features can run at
# once. Compose names the project after the folder, so each worktree has its
# own container and node_modules volume. Running it again just prints the URL.
#
#   scripts/dev-worktree.sh                start, or print the URL if running
#   scripts/dev-worktree.sh --if-worktree  the same, but do nothing in the main checkout
#   scripts/dev-worktree.sh down           stop this checkout's server
set -eu
cd "$(dirname "$0")/.."

is_worktree() {
  [ "$(git rev-parse --path-format=absolute --git-dir)" != "$(git rev-parse --path-format=absolute --git-common-dir)" ]
}

case "${1:-}" in
  down) exec docker compose down ;;
  --if-worktree) is_worktree || exit 0 ;;
esac

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running, so the dev server wasn't started." >&2
  exit 1
fi

port=$(docker compose port web 5174 2>/dev/null | sed 's/.*://' || true)
if [ -n "$port" ]; then
  echo "Dev server already running for $(basename "$PWD"): http://localhost:$port"
  exit 0
fi

if is_worktree; then
  port=5175
  while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
else
  port=5174
fi

PORT=$port docker compose up -d --quiet-pull >/dev/null 2>&1 || {
  echo "docker compose up failed. Run 'PORT=$port docker compose up' to see why." >&2
  exit 1
}
echo "Dev server started for $(basename "$PWD"): http://localhost:$port (the first start installs packages, so give it a minute)"
