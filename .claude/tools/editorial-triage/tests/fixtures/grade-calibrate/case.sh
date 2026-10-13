#!/usr/bin/env bash
# grade-calibrate: the calibration subcommands on the plan fixture, in four
# sections. Each runs on its own pristine copy of the workarea under
# variants/, and the files it writes are kept under its name as a prefix
# (sample-round-1.json and so on).
#
# sample: cumulative targets over three rounds, a refused re-sample, and a
# score with no grader file. author/author is capped at 1 so round 1 spends
# its whole target; the other categories keep the defaults in lib/grade.jq.
#
# label: the labels grammar on round 1 (same seed as the sample section).
#
# agree: round 1 labelled by hand, graded by two files (grades-agree/:
# round-1b.json re-grades C-02-004 and adds C-03-002).
#
# score: every cluster graded (grades-score/all.json), round 1 labelled, then
# the run scored. Its labels are the agree section's, which the section
# checks instead of keeping a second copy.
set -u

VARIANTS="$WORK/variants"
pristine() {  # $1 name: a copy of the workarea as the fixture staged it
    mkdir -p "$VARIANTS/$1"
    for e in "$WORK"/*; do
        [[ "$e" == "$VARIANTS" ]] && continue
        cp -R "$e" "$VARIANTS/$1/"
    done
}
keep() {  # $1 name: the calibration files the section wrote or changed, under its prefix
    local f n
    for f in "$VARIANTS/$1"/calibration/*.json "$VARIANTS/$1"/calibration/*.md; do
        [[ -f "$f" ]] || continue
        n=$(basename "$f")
        [[ -f "$WORK/calibration/$n" ]] && cmp -s "$f" "$WORK/calibration/$n" && continue
        cp "$f" "$WORK/calibration/$1-$n"
    done
}
for v in sample label agree score; do pristine "$v"; done
cp "$WORK"/grades-agree/*.json "$VARIANTS/agree/calibration/grades/"
cp "$WORK"/grades-score/*.json "$VARIANTS/score/calibration/grades/"

# ================================================================ sample
echo "##### sample"
(
    WORK="$VARIANTS/sample"
    # 1. round 1, eight items, one from each category the fixture holds
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 8 --seed 7 --targets '{"author/author": 1}'
    echo "exit-code: $?"
    # 2. round 2: author/author is exhausted by round 1 and skipped although its other
    #    cluster remains; the categories with target left give five, so the round of six
    #    stops short rather than drawing outside the targets
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 2 --size 6 --seed 7 --targets '{"author/author": 1}'
    echo "exit-code: $?"
    # 3. round 1 again without --force: refused, the files stand
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 8 --seed 7 --targets '{"author/author": 1}'
    echo "exit-code: $?"
    # 4. round 3: every category is either out of clusters or out of target, so nothing can be drawn
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 3 --size 6 --seed 7 --targets '{"author/author": 1}'
    echo "exit-code: $?"
    # 5. score with no grader file: nothing to measure, and the message names what to run
    rm -rf "$WORK/calibration/grades"
    bash "$HELPER_DIR/grade-triage.sh" score --dir "$WORK"
    echo "exit-code: $?"
)
keep sample

# ================================================================ label
echo "##### label"
(
    WORK="$VARIANTS/label"
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 6 --seed 7
    echo "exit-code: $?"
    # 1. three entries with ; separators: a K with side B, a lower-case move, notes on two
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
        --labels "1 K:B the record is the home of the lifetime; 2 c; 3 R the sentence is off the point"
    echo "exit-code: $?"
    # 2. the rest of the round, newline-separated, with a T that lacks its note: the whole string is refused
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
        --labels "$(printf '4 W\n5 I the cite is missing, park it\n6 T')"
    echo "exit-code: $?"
    # 3. the same string with the note: recorded
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
        --labels "$(printf '4 W\n5 I the cite is missing, park it\n6 T say which page holds the cookie rule')"
    echo "exit-code: $?"
    # 4. a re-label of card 1: overwrites and is reported
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "1 O second look: record which lifetime is current as open"
    echo "exit-code: $?"
    # 5. an unknown move: the whole string is refused, card 2 stays as it was
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "2 W; 3 Z"
    echo "exit-code: $?"
    # 6. a side on a move other than K, and a side that is not A or B
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "2 C:A; 1 K:C"
    echo "exit-code: $?"
    # 7. a card outside the round
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "7 R"
    echo "exit-code: $?"
    # 8. a duplicate card and a malformed entry, both named
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 --labels "5 I; 5 R; 6"
    echo "exit-code: $?"
    # 9. a round that was never sampled
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 3 --labels "1 R"
    echo "exit-code: $?"
)
keep label

# ================================================================ agree
echo "##### agree"
(
    WORK="$VARIANTS/agree"
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 6 --seed 7
    echo "exit-code: $?"
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
        --labels "1 K:B the record is the home of the lifetime; 2 C; 3 R the sentence is off the point; 4 W; 5 I the cite is missing, park it; 6 T say which page holds the cookie rule"
    echo "exit-code: $?"
    # 1. agreement on round 1: one side disagreement on K, one move disagreement, the later grader file winning on C-02-004
    bash "$HELPER_DIR/grade-triage.sh" agree --dir "$WORK" --round 1
    echo "exit-code: $?"
    # 2. round 2 has neither labels nor grades: nothing to compare
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 2 --size 6 --seed 7
    echo "exit-code: $?"
    bash "$HELPER_DIR/grade-triage.sh" agree --dir "$WORK" --round 2
    echo "exit-code: $?"
)
keep agree

# ================================================================ score
echo "##### score"
(
    WORK="$VARIANTS/score"
    bash "$HELPER_DIR/grade-triage.sh" sample --dir "$WORK" --round 1 --size 6 --seed 7
    echo "exit-code: $?"
    bash "$HELPER_DIR/grade-triage.sh" label --dir "$WORK" --round 1 \
        --labels "1 K:B the record is the home of the lifetime; 2 C; 3 R the sentence is off the point; 4 W; 5 I the cite is missing, park it; 6 T say which page holds the cookie rule"
    echo "exit-code: $?"
    bash "$HELPER_DIR/grade-triage.sh" score --dir "$WORK"
    echo "exit-code: $?"
)
echo "--- the score section's labels are the agree section's ---"
echo "labels.json identical: $(cmp -s "$VARIANTS/score/calibration/labels.json" "$WORK/calibration/agree-labels.json" && echo yes || echo no)"
mv "$VARIANTS/score/calibration/labels.json" "$VARIANTS/score/labels.json.checked"
keep score
