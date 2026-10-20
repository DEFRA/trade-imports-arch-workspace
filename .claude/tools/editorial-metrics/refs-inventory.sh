#!/usr/bin/env bash
# refs-inventory.sh - size every reference document a process model lists:
# lines, words, characters and estimated tokens (characters / the calibrated
# characters per token in rates.json), with the roles that load it. Prints
# CSV to stdout.
#
# Usage:
#   bash refs-inventory.sh <process-model.json>
#
# The model's .references[] entries carry path (~ form) and loaded_by.
# Exit: 0 ok, 1 usage or missing input.

set -uo pipefail
export LC_ALL=C

die() { printf 'refs-inventory: %s\n' "$1" >&2; exit "${2:-1}"; }
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }
MODEL="${1:-}"
[[ -f "$MODEL" ]] || die "give the process model JSON (see --help)"
CPT=$(jq -r '.context_chars_per_token // 4' "$HOME/trade-imports-arch-workspace/.claude/tools/editorial-metrics/rates.json")

echo '"path","lines","words","chars","est_tokens","loaded_by"'
jq -r '.references[] | [.path, (.loaded_by | join("; "))] | @tsv' "$MODEL" | while IFS=$'\t' read -r p by; do
  f="${p/#\~/$HOME}"
  if [[ -f "$f" ]]; then
    read -r l w c < <(wc -l -w -c < "$f")
    printf '"%s",%s,%s,%s,%s,"%s"\n' "$p" "$l" "$w" "$c" "$(awk -v c="$c" -v r="$CPT" 'BEGIN { printf "%d", c / r }')" "$by"
  else
    printf '"%s",,,,,"%s (missing)"\n' "$p" "$by"
  fi
done
