#!/usr/bin/env bash
set -o pipefail

ref=$1
dir=/tmp/$REPO-$ref
outcomes=/tmp/outcomes
mkdir -p "$outcomes"
cd "$dir" || exit 1

pm=npm
[ -f pnpm-lock.yaml ] && pm=pnpm
workspace_flag=()
[ "$pm" = pnpm ] && [ -f pnpm-workspace.yaml ] && workspace_flag=(-w)
tarball=$(ls /tmp/sdk-pack/sdk-"$ref"/*.tgz)

install_sdk() (
  if [ -n "${NPM_TOKEN:-}" ]; then
    cp .npmrc "$dir.npmrc.orig" 2>/dev/null || : > "$dir.npmrc.orig"
    trap 'cp "$dir.npmrc.orig" .npmrc; rm -f "$dir.npmrc.orig"' EXIT
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc
  fi
  "$pm" install || exit 1
  "$pm" add "${workspace_flag[@]}" "$tarball" || exit 1
)

build=failure
install_sdk && "$pm" run build && build=success
echo "$build" > "$outcomes/$REPO-$ref-build"
passed=$build

if [ "$E2E" = true ]; then
  e2e=skipped
  if [ "$build" = success ]; then
    e2e=failure
    "$pm" exec playwright install --with-deps chromium && "$pm" run test:e2e:light && e2e=success
  fi
  echo "$e2e" > "$outcomes/$REPO-$ref-e2e"
  [ "$e2e" = success ] || passed=failure
fi

echo "passed=$([ "$passed" = success ] && echo true || echo false)" >> "$GITHUB_OUTPUT"
