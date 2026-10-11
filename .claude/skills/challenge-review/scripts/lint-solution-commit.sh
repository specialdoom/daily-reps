#!/usr/bin/env sh
# Commit lint for challenge-review: a review may only start once the day's
# solution has been committed as exactly `YYYY-MM-DD: solution`.
#
# Usage: lint-solution-commit.sh YYYY-MM-DD [ref]   (ref defaults to HEAD)
# Exit:  0 = solution commit found, 1 = not found, 2 = bad usage

date="$1"
ref="${2:-HEAD}"

if ! printf '%s' "$date" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
  echo "usage: lint-solution-commit.sh YYYY-MM-DD [ref]" >&2
  exit 2
fi

if ! git rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
  echo "lint-solution-commit: unknown ref '$ref'" >&2
  exit 2
fi

subject="$date: solution"
sha=$(git log "$ref" --format='%h %s' | awk -v s="$subject" '
  { h = $1; sub(/^[^ ]+ /, "") }
  $0 == s { print h; exit }
')

if [ -z "$sha" ]; then
  echo "FAIL: no commit with subject '$subject' on $ref" >&2
  echo "Commits for $date on $ref:" >&2
  git log "$ref" --format='  %h %s' | grep -F " $date" >&2 || echo "  (none)" >&2
  exit 1
fi

echo "OK: $sha $subject"
