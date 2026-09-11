#!/bin/bash
# grade-triage.sh - calibrate a triage run and close it: sample clusters into labelling rounds, record the user's closing moves, measure agreement with a grader, score the run, then plan the closing moves and apply them to the pages.
# Boundary - grade reads triage.json, findings.json and manifest.json and writes under <run>/calibration/ (round-<n>.json, round-<n>.md, labels.json, agree-round-<n>.json, score.json) and <run>/closing/ (plan.json, plan.md, spot-check.json, applied.json); apply is the one subcommand that writes outside the workarea, editing the page files the manifest names. build owns the rest of the workarea.
#
# Usage:
#   grade-triage.sh sample --dir <run> --round <n> [--size 10] [--seed 42] [--targets '<json>'] [--force]
#   grade-triage.sh render --dir <run> --round <n>
#   grade-triage.sh label  --dir <run> --round <n> --labels "<string>"
#   grade-triage.sh agree  --dir <run> --round <n>
#   grade-triage.sh score  --dir <run>
#   grade-triage.sh plan   --dir <run> [--sample <n>] [--seed 42]
#   grade-triage.sh apply  --dir <run> [--dry-run] [--moves RCW] [--force] [--no-spot-check]
#
# Moves: R remove, C correct, W reword, K keep one side (A the card's text,
# B the related statement), O record as open, I ignore for now, T tell me
# what to do. A card offers every move meaningful for its record and marks
# a default: the grader's move when calibration/grades/ holds one for the
# cluster, else the rubric's preference (lib/grade.jq, offered, default_move).
# sample draws --size clusters not held by an earlier round, spread across
# categories (<bucket>/<reason>) by per-category targets (--targets merges
# over the defaults in lib/grade.jq; unlisted categories get 2). Targets
# are cumulative: a category's remaining target is its target minus what
# earlier rounds drew from it, so pass the same --targets on every round.
# S1 and S2 come first, then a shuffle seeded by --seed; writes
# calibration/round-<n>.json (with the per-category accounting) and one
# card per item in round-<n>.md. An existing round is refused without
# --force.
# render rewrites an existing round's items and cards from the current
# triage.json and findings.json: the same clusters in the same order, the
# card shape of this version.
# label parses "<n> <M> [note]" entries separated by ";" or newline: n is
# the card number, M is R C W K O I T (case-insensitive), K may be K:A or
# K:B, T needs a note. A string with any bad entry is refused whole; a
# re-label of a cluster overwrites and is reported.
# agree compares the labels with the grader files calibration/grades/*.json
# (a cluster graded in several files takes the later file by name) over
# round <n>: move agreement, side agreement where both chose K, one
# confusion table; writes calibration/agree-round-<n>.json. Equivalent
# moves count as agreement: a C or W whose text is the removal counts as
# R, and on a contradiction an R of side A counts as K:B (and the reverse).
# score measures every graded cluster in triage.json, overall and per page:
# counts by move, closed without the user (R, C, W), ignored (I), load
# (K, O, T), coverage; writes calibration/score.json.
# plan turns every cluster into the one move that closes it, taking the
# move from calibration/labels.json, else from calibration/grades/*.json
# (later file by name wins, a label wins over a grade). R carries the
# span to remove, C and W the before and after, K the surviving side and
# the side that goes, O the open point with its owner, T the user's
# instruction, I nothing. A cluster with no move, a C or W whose record
# carries no rewrite, and a move that edits a page the manifest does not
# name go to problems with the reason. Writes closing/plan.json and
# closing/plan.md; --sample <n> adds a spot check of n apply entries drawn
# with --seed and writes closing/spot-check.json.
# apply edits the plan's R, C and W entries into the page files the
# manifest names, page by page in descending line order. Each entry is
# re-resolved by phrase and applied only when the phrase occurs exactly
# once; absent or repeated, it is skipped with the reason. R removes the
# span and tidies what the removal leaves (doubled spaces, a doubled
# comma, a space before a comma or full stop, a line left empty inside a
# list). K, O, T and I are never applied. Every changed page then runs
# check-prose.sh and its FAIL lines are reported; entries applied to a
# failing page carry status gate-fail. Writes closing/applied.json.
# --dry-run reports what would change and writes nothing. --moves takes a
# subset of R, C and W. Two separate refusals, each with its own override,
# because the ordinary run needs one and not the other: apply refuses until
# a spot check has been drawn against the plan in hand (--no-spot-check),
# and refuses a working tree holding uncommitted changes under the pages'
# directory (--force).
# A manifest page path is taken as written when absolute, expanded when it
# starts with ~, and resolved against the run directory when relative.
# Exit 0 done; 1 usage, missing input or a refused string (the message
# names the remedy); 2 nothing to measure (agree: no cluster in the round
# has both a label and a grade; score: no grades) or, for apply, a changed
# page that fails the prose gate.
#
# Atomic mutations: write to .tmp then mv.
# Solve, don't defer: handle missing prerequisites with a specific
# remedy in the error message, never a raw failure.

set -uo pipefail
export LC_ALL=C

WS="$HOME/trade-imports-arch-workspace"
TOOLS="$WS/.claude/tools/editorial-triage"
LIB="$TOOLS/lib"
RUBRIC="$WS/.claude/skills/editorial-triage/assets/grading-rubric.md"
GATE="$WS/.claude/tools/editorial/check-prose.sh"
SELF="bash ~/trade-imports-arch-workspace/.claude/tools/editorial-triage/grade-triage.sh"
TILDE='~'

usage() { sed -n '2,75p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'grade-triage: %s\n' "$1" >&2; exit "${2:-1}"; }
# Paths in messages and remedy commands take the ~ form the workspace contract asks for.
show() { printf '%s' "${1/#$HOME/$TILDE}"; }

SUBS="sample, render, label, agree, score, plan or apply"
SUB="${1:-}"
case "$SUB" in
    sample|render|label|agree|score|plan|apply) shift ;;
    -h|--help) usage; exit 0 ;;
    "") die "a subcommand is required: $SUBS (see --help)" ;;
    *) die "unknown subcommand '$SUB'; use $SUBS (see --help)" ;;
esac

DIR="" ROUND="" SIZE=10 SEED=42 TARGETS='{}' FORCE=false LABELS="" SAMPLE="" MOVES="RCW" DRYRUN=false NOSPOT=false
CLUSTER="" MOVE="" NOTE="" SPAN=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dir) [[ $# -ge 2 ]] || die "--dir needs a value"; DIR=$2; shift 2 ;;
        --round) [[ $# -ge 2 ]] || die "--round needs a value"; ROUND=$2; shift 2 ;;
        --size) [[ $# -ge 2 ]] || die "--size needs a value"; SIZE=$2; shift 2 ;;
        --seed) [[ $# -ge 2 ]] || die "--seed needs a value"; SEED=$2; shift 2 ;;
        --targets) [[ $# -ge 2 ]] || die "--targets needs a JSON object"; TARGETS=$2; shift 2 ;;
        --labels) [[ $# -ge 2 ]] || die "--labels needs a value"; LABELS=$2; shift 2 ;;
        --sample) [[ $# -ge 2 ]] || die "--sample needs a value"; SAMPLE=$2; shift 2 ;;
        --moves) [[ $# -ge 2 ]] || die "--moves needs a value"; MOVES=$2; shift 2 ;;
        --dry-run) DRYRUN=true; shift ;;
        --force) FORCE=true; shift ;;
        --no-spot-check) NOSPOT=true; shift ;;
        --cluster) [[ $# -ge 2 ]] || die "--cluster needs a value"; CLUSTER=$2; shift 2 ;;
        --move) [[ $# -ge 2 ]] || die "--move needs a value"; MOVE=$2; shift 2 ;;
        --note) [[ $# -ge 2 ]] || die "--note needs a value"; NOTE=$2; shift 2 ;;
        --span) [[ $# -ge 2 ]] || die "--span needs a value"; SPAN=$2; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) die "unknown argument '$1' for $SUB (see --help)" ;;
    esac
done

[[ -n "$DIR" ]] || die "--dir <run> is required, for example --dir ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<run>"
DIR="${DIR/#\~/$HOME}"
DIR="${DIR%/}"
SDIR=$(show "$DIR")
[[ -d "$DIR" ]] || die "workarea not found: $SDIR. Run build-triage.sh first to create the run directory."
NEED="triage.json findings.json"
# plan reads the manifest for the page order and the page paths; apply edits the files it names.
case "$SUB" in plan|apply) NEED="$NEED manifest.json" ;; esac
for f in $NEED; do
    [[ -f "$DIR/$f" ]] || die "$SDIR/$f is missing. Run build-triage.sh --dir $SDIR to produce it."
    jq -e . "$DIR/$f" > /dev/null 2>&1 || die "$SDIR/$f is not valid JSON. Re-run build-triage.sh --dir $SDIR."
done
[[ -f "$LIB/grade.jq" ]] || die "grade.jq not found at $(show "$LIB"). Restore the file from git."
CAL="$DIR/calibration"
SCAL="$SDIR/calibration"
CLOSING="$DIR/closing"
SCLOSING="$SDIR/closing"

TMP=$(mktemp -d "${TMPDIR:-/tmp}/grade-triage.XXXXXX") || die "mktemp failed"
trap 'rm -rf "$TMP"' EXIT

need_round() {
    [[ -n "$ROUND" ]] || die "--round <n> is required for $SUB"
    [[ "$ROUND" =~ ^[1-9][0-9]*$ ]] || die "--round must be a whole number from 1, got '$ROUND'"
    ROUND_JSON="$CAL/round-$ROUND.json"
    ROUND_MD="$CAL/round-$ROUND.md"
}

require_round_file() {
    [[ -f "$ROUND_JSON" ]] || die "round $ROUND not found at $SCAL/round-$ROUND.json. Sample it first: $SELF sample --dir $SDIR --round $ROUND"
    jq -e '.items | type == "array"' "$ROUND_JSON" > /dev/null 2>&1 \
        || die "$SCAL/round-$ROUND.json is not a round file (no items array). Re-sample with: $SELF sample --dir $SDIR --round $ROUND --force"
}

# Optional labels.json: a present file must parse; an absent one is empty.
stage_labels() {
    if [[ -f "$CAL/labels.json" ]]; then
        jq -e 'type == "object"' "$CAL/labels.json" > /dev/null 2>&1 \
            || die "$SCAL/labels.json is not a JSON object. Fix the file, or remove it to start the labels afresh."
        cp "$CAL/labels.json" "$TMP/labels.json"
    else
        printf '{"labels": {}}\n' > "$TMP/labels.json"
    fi
}

# Grader files under calibration/grades/, name order, into $TMP/grades.json as {grades: {cluster: grade}}.
# Sets GRADE_COUNT to the number of files read. $1 is strict (agree, score: a bad
# code refuses the run) or lenient (sample, render: bad items are reported and
# skipped, so a grader slip never blocks a round).
stage_grades() {
    local mode=${1:-strict}
    GRADE_COUNT=0
    GRADE_FILES=()
    if [[ -d "$CAL/grades" ]]; then
        while IFS= read -r f; do
            [[ -n "$f" ]] || continue
            jq -e 'type == "object"' "$f" > /dev/null 2>&1 || die "$(show "$f") is not a JSON object. Fix the grader file or remove it and re-run."
            GRADE_FILES+=("$f")
        done < <(find "$CAL/grades" -maxdepth 1 -name '*.json' -type f | sort)
    fi
    GRADE_COUNT=${#GRADE_FILES[@]}
    if [[ "$GRADE_COUNT" -eq 0 ]]; then
        printf '{"grades": {}, "errors": []}\n' > "$TMP/grades.json"
        return 0
    fi
    jq -n -L "$LIB" 'include "grade"; [inputs | {file: input_filename, doc: .}] | grades_index' ${GRADE_FILES[@]+"${GRADE_FILES[@]}"} > "$TMP/grades.json" \
        || die "could not read the grader files under $SCAL/grades/ (see the jq error above)."
    if jq -e '.errors | length > 0' "$TMP/grades.json" > /dev/null 2>&1; then
        jq -r '.errors[] | "grade-triage: " + .' "$TMP/grades.json" >&2
        if [[ "$mode" == strict ]]; then
            die "the grader files above carry moves outside R C W K O I T or a side outside A and B; fix them and re-run $SUB."
        fi
        printf 'grade-triage: the grader items above are skipped for the card defaults; fix them before agree or score.\n' >&2
    fi
    # Every grade cites a heuristic, and the rubric is the only place a heuristic
    # is defined. A grade citing an id the rubric does not hold means the grader
    # worked from a rule that has been renamed or deleted, so the reasoning behind
    # that grade is worth re-reading. Warn rather than refuse: the move may still
    # be right, and a run in progress should not stop on a citation.
    local unknown
    unknown=$(jq -r '[.grades[] | .heuristic // empty] | unique | .[]' "$TMP/grades.json" 2> /dev/null \
        | while IFS= read -r h; do
            [[ -n "$h" ]] || continue
            # A retired entry documents an id for readers without reinstating the
            # rule, so a grade citing one is as suspect as a grade citing nothing.
            if grep -q -F -- "**$h Retired" "$RUBRIC" 2> /dev/null; then
                printf '%s ' "$h"
            elif ! grep -q -F -- "**$h " "$RUBRIC" 2> /dev/null; then
                printf '%s ' "$h"
            fi
        done)
    local uncited
    uncited=$(jq -r '[.grades[] | select((.heuristic // "") == "") | .cluster] | length' "$TMP/grades.json" 2> /dev/null)
    if [[ -n "$unknown" ]]; then
        printf 'grade-triage: warning: grades cite %sthat the rubric does not define or has retired. Check whether the rule was renamed or removed: %s\n' \
            "$unknown" "$(show "$RUBRIC")" >&2
    fi
    if [[ -n "$uncited" && "$uncited" != "0" ]]; then
        printf 'grade-triage: warning: %s grade(s) cite no heuristic at all, so nothing ties them to the shared definition.\n' "$uncited" >&2
    fi
}

atomic_json() {  # $1 target path; stdin JSON
    jq '.' > "$1.tmp" || die "could not write $(show "$1").tmp (check the directory is writable)."
    mv -f "$1.tmp" "$1" || die "could not move $(show "$1").tmp into place."
}

# Write $TMP/round.json and its cards to round-<n>.json and round-<n>.md.
write_round() {
    jq -r -L "$LIB" --arg run "$RUN" 'include "grade"; round_md($run)' "$TMP/round.json" > "$TMP/round.md" \
        || die "could not render the cards for round $ROUND (see the jq error above)."
    atomic_json "$ROUND_JSON" < "$TMP/round.json"
    cp "$TMP/round.md" "$ROUND_MD.tmp" || die "could not write $SCAL/round-$ROUND.md.tmp (check the directory is writable)."
    mv -f "$ROUND_MD.tmp" "$ROUND_MD" || die "could not move $SCAL/round-$ROUND.md.tmp into place."
}

RUN=$(basename "$DIR")
if [[ -f "$DIR/manifest.json" ]]; then
    RUN=$(jq -r --arg d "$RUN" '.run // .slug // $d' "$DIR/manifest.json" 2> /dev/null || printf '%s' "$RUN")
fi

# ---------------------------------------------------------------- sample
sub_sample() {
    need_round
    [[ "$SIZE" =~ ^[1-9][0-9]*$ ]] || die "--size must be a whole number from 1, got '$SIZE'"
    [[ "$SEED" =~ ^-?[0-9]+$ ]] || die "--seed must be an integer, got '$SEED'"
    printf '%s' "$TARGETS" | jq -e 'type == "object" and all(.[]; type == "number" and . == floor and . >= 0)' > /dev/null 2>&1 \
        || die "--targets must be a JSON object of category to whole number, for example --targets '{\"fix/verified\": 4, \"propose/grows\": 3}'"
    mkdir -p "$CAL" || die "could not create $SCAL (check the workarea is writable)."
    if [[ -f "$ROUND_JSON" && "$FORCE" != true ]]; then
        die "round $ROUND already exists at $SCAL/round-$ROUND.json. Use --round $((ROUND + 1)) for the next round, $SELF render --dir $SDIR --round $ROUND to redraw its cards, or --force to re-sample round $ROUND (labels of clusters that drop out of the round stay in labels.json but are no longer compared)."
    fi
    PRIOR='[]'
    LATER=""
    for f in "$CAL"/round-*.json; do
        [[ -f "$f" ]] || continue
        k=${f##*/round-}
        k=${k%.json}
        [[ "$k" =~ ^[0-9]+$ ]] || continue
        if [[ "$k" -lt "$ROUND" ]]; then
            PRIOR=$(jq -c --argjson p "$PRIOR" '$p + [.items[]? | {cluster, category}]' "$f") \
                || die "$(show "$f") is not a round file. Remove it or re-sample round $k with --force."
        elif [[ "$k" -gt "$ROUND" ]]; then
            LATER="$LATER $k"
        fi
    done
    [[ -z "$LATER" ]] || printf 'grade-triage: later round(s)%s exist; their exclusions were drawn against the previous round %s.\n' "$LATER" "$ROUND" >&2
    stage_grades lenient
    jq -n -L "$LIB" --slurpfile t "$DIR/triage.json" --slurpfile f "$DIR/findings.json" --slurpfile g "$TMP/grades.json" \
        --argjson prior "$PRIOR" --argjson targets "$TARGETS" --argjson size "$SIZE" --argjson seed "$SEED" --argjson round "$ROUND" '
        include "grade";
        round_doc($t[0]; $f[0]; $g[0].grades; ($prior | unique); (default_targets + $targets); $size; $seed; $round)' > "$TMP/round.json" \
        || die "could not sample round $ROUND from $SDIR (see the jq error above)."
    if jq -e '.size == 0' "$TMP/round.json" > /dev/null 2>&1; then
        die "no unsampled cluster with a remaining target is left for round $ROUND; every category is exhausted. Raise the targets with --targets, or stop sampling."
    fi
    write_round
    printf 'sample: wrote %s\n' "$(show "$ROUND_MD")"
    jq -r -L "$LIB" --argjson size "$SIZE" 'include "grade";
        "sample: round \(.round) mix (\(.size) item" + (if .size == 1 then "" else "s" end)
        + (if .size < $size then " of \($size) requested, targets exhausted" else "" end) + "): " + mix' "$ROUND_JSON"
}

# ---------------------------------------------------------------- render
sub_render() {
    need_round
    require_round_file
    stage_grades lenient
    jq -n -L "$LIB" --slurpfile t "$DIR/triage.json" --slurpfile f "$DIR/findings.json" --slurpfile g "$TMP/grades.json" --slurpfile r "$ROUND_JSON" '
        include "grade"; render_round($t[0]; $f[0]; $g[0].grades; $r[0])' > "$TMP/round.json" \
        || die "could not rebuild round $ROUND from $SDIR (see the jq error above)."
    if jq -e '.errors' "$TMP/round.json" > /dev/null 2>&1; then
        jq -r '.errors[] | "grade-triage: " + .' "$TMP/round.json" >&2
        die "round $ROUND names clusters the current triage.json does not hold; re-sample it with --force, or restore the triage.json the round was drawn from."
    fi
    write_round
    printf 'render: rewrote %s cards in %s\n' "$(jq -r '.items | length' "$ROUND_JSON")" "$(show "$ROUND_MD")"
}

# ---------------------------------------------------------------- label
sub_label() {
    # The plan form: one named cluster, for a decision the user makes on the
    # closing plan rather than inside a calibration round. Without it the K, O
    # and T answers live only in plan.md, which the next plan run rewrites.
    if [[ -n "$CLUSTER" ]]; then
        [[ -z "$ROUND" ]] || die "--cluster and --round are alternatives: --cluster names one cluster on the plan, --round labels the cards of a calibration round."
        [[ -n "$MOVE" ]] || die "--move <M> is required with --cluster, M in R C W K O I T (K may be K:A or K:B)."
        stage_labels
        OUT=$(jq -n -c -L "$LIB" --slurpfile t "$DIR/triage.json" --slurpfile e "$TMP/labels.json" \
            --arg cl "$CLUSTER" --arg m "$MOVE" --arg note "$NOTE" --arg span "$SPAN" '
            include "grade"; label_cluster($t[0]; $e[0]; $cl; $m; $note; $span)') \
            || die "could not record the label (see the jq error above)."
        if printf '%s' "$OUT" | jq -e '.errors' > /dev/null 2>&1; then
            printf '%s' "$OUT" | jq -r '.errors[] | "grade-triage: " + .' >&2
            die "nothing written. Fix the entry named above."
        fi
        printf '%s' "$OUT" | jq '{labels: .labels}' | atomic_json "$CAL/labels.json"
        printf '%s' "$OUT" | jq -r '"label: recorded " + .move + " for " + .cluster + (if .overwrote then " (overwrote the previous label)" else "" end)'
        return 0
    fi
    need_round
    [[ -n "$LABELS" ]] || die "--labels \"<string>\" is required: entries \"<n> <M> [note]\" separated by ; or newline, M in R C W K O I T, for example --labels \"1 C; 2 K:B the record is the home; 3 T say which page holds the rule\""
    require_round_file
    stage_labels
    OUT=$(jq -n -c -L "$LIB" --slurpfile r "$ROUND_JSON" --slurpfile e "$TMP/labels.json" --arg s "$LABELS" --argjson round "$ROUND" '
        include "grade"; label_apply($r[0]; $e[0]; $s; $round)') \
        || die "could not parse the labels string (see the jq error above)."
    if printf '%s' "$OUT" | jq -e '.errors' > /dev/null 2>&1; then
        printf '%s' "$OUT" | jq -r '.errors[] | "grade-triage: " + .' >&2
        die "the labels string is refused whole; nothing written. Fix the entries named above (grammar: <n> <M> [note], M in R C W K O I T, K:A or K:B, T needs a note; entries separated by ; or newline)."
    fi
    printf '%s' "$OUT" | jq '{labels: .labels}' | atomic_json "$CAL/labels.json"
    printf '%s' "$OUT" | jq -r --argjson round "$ROUND" '
        "label: recorded \(.recorded) label" + (if .recorded == 1 then "" else "s" end) + " for round \($round)",
        (.overwrote[] | "label: overwrote " + .)'
}

# ---------------------------------------------------------------- agree
sub_agree() {
    need_round
    require_round_file
    stage_labels
    stage_grades strict
    if [[ "$GRADE_COUNT" -eq 0 ]]; then
        die "no grader file under $SCAL/grades/. Have the grader write calibration/grades/round-$ROUND.json ({gradedBy, mode, round, items: [{cluster, move, side, confidence, heuristic, why}]}) and re-run agree." 2
    fi
    jq -n -L "$LIB" --slurpfile r "$ROUND_JSON" --slurpfile l "$TMP/labels.json" --slurpfile g "$TMP/grades.json" --argjson round "$ROUND" '
        include "grade"; agree($round; $r[0].items; ($l[0].labels // {}); $g[0].grades)' > "$TMP/agree.json" \
        || die "could not compute the agreement for round $ROUND (see the jq error above)."
    if jq -e '.compared == 0' "$TMP/agree.json" > /dev/null 2>&1; then
        MISSING=$(jq -r -L "$LIB" 'include "grade"; missing_text' "$TMP/agree.json")
        die "no cluster in round $ROUND has both a label and a grade ($MISSING). Record labels with $SELF label --dir $SDIR --round $ROUND --labels \"...\" and have the grader cover the round's clusters." 2
    fi
    atomic_json "$CAL/agree-round-$ROUND.json" < "$TMP/agree.json"
    jq -r -L "$LIB" 'include "grade"; agree_report' "$TMP/agree.json"
}

# ---------------------------------------------------------------- score
sub_score() {
    [[ -z "$ROUND" ]] || die "score takes no --round; it measures every graded cluster in $SDIR/triage.json"
    stage_labels
    stage_grades strict
    if [[ "$GRADE_COUNT" -eq 0 ]] || jq -e '.grades | length == 0' "$TMP/grades.json" > /dev/null 2>&1; then
        die "no grades under $SCAL/grades/. Have the grader write calibration/grades/<name>.json ({gradedBy, mode, round, items: [{cluster, move, side, confidence, heuristic, why}]}) and re-run score." 2
    fi
    jq -n -L "$LIB" --slurpfile t "$DIR/triage.json" --slurpfile f "$DIR/findings.json" --slurpfile l "$TMP/labels.json" --slurpfile g "$TMP/grades.json" '
        include "grade"; score(($t[0].clusters // []); ($f[0].records // []); $g[0].grades; ($l[0].labels // {}))' > "$TMP/score.json" \
        || die "could not score $SDIR (see the jq error above)."
    mkdir -p "$CAL" || die "could not create $SCAL (check the workarea is writable)."
    atomic_json "$CAL/score.json" < "$TMP/score.json"
    jq -r -L "$LIB" 'include "grade"; score_report' "$TMP/score.json"
}

# ------------------------------------------------------------------ plan
sub_plan() {
    [[ -z "$ROUND" ]] || die "plan takes no --round; it plans every cluster in $SDIR/triage.json"
    [[ "$SEED" =~ ^-?[0-9]+$ ]] || die "--seed must be an integer, got '$SEED'"
    if [[ -n "$SAMPLE" ]]; then
        [[ "$SAMPLE" =~ ^[1-9][0-9]*$ ]] || die "--sample must be a whole number from 1, got '$SAMPLE'"
    fi
    stage_labels
    stage_grades lenient
    mkdir -p "$CLOSING" || die "could not create $SCLOSING (check the workarea is writable)."
    jq -n -L "$LIB" --slurpfile t "$DIR/triage.json" --slurpfile f "$DIR/findings.json" \
        --slurpfile m "$DIR/manifest.json" --slurpfile l "$TMP/labels.json" --slurpfile g "$TMP/grades.json" --arg run "$RUN" '
        include "grade"; plan_doc($t[0]; $f[0]; $g[0].grades; ($l[0].labels // {}); $m[0]; $run)' > "$TMP/plan.json" \
        || die "could not plan $SDIR (see the jq error above)."
    jq -r -L "$LIB" --arg run "$RUN" 'include "grade"; plan_md($run)' "$TMP/plan.json" > "$TMP/plan.md" \
        || die "could not render the plan for $SDIR (see the jq error above)."
    if [[ -n "$SAMPLE" ]]; then
        jq -n -L "$LIB" --slurpfile p "$TMP/plan.json" --argjson n "$SAMPLE" --argjson seed "$SEED" '
            include "grade"; spot_check($p[0]; $n; $seed)' > "$TMP/spot-check.json" \
            || die "could not draw the spot check (see the jq error above)."
        jq -r -L "$LIB" 'include "grade"; spot_md' "$TMP/spot-check.json" >> "$TMP/plan.md" \
            || die "could not render the spot check (see the jq error above)."
    fi
    atomic_json "$CLOSING/plan.json" < "$TMP/plan.json"
    # The spot check lands after the plan, because apply compares their times to
    # tell a stale spot check from one drawn against the plan in hand.
    if [[ -n "$SAMPLE" ]]; then
        atomic_json "$CLOSING/spot-check.json" < "$TMP/spot-check.json"
    fi
    cp "$TMP/plan.md" "$CLOSING/plan.md.tmp" || die "could not write $SCLOSING/plan.md.tmp (check the workarea is writable)."
    mv -f "$CLOSING/plan.md.tmp" "$CLOSING/plan.md" || die "could not move $SCLOSING/plan.md.tmp into place."
    printf 'plan: wrote %s\n' "$(show "$CLOSING/plan.md")"
    jq -r '"plan: \(.clusters) clusters: " + ([.counts | to_entries[] | "\(.key) \(.value)"] | join(", "))
           + "; closed without the user \(.closedWithoutUser), left to the user \(.leftToUser), problems \(.problems | length)"' "$TMP/plan.json"
    if [[ -n "$SAMPLE" ]]; then
        jq -r --arg f "$(show "$CLOSING/spot-check.json")" '"plan: spot check (seed \(.seed)) of \(.size) of \(.of) apply entries in \($f): "
            + ([.items[] | .cluster] | join(", "))' "$TMP/spot-check.json"
    fi
}

# ----------------------------------------------------------------- apply
# A page path from the manifest: ~ expanded, absolute kept, relative resolved
# against the run directory (the form a self-contained fixture uses).
resolve_page() {
    local p=$1
    case "$p" in
        "~/"*) printf '%s' "$HOME/${p#\~/}" ;;
        /*) printf '%s' "$p" ;;
        *) printf '%s' "$DIR/$p" ;;
    esac
}

sub_apply() {
    [[ -z "$ROUND" ]] || die "apply takes no --round; it applies $SCLOSING/plan.json"
    local plan="$CLOSING/plan.json"
    [[ -f "$plan" ]] || die "no closing plan at $SCLOSING/plan.json. Write one first: $SELF plan --dir $SDIR"
    jq -e '.entries | type == "array"' "$plan" > /dev/null 2>&1 \
        || die "$SCLOSING/plan.json is not a plan (no entries array). Rewrite it: $SELF plan --dir $SDIR"
    [[ "$MOVES" =~ ^[RCWrcw]+$ ]] || die "--moves takes letters from R, C and W, got '$MOVES'. K, O, T and I are decisions for the user and are never applied."
    [[ -f "$GATE" ]] || die "prose gate not found at $(show "$GATE"). Run check-workspace.sh to verify the workspace."
    local moves_up moves_json
    moves_up=$(printf '%s' "$MOVES" | tr 'rcw' 'RCW')
    moves_json=$(printf '%s' "$moves_up" | jq -R '[explode[] | [.] | implode] | reduce .[] as $c ([]; if index($c) == null then . + [$c] else . end)')

    # The pages the selected entries name, in manifest order, with their text.
    local wanted page raw path dirs=()
    wanted=$(jq -r --argjson mv "$moves_json" '[.entries[] | . as $e | select(($mv | index($e.move)) != null) | $e.page] | unique | .[]' "$plan")
    : > "$TMP/pages.jsonl"
    while IFS= read -r page; do
        [[ -n "$page" ]] || continue
        printf '%s\n' "$wanted" | grep -qxF "$page" || continue
        raw=$(jq -r --arg p "$page" 'first(.pages[] | select(.page == $p) | .path // empty) // empty' "$DIR/manifest.json")
        [[ -n "$raw" ]] || die "$SDIR/manifest.json names page $page with no path. Fix the manifest and re-run."
        path=$(resolve_page "$raw")
        [[ -f "$path" ]] || die "page file not found: $(show "$path") (named by $SDIR/manifest.json). Restore the file, or rebuild the run against the pages that exist."
        jq -R -s --arg page "$page" --arg path "$path" '{page: $page, path: $path, text: .}' "$path" >> "$TMP/pages.jsonl" \
            || die "could not read $(show "$path")."
        dirs+=("$(dirname "$path")")
    done < <(jq -r '.pages[]?.page // empty' "$DIR/manifest.json")
    jq -s '.' "$TMP/pages.jsonl" > "$TMP/pages.json" || die "could not stage the page files."

    # The spot check is the user's licence for the batch (SKILL.md step 6). Apply
    # will not edit pages until one has been drawn against the current plan, so
    # skipping the review meets resistance rather than silence. This runs before
    # the working-tree check, because reviewing what changes matters more than
    # the tidiness of the diff.
    local spot="$CLOSING/spot-check.json"
    if [[ "$DRYRUN" != true && "$NOSPOT" != true ]]; then
        [[ -f "$spot" ]] \
            || die "no spot check at $SCLOSING/spot-check.json. Draw one and review it with the user before applying: $SELF plan --dir $SDIR --sample 10. Use --no-spot-check to apply without one."
        [[ ! "$plan" -nt "$spot" ]] \
            || die "the spot check at $SCLOSING/spot-check.json is older than the plan, so it does not show what would be applied. Draw a fresh one and review it: $SELF plan --dir $SDIR --sample 10. Use --no-spot-check to apply anyway."
    fi

    # A dirty working tree under the pages' directory would mix these edits into
    # changes the user has not committed, so the diff no longer shows what apply did.
    local d top_dirs=() dirty=""
    if [[ ${#dirs[@]} -gt 0 ]]; then
        while IFS= read -r d; do top_dirs+=("$d"); done < <(printf '%s\n' "${dirs[@]}" | sort -u)
    fi
    local in_repo=false
    if [[ ${#top_dirs[@]} -gt 0 ]] && git -C "${top_dirs[0]}" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        in_repo=true
        for d in "${top_dirs[@]}"; do
            dirty="$dirty$(git -C "$d" status --porcelain -- . 2> /dev/null)"
        done
        if [[ -n "$dirty" && "$FORCE" != true && "$DRYRUN" != true ]]; then
            die "the working tree already holds uncommitted changes under $(show "${top_dirs[0]}"). Commit or stash them first so the diff shows only what apply did, or re-run with --force. See them with: git -C '$(show "${top_dirs[0]}")' status -- ."
        fi
    fi
    # Outside a repository there is no dirty-tree check and no way back: say so
    # before writing, not after, so the user can take their own copy first.
    if [[ "$in_repo" != true && "$DRYRUN" != true ]]; then
        printf 'grade-triage: warning: the pages are not in a git repository, so there is no dirty-tree check and no way to undo these edits. Take a copy first if you need one.\n' >&2
    fi

    jq -n -L "$LIB" --slurpfile p "$plan" --slurpfile g "$TMP/pages.json" --argjson mv "$moves_json" --arg run "$RUN" '
        include "grade"; apply_doc($p[0]; $g[0]; $mv; $run)' > "$TMP/applied0.json" \
        || die "could not work out the edits for $SDIR (see the jq error above)."

    # Write each changed page, then gate it. A dry run gates the same text without writing.
    local n i changed pg fails
    n=$(jq '.pages | length' "$TMP/applied0.json")
    : > "$TMP/gates.jsonl"
    for ((i = 0; i < n; i++)); do
        changed=$(jq -r ".pages[$i].changed" "$TMP/applied0.json")
        [[ "$changed" == true ]] || continue
        pg=$(jq -r ".pages[$i].page" "$TMP/applied0.json")
        path=$(jq -r ".pages[$i].path" "$TMP/applied0.json")
        jq -j ".pages[$i].text" "$TMP/applied0.json" > "$TMP/page.txt" || die "could not stage the new text for $pg."
        if [[ "$DRYRUN" != true ]]; then
            cp "$TMP/page.txt" "$path.tmp" || die "could not write $(show "$path").tmp (check the file is writable)."
            mv -f "$path.tmp" "$path" || die "could not move $(show "$path").tmp into place."
        fi
        fails=$(bash "$GATE" --stdin --label "$pg" < "$TMP/page.txt" 2>&1 | grep ': FAIL ' || true)
        if [[ -n "$fails" ]]; then
            printf '%s' "$fails" | jq -R -s --arg p "$pg" '{($p): {gate: "fail", failLines: (rtrimstr("\n") | split("\n"))}}' >> "$TMP/gates.jsonl"
        else
            jq -n --arg p "$pg" '{($p): {gate: "pass", failLines: []}}' >> "$TMP/gates.jsonl"
        fi
    done
    jq -s 'add // {}' "$TMP/gates.jsonl" > "$TMP/gates.json" || die "could not collect the gate results."

    jq -L "$LIB" --slurpfile g "$TMP/gates.json" --argjson dry "$DRYRUN" '
        include "grade"; gate_merge($g[0]) | applied_doc($dry)' "$TMP/applied0.json" > "$TMP/applied.json" \
        || die "could not write the apply record (see the jq error above)."

    local diff_line
    if [[ "$in_repo" == true ]]; then
        diff_line="apply: see the change with git -C '$(show "${top_dirs[0]}")' diff -- ."
    else
        diff_line="apply: the pages are not in a git repository, so there is no diff to show."
    fi
    if [[ "$DRYRUN" != true ]]; then
        mkdir -p "$CLOSING" || die "could not create $SCLOSING (check the workarea is writable)."
        atomic_json "$CLOSING/applied.json" < "$TMP/applied.json"
    fi
    jq -r -L "$LIB" --argjson dry "$DRYRUN" --arg diff "$diff_line" 'include "grade"; apply_report($dry; $diff)' "$TMP/applied.json"
    [[ "$DRYRUN" == true ]] || printf 'apply: wrote %s\n' "$(show "$CLOSING/applied.json")"
    if jq -e '.summary.gateFail > 0' "$TMP/applied.json" > /dev/null 2>&1; then
        return 2
    fi
    return 0
}

case "$SUB" in
    sample) sub_sample ;;
    render) sub_render ;;
    label) sub_label ;;
    agree) sub_agree ;;
    score) sub_score ;;
    plan) sub_plan ;;
    apply) sub_apply || exit $? ;;
esac
exit 0
