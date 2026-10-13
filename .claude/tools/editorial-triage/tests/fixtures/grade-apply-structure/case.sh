# grade-apply-structure: apply_page on the line shapes the apply step once
# damaged, called directly through lib/grade.jq so each case is one entry on
# one line. A reword after a multi-byte character lands on its phrase, because
# the cut is placed by character rather than by byte. A removal tidies only
# the join it makes, so ".env", the double space inside a code span and a
# trailing hard break survive. A bullet whose text is removed without its
# marker, and a whole table row, go with their lines instead of leaving a lone
# marker or a blank line that splits the table. Each line prints in brackets so
# trailing space shows.
jq -n -r -L "$HELPER_DIR/lib" --rawfile page "$WORK/page.md" '
  include "grade";
  [ {cluster: "C-01", record: "F-01", move: "W", line: 3, before: "is wrong", after: "is right"},
    {cluster: "C-02", record: "F-02", move: "R", line: 5, span: "Drop the second sentence."},
    {cluster: "C-03", record: "F-03", move: "R", line: 7, span: "Then remove this aside."},
    {cluster: "C-04", record: "F-04", move: "R", line: 9, span: "Remove this sentence."},
    {cluster: "C-05", record: "F-05", move: "R", line: 12, span: "Then drop this one."},
    {cluster: "C-06", record: "F-06", move: "R", line: 15, span: "Drop this bullet entirely."},
    {cluster: "C-07", record: "F-07", move: "R", line: 21, span: "| b | Remove this row. |"} ] as $entries
  | apply_page($page | split("\n"); $entries)
  | (.results[] | "\(.cluster) \(.move) \(.status) at \(.at) dropped \(.dropped)"),
    "--- page ---",
    (.lines[] | "[\(.)]")'
echo "jq exit-code: $?"
