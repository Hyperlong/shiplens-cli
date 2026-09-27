#!/usr/bin/env bash
# Shiplens CLI — Automated Installer & Initializer (macOS & Linux)
# Copyright (c) 2026 Shiplens Team. Licensed under Apache-2.0.

set -euo pipefail

VERSION="v2.2.4"
OWNER_REPO="Hyperlong/shiplens-cli"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64)
        TARGET="shiplens-darwin-amd64"
        EXPECTED_HASH="992acf35928f898c62ace8927dc8ca50ab71671894a38f423e58cabbc34d4978"
        ;;
      arm64)
        TARGET="shiplens-darwin-arm64"
        EXPECTED_HASH="977d5d8500434631f3b6154af56a05881d2086fd7f3e0514a84cd90627f43936"
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
        EXPECTED_HASH="7a53e58bc51095e04b210fbddbef98b742aae12de3254ae503578347f1ab302c"
        ;;
      aarch64|arm64)
        TARGET="shiplens-linux-arm64"
        EXPECTED_HASH="ec1d80c999a5abc0182533248d4573f698c99090863bc31b789fcb741648bfa5"
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