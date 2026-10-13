# claim-elements.jq - nominate a rewrite for claim verification.
#
# `claim_diff($before; $after)` compares the claim-bearing elements of two
# texts and returns
#   {added: [{class, term}], removed: [{class, term}], missingSentence: [string],
#    nominated: boolean}
# Classes: quantifier, modal, negation, connective, number (counted, so a
# second "must" or a dropped "only" shows even when the word survives
# elsewhere) and content (words of four letters or more outside the closed
# classes and a short stop list, compared as sets of light stems, reported by
# their first surface form). `missingSentence` lists the sentences of $before
# (split at . ! ? : ;) fewer than half of whose adjacent word pairs occur
# anywhere in $after: a dropped clause, or a sentence rewritten end to end.
# `nominated` is true when any list is non-empty. A deletion ($after empty)
# is always nominated. The verdict on a nomination is the CLAIM_VERIFIER's;
# this file only says where to look.
#
# Contract: ../../../skills/editorial-triage/assets/editorial-triage-schema.md (claimDiff)

def ce_quantifiers: {"all":1,"every":1,"each":1,"any":1,"some":1,"most":1,"many":1,"few":1,"none":1,"only":1,
  "always":1,"never":1,"sometimes":1,"often":1,"usually":1,"rarely":1,"whole":1,"entire":1,"single":1,"both":1,
  "either":1,"neither":1,"least":1,"exactly":1,"everywhere":1,"anywhere":1,"nowhere":1,"nothing":1,"everything":1,"anything":1};
def ce_modals: {"must":1,"should":1,"may":1,"might":1,"can":1,"could":1,"shall":1,"will":1,"would":1,"need":1,"needs":1,
  "ought":1,"required":1,"requires":1,"require":1,"allowed":1,"permitted":1,"forbidden":1,"cannot":1};
def ce_negations: {"not":1,"no":1,"never":1,"none":1,"nothing":1,"nobody":1,"nowhere":1,"neither":1,"nor":1,"without":1,
  "unless":1,"cannot":1,"absent":1,"absence":1,"lack":1,"lacks":1,"fails":1,"fail":1,"denied":1,"denies":1,"refuses":1,"refusal":1};
def ce_connectives: {"because":1,"since":1,"so":1,"therefore":1,"thus":1,"hence":1,"if":1,"unless":1,"until":1,"when":1,
  "whenever":1,"while":1,"although":1,"though":1,"whereas":1,"but":1,"however":1,"before":1,"after":1,"once":1,"then":1,
  "otherwise":1,"or":1,"rather":1,"instead":1,"except":1,"provided":1,"where":1,"wherever":1,"as":1,"than":1,
  "also":1,"still":1,"yet":1,"even":1,"whether":1,"despite":1,"unlike":1,"like":1};
def ce_numbers: {"zero":1,"one":1,"two":1,"three":1,"four":1,"five":1,"six":1,"seven":1,"eight":1,"nine":1,"ten":1,
  "eleven":1,"twelve":1,"thirteen":1,"fourteen":1,"fifteen":1,"sixteen":1,"seventeen":1,"eighteen":1,"nineteen":1,"twenty":1,
  "thirty":1,"forty":1,"fifty":1,"sixty":1,"seventy":1,"eighty":1,"ninety":1,"hundred":1,"thousand":1,"million":1,
  "half":1,"twice":1,"double":1,"first":1,"second":1,"third":1,"fourth":1,"fifth":1,"last":1,"once":1};
def ce_stop: {"the":1,"this":1,"that":1,"these":1,"those":1,"with":1,"from":1,"into":1,"onto":1,"they":1,"them":1,
  "their":1,"there":1,"here":1,"have":1,"has":1,"had":1,"been":1,"being":1,"were":1,"was":1,"does":1,"did":1,"done":1,
  "such":1,"same":1,"other":1,"another":1,"which":1,"what":1,"whom":1,"whose":1,"itself":1,"themselves":1,"own":1,
  "about":1,"within":1,"through":1,"across":1,"between":1,"under":1,"over":1,"upon":1,"more":1,"less":1,"very":1,
  "just":1,"much":1,"well":1,"thing":1,"things":1,"ones":1,"something":1,"someone":1,"anyone":1,"whatever":1};

def ce_tokens:
  ascii_downcase
  | gsub("[^a-z0-9'’-]+"; " ")
  | split(" ")
  | map(gsub("^['’-]+|['’-]+$"; "") | select(length > 0));

def ce_stem:
  sub("['’]s$"; "")
  | if test("ies$") and length > 4 then sub("ies$"; "y")
    elif test("[^s]s$") and length > 3 then sub("s$"; "")
    else . end
  | if test("ing$") and length > 6 then sub("ing$"; "")
    elif test("ed$") and length > 5 then sub("ed$"; "")
    else . end
  | if test("e$") and length > 4 then sub("e$"; "") else . end;

def ce_class:
  if test("n['’]t$") then "negation"
  elif ce_negations[.] then "negation"
  elif ce_modals[.] then "modal"
  elif ce_quantifiers[.] then "quantifier"
  elif ce_numbers[.] or test("^[0-9][0-9.,:%-]*$") then "number"
  elif ce_connectives[.] then "connective"
  elif ce_stop[.] then null
  elif length >= 4 then "content"
  else null end;

# counted terms per closed class; content words as stem -> first surface form
def ce_elements:
  ce_tokens
  | reduce .[] as $t ({counts: {}, content: {}};
      ($t | ce_class) as $c
      | if $c == null then .
        elif $c == "content" then (($t | ce_stem) as $s | .content[$s] //= $t)
        else .counts[$c + ":" + $t] += 1 end);

def ce_sentences: gsub("[\n]+"; " ") | [ splits("(?<=[.!?:;])\\s+") | select(test("[a-z]"; "i")) ];
def ce_bigrams: ce_tokens | map(ce_stem) | [ range(0; length - 1) as $i | .[$i] + " " + .[$i + 1] ];

def claim_diff($before; $after):
  ($before // "") as $b | ($after // "") as $a
  | ($b | ce_elements) as $eb | ($a | ce_elements) as $ea
  | (($eb.counts + $ea.counts) | keys) as $keys
  | ([ $keys[] | . as $k | (($ea.counts[$k] // 0) - ($eb.counts[$k] // 0)) as $d
       | select($d > 0) | {class: ($k | split(":")[0]), term: ($k | split(":")[1])} ]
     + [ $eb.content | to_entries[] | select($ea.content[.key] == null) | empty ]
     + [ $ea.content | to_entries[] | select($eb.content[.key] == null) | {class: "content", term: .value} ]) as $added
  | ([ $keys[] | . as $k | (($eb.counts[$k] // 0) - ($ea.counts[$k] // 0)) as $d
       | select($d > 0) | {class: ($k | split(":")[0]), term: ($k | split(":")[1])} ]
     + [ $eb.content | to_entries[] | select($ea.content[.key] == null) | {class: "content", term: .value} ]) as $removed
  | ($a | ce_bigrams) as $abg
  | ([ ($b | ce_sentences)[] | . as $s | ($s | ce_bigrams) as $bg
       | select(($bg | length) > 0 and ([ $bg[] | select(. as $g | $abg | index([$g]) != null) ] | length) * 2 < ($bg | length)) ]) as $missing
  | {added: $added, removed: $removed, missingSentence: $missing,
     nominated: ($a == "" or ($added | length) > 0 or ($removed | length) > 0 or ($missing | length) > 0)};

# layout_only(before; after): the same text once top-level list markers are
# removed and every run of whitespace, line breaks included, is one space, so
# every word, every word boundary and every punctuation mark survives in
# order. An indented marker is kept as a depth mark (\u0001<indent>), so a
# nesting change is a text change.
def ce_flat:
  gsub("(?m)^(?<i>[ \t]*)([-*+]|[0-9]+[.)])[ \t]+"; (if (.i | length) > 0 then "\u0001\(.i | length) " else "" end))
  | gsub("[[:space:]]+"; " ") | ltrimstr(" ") | rtrimstr(" ");
def layout_only($before; $after):
  ($before // "") as $b | ($after // "") as $a
  | $b != "" and $a != "" and $b != $a and ($b | ce_flat) == ($a | ce_flat);
