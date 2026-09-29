#!/usr/bin/env bash
# Shiplens CLI — Automated Installer & Initializer (macOS & Linux)
# Copyright (c) 2026 Shiplens Team. Licensed under Apache-2.0.

set -euo pipefail

VERSION="v2.2.6"
OWNER_REPO="Hyperlong/shiplens-cli"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64)
        TARGET="shiplens-darwin-amd64"
        EXPECTED_HASH="17902dd896dbeeeebf358139fd21c90c96fa5afaa95a198e1cb340c4ae8eb822"
        ;;
      arm64)
        TARGET="shiplens-darwin-arm64"
        EXPECTED_HASH="9393aa7f3bb8a92754bb7c400170b92d86b3325667d880c798a720982ed5d47d"
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
        EXPECTED_HASH="206874a606a7953653eaf3d86a815c3a01f2869e508de53501a704d28b882b55"
        ;;
      aarch64|arm64)
        TARGET="shiplens-linux-arm64"
        EXPECTED_HASH="1e14268cbaa800ff819976c42b099246369b49f7e69c60d1822647f55c7f5950"
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

# Execute initialization in project directory
"$BINARY_PATH" init --json "$@"