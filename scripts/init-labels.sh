#!/usr/bin/env bash
# Creates all required labels for the PR enforcement workflow.
# Usage: ./scripts/init-labels.sh [owner/repo]
# Requires: gh CLI authenticated

set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

create_label() {
  local name="$1" color="$2" description="$3"
  if gh label list --repo "$REPO" --json name -q '.[].name' | grep -qx "$name"; then
    echo "  skip  $name (already exists)"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description"
    echo "  created  $name"
  fi
}

echo "==> Status labels (issues)"
create_label "status:needs-review" "FBCA04" "Waiting for maintainer review"
create_label "status:approved"     "0E8A16" "Approved — ready for a PR"
create_label "status:blocked"      "E4E669" "Blocked by another issue or decision"

echo "==> Type labels (PRs)"
create_label "type:bug"            "D73A4A" "Bug fix"
create_label "type:feature"        "A2EEEF" "New feature or enhancement"
create_label "type:refactor"       "84B6EB" "Code refactoring"
create_label "type:docs"           "0075CA" "Documentation only"
create_label "type:chore"          "E4E669" "Maintenance / tooling"
create_label "type:breaking-change" "B60205" "Breaking change"

echo "Done."
