#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
MANIFEST_PATH="$SKILL_DIR/manifest.json"

PKG_NAME="@shiplens/cli"
if [ -f "$MANIFEST_PATH" ]; then
  PKG=$(grep -o '"npm_package": *"[^"]*"' "$MANIFEST_PATH" | head -n1 | cut -d'"' -f4 || true)
  if [ -n "$PKG" ]; then PKG_NAME="$PKG"; fi
fi

if ! npm install -g "$PKG_NAME" >/dev/null 2>&1; then
  echo "{\"ok\":false,\"error\":{\"code\":\"INSTALL_FAILED\",\"message\":\"npm install -g $PKG_NAME failed\"}}"
  exit 1
fi

BINARY=""
if command -v shiplens >/dev/null 2>&1; then
  BINARY="$(command -v shiplens)"
else
  npm_bin="$(npm root -g 2>/dev/null)/../bin/shiplens" || true
  if [ -x "$npm_bin" ]; then
    BINARY="$npm_bin"
  fi
fi

if [ -n "$BINARY" ] && [ -x "$BINARY" ]; then
  VER="$("$BINARY" --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")"
  echo "{\"ok\":true,\"installed\":true,\"binary_path\":\"$BINARY\",\"version\":\"$VER\",\"message\":\"Shiplens CLI installed successfully\"}"
  exit 0
else
  echo "{\"ok\":false,\"error\":{\"code\":\"BINARY_NOT_FOUND\",\"message\":\"Installation finished but binary not found in PATH\"}}"
  exit 1
fi
