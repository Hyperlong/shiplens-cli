#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
MANIFEST_PATH="$SKILL_DIR/manifest.json"

fail_pkg() {
  echo "{\"ok\":false,\"error\":{\"code\":\"INVALID_PACKAGE\",\"message\":\"$1\"}}"
  exit 7
}

[ -f "$MANIFEST_PATH" ] || fail_pkg "manifest.json is missing"

SKILL_VERSION=$(grep -o '"version": *"[^"]*"' "$MANIFEST_PATH" | head -n1 | cut -d'"' -f4 || true)
MIN_VERSION=$(grep -o '"min_version": *"[^"]*"' "$MANIFEST_PATH" | head -n1 | cut -d'"' -f4 || true)

find_binary() {
  if command -v shiplens >/dev/null 2>&1; then
    command -v shiplens
    return
  fi
  local npm_bin
  npm_bin="$(npm root -g 2>/dev/null)/../bin/shiplens" || true
  if [ -x "$npm_bin" ]; then
    echo "$npm_bin"
    return
  fi
  echo ""
}

BINARY="$(find_binary)"

test_ready() {
  [ -n "$BINARY" ] && [ -x "$BINARY" ]
}

if [ "${1:-}" = "status" ]; then
  if test_ready; then
    VER="$("$BINARY" --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")"
    echo "{\"ok\":true,\"installed\":true,\"binary_path\":\"$BINARY\",\"version\":\"$VER\",\"skill\":{\"current_version\":\"$SKILL_VERSION\",\"min_cli_version\":\"$MIN_VERSION\"},\"next_action\":\"ready\"}"
  else
    echo "{\"ok\":true,\"installed\":false,\"skill\":{\"current_version\":\"$SKILL_VERSION\",\"min_cli_version\":\"$MIN_VERSION\"},\"next_action\":\"request_install_consent\"}"
  fi
  exit 0
fi

if [ "${1:-}" = "setup" ]; then
  shift || true
  exec bash "$SCRIPT_DIR/setup.sh" "$@"
fi

if ! test_ready; then
  echo "{\"ok\":false,\"error\":{\"code\":\"CLI_NOT_INSTALLED\",\"message\":\"Run scripts/setup.sh after user approves installation\"}}"
  exit 7
fi

exec "$BINARY" "$@"
