#!/usr/bin/env bash
# Shiplens CLI 鈥?Automated Installer & Initializer (macOS & Linux)
# Copyright (c) 2026 Shiplens Team. Licensed under Apache-2.0.

set -euo pipefail

VERSION="v2.3.1"
OWNER_REPO="Hyperlong/shiplens-cli"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64)
        TARGET="shiplens-darwin-amd64"
        EXPECTED_HASH="845de4914535efb17a6270d240d9df9d45395ebc7c8d3ce74850304749f89ccf"
        ;;
      arm64)
        TARGET="shiplens-darwin-arm64"
        EXPECTED_HASH="be48def07ecb82e6a3a2061d17247c21b045cb56231903885b3b997c9a2a809c"
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
        EXPECTED_HASH="91f4983357f8b3b6f0b95c8fec9a165365daecc21081236ae28e569de713e08d"
        ;;
      aarch64|arm64)
        TARGET="shiplens-linux-arm64"
        EXPECTED_HASH="5b14a9c3dce2043a91b246afe2fee6a5813ad16445848d247f19e128e548ff9d"
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
fi

# Launch developer manual in the browser
"$BINARY_PATH" manual "$@"