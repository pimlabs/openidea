#!/usr/bin/env bash
# Smoke test: manifest validation + all 8 /openidea:* commands resolve via the plugin loader.
# Usage: scripts/test.sh
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMANDS=(init capture evaluate plan spec-draft compile export spec-audit)
NOISE='SessionEnd hook|cavemem|node:internal|Module\.|Node\.js|^\s*at |code:|requireStack|^}$|throw err|Warning: no stdin'

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
