// The CEO framework rubric and prompts, ported from the artifact. Used by scripts/pipeline.ts to brief the
// Claude Code routine that builds each client's framework.
/* eslint-disable */
type Intake = Record<string, any>;
type Part = "customer" | "edge" | "offer";

export const RUBRIC=`Score each signal 0 (absent or vague), 1 (partial), 2 (met). Every 1 or 2 needs evidence quoted or paraphrased from the intake; no evidence = 0. Never invent facts, names or numbers.
CUSTOMER (max 10): C1 [gating] Customer-first: the customer is the hero (Simba), the expert the guide. C2 [gating] Real people, not a vague avatar: a named person and what they were doing/feeling before. C3 Pain and outcome in their own words. C4 Evidence-derived from real conversations/quotes, not guesses. C5 Narrow enough to exclude: clear who it is NOT for.
EDGE (max 12) = unique selling point + proof: E1 [gating] Proof: a specific outcome with a number and timeframe (own or client), a testimonial, credential or award, or lived proof of having walked the road the customer is on. E2 [gating] The scar: a personal history that makes them the trusted guide (from what sets them apart and the Simba profile). E3 Unfair combination: what sets them apart that none of the named competitors can truthfully claim. E4 Hills: contrarian beliefs they would defend, specific enough to disagree with. E5 Trust profile placed as Stranger, Politician or Spiderman, with the gap to Spiderman named. E6 Runway: enough distinct topics (beliefs, stories, proof) for 13 weekly long-form pieces.
OFFER (max 14): O1 [gating] A logical next step exists. O2 Dream outcome stated concretely and maximised. O3 Likelihood: the quick win is stated and provable. O4 Time delay stated and short. O5 Effort and sacrifice low (effort 1-3 = 2 points, 4-6 = 1, 7-10 = 0). O6 One clear call to action. O7 Can be woven into content without a hard pitch.
VERDICT per pillar from percent = points/max: Strong = 80%+ and no gating signal below 2; Workable = 55-79%, or 80%+ with a gating signal at 1; Weak = under 55% or any gating signal at 0.
Compelling-enough tests: Customer = could you write the buyer's Monday morning in three sentences with a detail only that buyer would recognise. Edge = would a stranger after one 20-minute piece know what makes this person different and why to believe them. Offer = would the target customer feel foolish saying no, and is the quick win one sentence with a timeframe.`;

export const BASE_RULES=`You are a brand strategist at Block Ten Strategy running the CEO framework (Customer, Edge, Offer) from the Brand Conversion Engine. Trust makes the brand; content alone does not build trust. Long-form first.
Write to the client as "you". When describing their customer, use the pronoun the intake implies, or "they" if unclear. Plain, direct English. No hype, no filler, no em dashes. Keep every string short (under 200 characters unless the field says otherwise).
Ground everything in the intake. Quotes must be copied word for word from the intake. Never invent names, numbers, credentials, prices or quotes. When something is your inference rather than the client's words, set "confirm": true on it. Where data is missing, say so plainly and score 0.`;
export function intakeJSON(S: Intake){const d=JSON.parse(JSON.stringify(S));["framework","updatedAt","ready","committed","startedAt","finishedAt"].forEach(k=>delete d[k]);return JSON.stringify(d)}
export function promptFor(part: Part, S: Intake){
  const head=`${BASE_RULES}\n\nRUBRIC\n${RUBRIC}\n\nINTAKE (JSON)\n${intakeJSON(S)}\n\n`;
  const sig=`"signals":[{"id":"X1","name":"short name","score":0,"gate":false,"evidence":"one sentence"}]`;
  const gaps=`"gaps":[{"signal":"X1","title":"2-4 word label","question":"one question the client can answer"}]`;
  if(part==="customer")return head+`Score only the CUSTOMER pillar (C1-C5) and build the customer section. Return ONLY JSON:
{"oneLine":"the specific buyer in one sentence","headline":"one sentence: who, at what exact moment","toStrong":"the one thing that would make this Strong, under 70 characters",
"profile":[{"label":"Who","icon":"user","value":"...","confirm":false}],
"monday":{"scene":"3-4 sentences: an ordinary moment in the buyer's week with a detail only they would recognise","confirm":true},
"crowd":[{"test":"Massive pain","status":"pass|likely|unknown|fail","note":"short evidence"},{"test":"Purchasing power",...},{"test":"Easy to target",...},{"test":"Growing",...}],
"words":[{"says":"exact quote from the intake","means":"what they mean","unsaid":"what they never say out loud, or empty","confirm":false}],
"wants":{"surface":["3 short chips"],"underneath":["3-4 short chips"],"from":"who they are now, in their words","to":"who they become, in their words"},
"notFor":["4-5 short lines"],"oldWay":[{"tried":"what they try first","fails":"why it fails"}],
${sig},"compelling":{"yes":false,"reason":"one sentence"},${gaps}}
Give 6 profile facts. Pick each icon from: user, child, calc, book, wall, hand, clock, users, target, chat, flag. Give 3-5 "words" rows and 4-5 "oldWay" rows. Mark gate true on C1 and C2. Give one gap for every signal scored 0 or 1.`;
  if(part==="edge")return head+`Score only the EDGE pillar (E1-E6) and build the edge section. Return ONLY JSON:
{"oneLine":"their edge in one sentence","headline":"one sentence: why them and nobody else","toStrong":"under 70 characters",
"statement":"their edge statement in first person, 3-4 sentences, built from their own words","highlight":"a 3-6 word phrase copied exactly from the statement to emphasise",
"story":{"scar":"the before-state that makes them the guide","turn":"the moment it changed, or empty if the intake does not say","now":"what they do now"},
"combo":[{"lane":"a type of competitor","owner":"who usually owns it","edge":"what this client brings that they can't"}],
"hills":["the beliefs they'd die on a hill for, sharpened but faithful"],
"trust":{"profile":"Stranger|Politician|Spiderman","position":0,"note":"2 sentences: where they stand and the move toward Spiderman"},
${sig},"compelling":{"yes":false,"reason":"one sentence"},${gaps}}
"position" is 0-100 on the Stranger (0) to Spiderman (100) line. Give 3-4 combo rows using the named competitors where you can, and 3-5 hills. Mark gate true on E1 and E2. Give one gap for every signal scored 0 or 1, plus one for the turn if it is missing.`;
  if(part==="offer")return head+`Score the OFFER pillar (O1-O7) twice: as the client wrote it ("draft") and after your sharpening ("sharp"). Then build the offer section. Return ONLY JSON:
{"oneLine":"the offer in one sentence","headline":"one sentence: the move that makes it compelling","toStrong":"under 70 characters",
"offer":{"name":"a sharpened working name","subtitle":"How to [outcome]","promise":"one promise sentence with a timeframe, under 280 characters","notPromised":"what we deliberately don't promise"},
"signals":[{"id":"O1","name":"short name","draft":0,"sharp":0,"gate":true,"evidence":"one sentence on why it moved or not"}],
"levers":[{"lever":"Dream outcome","dir":"up","draft":"as written","sharp":"sharpened"},{"lever":"Likelihood of success","dir":"up",...},{"lever":"Time delay","dir":"down",...},{"lever":"Effort and sacrifice","dir":"down",...}],
"phases":[{"label":"Week 1","title":"short title","focus":"what happens","win":"the client's win in their own voice"}],
"ladder":[{"level":"Free","name":"","desc":"","price":"","ask":""},{"level":"Core",...},{"level":"Upsell",...},{"level":"Later",...}],
"names":[{"use":"For the paid program","name":"","why":""}],
"compelling":{"yes":false,"reason":"one sentence"},${gaps}}
Sharpen only from the intake: never raise a score without saying what changes. Give 3-5 phases that fit the offer's real length. Prices only from the intake; otherwise "To set". Give 3 names, the first recommended. Give one gap for every signal whose sharpened score is 0 or 1, and one for pricing if no price was given.`;
}
export function overviewPrompt(S: Intake, c: any, e: any, o: any, gaps: any[]){
  return `${BASE_RULES}

Client: ${S.client.name||"the client"} (${S.client.brand||""}).
Scores out of 100: Customer ${c.pct}, Edge ${e.pct}, Offer ${o.pct} (${o.sharpPct} once sharpened).
Customer: ${c.f.oneLine}
Edge: ${e.f.oneLine}
Offer: ${o.f.oneLine}
Gap questions (index: signal, question):
${gaps.map((g: any,i: number)=>`${i}: ${g.signal}, ${g.question}`).join("\n")}

Return ONLY JSON:
{"positioning":"one first-person positioning line: I help [who] [do what] so [outcome]","leak":"2 sentences: the pillar most likely losing trust or money right now, and why","fix":"one short sentence: the fastest fix","overall":"one short sentence summing up the scores","top":[0,1,2]}
"top" holds the indexes of the 3 gap questions that would move the scores most.`;
}
