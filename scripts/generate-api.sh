#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

git clone --depth 1 https://github.com/zeta-chain/ai-portal.git "$TMP_DIR/ai-portal"

openapi --input "$TMP_DIR/ai-portal/docs/swagger.json" --output "$REPO_ROOT/api"

