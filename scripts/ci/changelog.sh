#!/usr/bin/env bash
# DeepaBMS - Changelog generator from git history.
# Extracts commits since the last tag and categorizes by Conventional Commit type.
# Outputs Markdown. Usage: scripts/ci/changelog.sh [<previous-tag>] [<current-ref>]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

FROM_REF="${1:-}"
TO_REF="${2:-HEAD}"

if [[ -z "$FROM_REF" ]]; then
  FROM_REF="$(git describe --tags --abbrev=0 2>/dev/null || echo "")"
fi

if [[ -n "$FROM_REF" ]]; then
  RANGE="${FROM_REF}..${TO_REF}"
else
  RANGE="${TO_REF}"
fi

echo "# Changelog"
echo
echo "**$(date +'%Y-%m-%d')** — $(git rev-parse --short "$TO_REF" 2>/dev/null || echo "HEAD")"
echo

declare -a FEATURES=()
declare -a FIXES=()
declare -a DOCS=()
declare -a REFACTORS=()
declare -a TESTS=()
declare -a CHORES=()
declare -a OTHERS=()

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  subject="${line#*: }"
  case "$line" in
    feat*:*|feature*:*)
      FEATURES+=("$subject");;
    fix*:*)
      FIXES+=("$subject");;
    docs*:*)
      DOCS+=("$subject");;
    refactor*:*)
      REFACTORS+=("$subject");;
    test*:*|tests*:*)
      TESTS+=("$subject");;
    chore*:*)
      CHORES+=("$subject");;
    *)
      OTHERS+=("$subject");;
  esac
done < <(git log "$RANGE" --pretty=format:'%s' 2>/dev/null)

emit_section() {
  local title="$1"; shift
  local -n arr="$1"
  if [[ ${#arr[@]} -gt 0 ]]; then
    echo "### $title"
    echo
    for item in "${arr[@]}"; do
      echo "- $item"
    done
    echo
  fi
}

emit_section "Features" FEATURES
emit_section "Bug Fixes" FIXES
emit_section "Documentation" DOCS
emit_section "Refactoring" REFACTORS
emit_section "Tests" TESTS
emit_section "Chores" CHORES
emit_section "Other" OTHERS
