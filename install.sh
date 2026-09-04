#!/usr/bin/env bash
# Shiplens CLI — Automated Installer (macOS & Linux)
# Copyright (c) 2026 Shiplens Team. Licensed under Apache-2.0.

set -euo pipefail

VERSION="v2.0.0"
OWNER_REPO="Hyperlong/shiplens-cli"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64)
        TARGET="shiplens-darwin-amd64"
        EXPECTED_HASH="fd35775220d10400ec082845e0d375e79e698126efcf2b5a15304537feb91885"
        ;;
      arm64)
        TARGET="shiplens-darwin-arm64"
        EXPECTED_HASH="48abebd324b98443ca45cccb79d19b658d27fe81743b56a1791bacf8973d79db"
        ;;
      *)
        echo "Error: Unsupported architecture $ARCH on Darwin." >&2
        exit 1
        ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64)
        TARGET="shiplens-linux-amd64"
        EXPECTED_HASH="3344a4f057661df3aadeb207e0e9864724b95487e06aeb960bd668dd1bc5ed05"
        ;;
      aarch64|arm64)
        TARGET="shiplens-linux-arm64"
        EXPECTED_HASH="cc89bd2b0bce810e46d6aeeb21031446b41f4295aadd5f857173c97c79ce608d"
        ;;
      *)
        echo "Error: Unsupported architecture $ARCH on Linux." >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Error: Unsupported operating system $OS." >&2
    exit 1
    ;;
esac

INSTALL_DIR="$HOME/.local/bin"
BINARY_PATH="$INSTALL_DIR/shiplens"

mkdir -p "$INSTALL_DIR"

NEED_DOWNLOAD=1
if [ -f "$BINARY_PATH" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    CURRENT_HASH=$(sha256sum "$BINARY_PATH" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    CURRENT_HASH=$(shasum -a 256 "$BINARY_PATH" | awk '{print $1}')
  else
    CURRENT_HASH=""
  fi

  if [ "$CURRENT_HASH" = "$EXPECTED_HASH" ]; then
    NEED_DOWNLOAD=0
  fi
fi

if [ "$NEED_DOWNLOAD" -eq 1 ]; then
  DOWNLOAD_URL="https://github.com/$OWNER_REPO/releases/download/$VERSION/$TARGET"
  TMP_FILE="$(mktemp)"

  echo "[Shiplens] Downloading native runtime ($TARGET)..."
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE"

  if command -v sha256sum >/dev/null 2>&1; then
    DOWNLOADED_HASH=$(sha256sum "$TMP_FILE" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    DOWNLOADED_HASH=$(shasum -a 256 "$TMP_FILE" | awk '{print $1}')
  else
    DOWNLOADED_HASH="$EXPECTED_HASH"
  fi

  if [ "$DOWNLOADED_HASH" != "$EXPECTED_HASH" ]; then
    rm -f "$TMP_FILE"
    echo "Error: Integrity check failed (checksum mismatch)." >&2
    exit 1
  fi

  mv "$TMP_FILE" "$BINARY_PATH"
  chmod +x "$BINARY_PATH"
  echo "[Shiplens] Installed successfully to $BINARY_PATH"
else
  echo "[Shiplens] Already up to date at $BINARY_PATH"
fi

echo ""
echo "Shiplens CLI $VERSION is ready! Run 'shiplens init' or 'shiplens --help' to get started."
