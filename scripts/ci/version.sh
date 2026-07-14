#!/usr/bin/env bash
# DeepaBMS - Semver version resolver from git tags.
# Outputs version/major/minor/patch/prerelease for CI consumption.
# Usage: source scripts/ci/version.sh (sets env vars) or run directly to echo.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

# Prefer annotated/latest tag; fall back to v0.0.0 if none.
LATEST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")"

# Full describe includes commits since tag for dirty builds.
DESCRIBE="$(git describe --tags --always 2>/dev/null || echo "$LATEST_TAG")"

# Strip leading 'v'.
VERSION_RAW="${DESCRIBE#v}"

# Split into version core and prerelease (anything after first '-').
if [[ "$VERSION_RAW" == *"-"* ]]; then
  VERSION_CORE="${VERSION_RAW%%-*}"
  PRERELEASE="${VERSION_RAW#*-}"
else
  VERSION_CORE="$VERSION_RAW"
  PRERELEASE=""
fi

# Parse major.minor.patch (guard against non-numeric suffixes).
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION_CORE"
MAJOR="${MAJOR:-0}"
MINOR="${MINOR:-0}"
PATCH="${PATCH:-0}"

# Build a clean semver; append prerelease if present.
if [[ -n "$PRERELEASE" ]]; then
  VERSION="${VERSION_CORE}-${PRERELEASE}"
else
  VERSION="$VERSION_CORE"
fi

# If working tree is dirty, mark prerelease.
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  DIRTY_SUFFIX="-dirty.$(git rev-parse --short HEAD)"
  VERSION="${VERSION}${DIRTY_SUFFIX}"
  PRERELEASE="${PRERELEASE}${DIRTY_SUFFIX}"
fi

if [[ "${1:-}" == "--export" ]]; then
  export VERSION MAJOR MINOR PATCH PRERELEASE
  return 0 2>/dev/null || true
fi

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  # Direct invocation: echo values.
  echo "version=$VERSION"
  echo "major=$MAJOR"
  echo "minor=$MINOR"
  echo "patch=$PATCH"
  echo "prerelease=$PRERELEASE"
else
  {
    echo "version=$VERSION"
    echo "major=$MAJOR"
    echo "minor=$MINOR"
    echo "patch=$PATCH"
    echo "prerelease=$PRERELEASE"
  } >> "$GITHUB_OUTPUT"
fi
