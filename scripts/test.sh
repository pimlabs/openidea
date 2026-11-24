#!/usr/bin/env bash
# Tests: CLI unit tests, manifest validation, and every /openidea:* command resolves via the plugin loader.
# Usage: scripts/test.sh
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMANDS=(init capture blueprint evaluate resolve plan dashboard spec-draft compile export spec-audit)
NOISE='SessionEnd hook|node:internal|Module\.|Node\.js|^\s*at |code:|requireStack|^}$|throw err|Warning: no stdin'

echo "== CLI unit tests =="
if ! node --test "$DIR"/tests/*.test.mjs; then
  echo "FAIL: CLI unit tests"
  exit 1
fi

echo
echo "== plugin validate =="
if ! claude plugin validate "$DIR"; then
  echo "FAIL: manifest validation"
  exit 1
fi

fail=0
for cmd in "${COMMANDS[@]}"; do
  echo
  echo "== /openidea:$cmd =="
  out="$(cd /tmp && claude --plugin-dir "$DIR" -p "/openidea:$cmd" 2>&1 | grep -Ev "$NOISE")"
  echo "$out"
  if echo "$out" | grep -q "Unknown command"; then
    echo "FAIL: /openidea:$cmd not resolved"
    fail=1
  fi
done

echo
if [ "$fail" -eq 0 ]; then
  echo "All commands resolved."
else
  echo "One or more commands failed to resolve — see FAIL lines above."
  exit 1
fi
