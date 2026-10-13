# triage-lib.jq - the partition rules, shared by build-triage.sh through
# lib/triage.jq.
#
# `jq -L <this dir> 'include "triage-lib"; ...'` loads the rules that sort a
# cluster into a bucket, so the bucket a cluster carries is decided once. The
# buckets are the axis the calibration sample draws across; the closing move
# itself comes from the grader, not from here. The rules are the ones in
# ~/trade-imports-arch-workspace/.claude/skills/editorial-triage/assets/editorial-triage-schema.md
# (section "Partition rules").

def sev_num: if type != "string" then 9 else ({"S1": 1, "S2": 2, "S3": 3, "S4": 4, "S5": 5}[.] // 9) end;
def basis_rank: if type != "string" then 4 else ({"rule": 0, "source": 0, "set": 1, "inference": 2, "author": 3}[.] // 4) end;
def loss_denylist: ["completeness", "context", "clarity", "helpful", "useful"];
def starts_none: ((. // "") | ascii_downcase | startswith("none"));

# partition(record; cluster dispersion; bearing; removes; params) -> {bucket, reason}
# The contract's pre-rules, then rules 1 to 8 in precedence order. The record
# is the cluster's lead with the cluster's severity, claimShift and
# introducedCheck, so a nomination or an unsupported introduction on any
# member holds the whole cluster.
def partition($rec; $dispersion; $bearing; $removes; $p):
  ($rec.before // "") as $before
  | $rec.after as $after
  | ($rec.severity | sev_num) as $sev
  | (($rec.loss // "") | ascii_downcase) as $loss
  | if (($rec.checks // []) | length) > 0 then {bucket: "discard", reason: $rec.checks[0]}
    elif $rec.gate == "fail" then {bucket: "propose", reason: "gate-fail"}
    elif $rec.claimShift == "stale" then {bucket: "propose", reason: "stale"}
    elif $rec.claimShift == "missing" then {bucket: "propose", reason: "unverified"}
    elif $rec.claimShift == "material" or $rec.claimShift == "unresolved" then {bucket: "propose", reason: "claim-shift"}
    elif $rec.introducedCheck == "held" then {bucket: "propose", reason: "introduced"}
    elif $rec.kind == "presentation" then {bucket: "author", reason: "presentation"}
    elif $rec.anchorResolved == "none" and $before == "" then {bucket: "propose", reason: "unresolved"}
    elif $bearing == "tangential" then
      (if ($removes | starts_none) then {bucket: "discard", reason: "tangent"}
       else {bucket: "propose", reason: "tangent"} end)
    elif ($rec.action == "delete" or $rec.action == "shorten") then {bucket: "propose", reason: "removal"}
    elif ($rec.basis == "author" and ($bearing == "central" or $bearing == "supporting"))
         or ($rec.kind == "omission" and $after == null) then {bucket: "author", reason: "author"}
    elif $rec.action == "restructure" then {bucket: "propose", reason: "restructure"}
    elif ($dispersion // 0) > 1 then {bucket: "propose", reason: "dispersion"}
    elif $rec.basis == "inference" then
      (if ($p.demoteBelowHigh // false) then {bucket: "author", reason: "inference"}
       else {bucket: "propose", reason: "inference"} end)
    elif $rec.band == "grows" then
      (if $sev <= ($p.growSeverityMax // 3) and ($rec.delta // 0) <= ($p.growthAllowance // 12)
          and ($removes | starts_none)
          and ($loss | length) > 0
          and ((loss_denylist | index($loss)) == null)
          and $rec.applicable == "unique" and $rec.gate == "pass"
       then {bucket: "fix", reason: "verified"} else {bucket: "propose", reason: "grows"} end)
    elif $sev == 5 then
      (if ($rec.kind == "term" or $rec.kind == "residue") and $rec.basis == "rule"
          and $rec.applicable == "unique" and $rec.gate == "pass"
       then {bucket: "fix", reason: "verified"} else {bucket: "propose", reason: "preference"} end)
    elif ($rec.action == "split" or $rec.action == "list") and $rec.layoutOnly == true
         and $rec.claimShift == "none" and $rec.applicable == "unique" and $rec.gate == "pass"
      then {bucket: "fix", reason: "layout"}
    elif ($rec.basis == "rule" or $rec.basis == "source" or $rec.basis == "set") then
      (if $before != "" and $rec.applicable == "unique" and $rec.gate == "pass"
       then {bucket: "fix", reason: "verified"} else {bucket: "propose", reason: "no-rewrite"} end)
    else {bucket: "propose", reason: "fallback"} end;
