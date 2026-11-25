/**
 * The Funniest Office Joke, Judged Head to Head
 * (make.fun bounty u-kevin-the-funniest-office-joke-judged-head-to-head-3dc3233c)
 *
 * This program writes one single-line office joke to
 *   $MAKEFUN_OUTPUT_DIR/entry.txt   (fallback: /output/entry.txt)
 *
 * How it works, in plain terms:
 *   1. It holds a shortlist of hand-written candidate jokes (15 of them),
 *      every one of them a single line about office life, under 200
 *      characters, with a setup, a turn, and the punchline last.
 *   2. It gates every candidate: single line, non-empty, valid UTF-8,
 *      strictly under 200 characters. Anything that fails is dropped.
 *   3. It scores the survivors against the judge's published brief, in
 *      the brief's own order, with weights that fall as the list goes on:
 *        (1) a real one-line joke with a setup and a turn      weight 0.30
 *        (2) built on something anyone in an office recognises weight 0.25
 *        (3) surprises, with a turn the reader does not see    weight 0.20
 *        (4) lands in one line, punchline last, every word     weight 0.15
 *            earning its place
 *        (5) feels new, not a joke already going round         weight 0.10
 *   4. It picks the highest-scoring candidate (ties break toward the
 *      shorter text, then toward the earlier candidate, so the choice is
 *      fully deterministic), writes it to entry.txt, reads the file back
 *      and checks it byte for byte. If the read-back differs, it exits
 *      non-zero instead of pretending it succeeded.
 *
 * Runtime: Node 22, standard library only, no network, no randomness,
 * no clock. The same input always produces the same output file.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The gate's hard ceiling: an entry must be strictly under 200 chars. */
const MAX_CHARS = 200;

/** Where the entry goes. The harness sets MAKEFUN_OUTPUT_DIR; the local
 *  fallback mirrors the sandbox path the rules name. */
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
//
// Twelve hand-written one-liners. Each one is built the same way:
// a recognisable office scene, a setup that points one way, then a turn
// that points somewhere else, with the laugh landing on the last words.
// None of them is copied from anywhere: they were written for this entry.
//
// A note on the craft, candidate by candidate:
//  - 1: the inbox-zero trap. Everybody who has worked in an office has
//       chased zero unread; the congratulations email is the trap.
//  - 2: the fire drill. The one moment the whole company ever agrees.
//  - 3: the meeting about the meeting. The brief names this trope, so it
//       pays a freshness price for leaning on the most quoted example.
//  - 4: the status lie. "In a meeting" is the office's favourite alibi.
//  - 5: HR's "whole self". Taken literally, as HR phrases always are.
//  - 6: the deadline printer. A classic scene, so it pays the same
//       freshness price as the meeting one: the brief quotes it directly.
//  - 7: CV fluency. Two kinds of fluency, both exaggerated the same way.
//  - 8: "treat the office like home", taken at face value.
//  - 9: the tight budget. The squeeze lands on the reply time, not the
//       belt, which is where the joke actually lives.
//  - 10: the working holiday. The laptop came too, so nobody is on leave.
//  - 11: thinking outside the box, relocated to the corridor.
//  - 12: the weak coffee, asking for a reference like a job applicant.
//  - 13: the stolen lunch. Everybody knows the office fridge thief; the
//       thank-you note is the insult on top of the theft, and it lands last.
//  - 14: "you're on mute". The shared video-call humiliation, with the
//       speaker finishing in silence out of spite instead of stopping.
//  - 15: the microwaved fish. The whole floor smells it, and HR's answer
//       is a policy, which is the most HR answer there is.
//

interface Candidate {
  /** Stable short id, used in logs and in tie-breaking. */
  id: string;
  /** The joke itself: one line, under 200 characters. */
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "inbox-zero",
    text: "I finally cleared my inbox to zero unread, then IT sent a company-wide email congratulating me, and now it's one unread again.",
  },
  {
    id: "fire-drill",
    text: "The fire drill went off during the all-hands, and for the first time ever the whole company agreed on something: let's not go back in.",
  },
  {
    id: "meeting-about-meeting",
    text: "The meeting that could have been an email ended with a follow-up meeting to discuss why the email would have been better.",
  },
  {
    id: "status-meeting",
    text: "I set my status to 'in a meeting' for eight hours straight, which is technically true — I was in a meeting with my bed.",
  },
  {
    id: "whole-self",
    text: "HR said to bring our whole selves to work, so I brought my laundry, my cat, and my resignation letter — in that order.",
  },
  {
    id: "deadline-printer",
    text: "The printer jammed on deadline day, so I did what any professional would do: I apologised to it, unplugged it, and blamed the intern.",
  },
  {
    id: "fluent-excel",
    text: "I put 'fluent in Excel' on my CV, which is true in the same way my boss is fluent in saying 'let's circle back.'",
  },
  {
    id: "office-like-home",
    text: "My boss said to treat the office like home, so I put on pyjamas, napped on the break-room couch, and got fired from my living room.",
  },
  {
    id: "tight-budget",
    text: "I asked for a raise and my manager said the budget was tight, so I tightened my belt, my deadlines, and — mostly — my reply time.",
  },
  {
    id: "working-holiday",
    text: "My out-of-office reply says I'm on holiday, but my laptop came too, so technically the holiday is the one working from home.",
  },
  {
    id: "outside-the-box",
    text: "My boss asked me to think outside the box, so I moved my desk into the corridor — now the box is my office.",
  },
  {
    id: "weak-coffee",
    text: "The office coffee is so weak it asked me for a reference, so I wrote one: 'Works well under pressure, but only in the break room.'",
  },
  {
    id: "stolen-lunch",
    text: "I labelled my lunch in the office fridge with my name, so someone ate it anyway — and left a thank-you note.",
  },
  {
    id: "on-mute",
    text: "I gave my update on the team video call, then someone typed 'you're on mute' — but I finished in silence.",
  },
  {
    id: "fish-microwave",
    text: "Someone reheated fish in the office microwave, so now the whole floor smells like low tide, and HR is drafting a policy.",
  },
];

// ---------------------------------------------------------------------------
// Small deterministic helpers
// ---------------------------------------------------------------------------

/** Count characters the way the gate does: Unicode code points, so an
 *  em dash or a curly quote counts once, not twice. */
function charCount(text: string): number {
  return [...text].length;
}

/** Lower-case a copy for matching, so "HR" and "hr" are the same word. */
function lower(text: string): string {
  return text.toLowerCase();
}

/** Does `text` contain `needle` as a whole word (or phrase), ignoring case?
 *  Word boundaries are real boundaries, so "all-hands," still matches
 *  "all-hands" and "HR" does not match inside another word. */
function containsWord(text: string, needle: string): boolean {
  const escaped = lower(needle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(lower(text));
}

/** Does `text` contain the phrase `needle` anywhere, ignoring case? */
function containsPhrase(text: string, needle: string): boolean {
  return lower(text).includes(lower(needle));
}

/** Count how many of the given words/phrases appear in `text`. */
function countMatches(text: string, needles: string[]): number {
  let hits = 0;
  for (const needle of needles) {
    if (needle.includes(" ") ? containsPhrase(text, needle) : containsWord(text, needle)) {
      hits += 1;
    }
  }
  return hits;
}

/** Split a line into clauses on the punctuation that marks a beat:
 *  commas, semicolons, colons, em dashes and the word "so". A joke with
 *  more than one clause has room for a setup and then a turn. */
function clauseCount(text: string): number {
  const parts = text
    .split(/[,;:—–]|\s+so\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------
//
// Mirrors the sealed scorer's gate, as the rules describe it: the file
// must be UTF-8 text of 1 to 200 characters, and not only white space.
// The program gates the candidates before scoring them, and gates the
// winner once more before writing it, so nothing invalid can slip out.
//

interface GateResult {
  ok: boolean;
  reasons: string[];
}

/** Check one candidate against the gate. Returns every reason it fails,
 *  so a failure is diagnosable instead of silent. */
function gate(text: string): GateResult {
  const reasons: string[] = [];

  if (text.length === 0) {
    reasons.push("empty");
  }
  if (text.trim().length === 0) {
    reasons.push("only whitespace");
  }
  if (text.includes("\n") || text.includes("\r")) {
    reasons.push("more than one line");
  }
  if (charCount(text) >= MAX_CHARS) {
    reasons.push(`too long: ${charCount(text)} characters (limit under ${MAX_CHARS})`);
  }

  // UTF-8 round-trip: encode the string and decode it back. If the bytes
  // do not survive the trip unchanged, the text is not clean UTF-8.
  const bytes = Buffer.from(text, "utf8");
  const roundTrip = bytes.toString("utf8");
  if (roundTrip !== text) {
    reasons.push("not valid UTF-8");
  }

  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// The scorer
// ---------------------------------------------------------------------------
//
// Five sub-scores, one per criterion in the judge's brief, in the brief's
// own order. The weights fall as the list goes on, exactly as the brief
// ranks the criteria: the first matters most, the last least. Each
// sub-score runs from 0 to 1, so the total runs from 0 to 1 as well.
//
// The scorer reads the text, not a hand-written verdict: every sub-score
// is computed from features of the line itself (turn markers, office
// vocabulary, where the turn lands, length, and whether it leans on one
// of the brief's own quoted examples). Nothing here names a winner; the
// numbers pick one.

/** Weights in the brief's order: setup+turn, recognisable office life,
 *  surprise, one-line landing with the punchline last, freshness. */
const WEIGHTS = {
  structure: 0.3,
  recognisable: 0.25,
  surprise: 0.2,
  landing: 0.15,
  freshness: 0.1,
} as const;

/** Words that pivot a setup into a turn. "Then" and "so" carry the turn
 *  openly; "but", "until" and "now" swerve it; "which is" and "turns out"
 *  reframe what came before. A bare "and" only continues, so it counts
 *  for half. */
const STRONG_TURN_MARKERS = [
  "then",
  " so ",
  " but ",
  " until ",
  " now ",
  "which is",
  "turns out",
  "technically",
  "ended with",
];
const WEAK_TURN_MARKERS = [" and ", " — ", " – ", ": "];

/** The office vocabulary the brief itself treats as universal: the
 *  meeting that could have been an email, the reply-all, the printer
 *  that jams on the deadline, plus the rest of the furniture of office
 *  life — the boss, HR, the inbox, the out-of-office, the break room. */
const OFFICE_WORDS = [
  "meeting",
  "email",
  "inbox",
  "printer",
  "deadline",
  "boss",
  "manager",
  "hr",
  "office",
  "out-of-office",
  "break room",
  "break-room",
  "reply-all",
  "all-hands",
  "fire drill",
  "status",
  "cv",
  "raise",
  "budget",
  "intern",
  "coffee",
  "laptop",
  "holiday",
  "resignation",
  "desk",
  "corridor",
  "pyjamas",
  "laundry",
  "fridge",
  "lunch",
  "microwave",
  "team",
  "video call",
  "mute",
];

/** The brief's own quoted examples, plus the corporate buzzwords that
 *  have been wrung dry in a thousand office jokes. A joke that repeats
 *  one of them word for word is standing on the brief's shoulders
 *  instead of finding its own scene, so it pays a freshness price. */
const CLICHE_PHRASES = [
  "could have been an email",
  "reply-all",
  "printer that jams",
  "printer jammed",
  "circle back",
  "outside the box",
  "synergy",
  "low-hanging fruit",
  "move the needle",
  "touch base",
  "take this offline",
  "per my last email",
  "deep dive",
  "at the end of the day",
  "bandwidth",
  "ping me",
];

/** Find the last occurrence of one turn marker in `low`, matching whole
 *  words only. A bare substring search is wrong here: "so" would fire
 *  inside "also", "but" inside "button", "now" inside "know", and a joke
 *  would score a late turn it never made. Word markers get word
 *  boundaries; punctuation markers (an em dash, a colon) match literally. */
function lastIndexOfMarker(low: string, marker: string): number {
  const trimmed = marker.trim();
  if (/^[\p{L}\p{N} ]+$/u.test(trimmed)) {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    let at = -1;
    let match: RegExpExecArray | null;
    while ((match = re.exec(low)) !== null) {
      at = match.index;
    }
    return at;
  }
  return low.lastIndexOf(trimmed);
}

/** Find the position (as a fraction of the line's length) of the last
 *  turn marker in the text, or -1 when there is none. A turn that lands
 *  late is a turn the reader does not see coming. */
function lastTurnPosition(text: string): number {
  const low = lower(text);
  let latest = -1;
  for (const marker of [...STRONG_TURN_MARKERS, ...WEAK_TURN_MARKERS]) {
    const at = lastIndexOfMarker(low, marker);
    if (at >= 0) {
      const fraction = at / Math.max(1, text.length);
      if (fraction > latest) {
        latest = fraction;
      }
    }
  }
  return latest;
}

/** Is there a strong turn marker anywhere in the text? */
function hasStrongTurn(text: string): boolean {
  const low = ` ${lower(text)} `;
  return STRONG_TURN_MARKERS.some((marker) => low.includes(marker));
}

/**
 * Criterion 1 — a real one-line joke with a setup and a turn (weight 0.30).
 * Half the credit for having room to breathe (more than one clause, long
 * enough to set a scene), half for actually pivoting (a strong turn
 * marker). A single flat statement scores low; a line that sets up and
 * then swerves scores full marks.
 */
function scoreStructure(text: string): number {
  const clauses = clauseCount(text);
  // A long line with no punctuation still has room for a setup: it is
  // one long breath that ends somewhere else than it started.
  const room =
    clauses >= 3 ? 0.5 : clauses === 2 ? 0.35 : charCount(text) >= 100 ? 0.25 : 0.1;
  const pivot = hasStrongTurn(text) ? 0.5 : 0.15;
  return room + pivot;
}

/**
 * Criterion 2 — turns on something anyone who has worked in an office
 * knows (weight 0.25). Three or more pieces of office furniture is a
 * full house; two is most of the way there; one is half; none is a joke
 * about something else entirely. The gap between two hits and three
 * keeps a joke that merely mentions the office apart from one that is
 * built out of it.
 */
function scoreRecognisable(text: string): number {
  const hits = countMatches(text, OFFICE_WORDS);
  if (hits >= 3) return 1;
  if (hits === 2) return 0.85;
  if (hits === 1) return 0.5;
  return 0;
}

/**
 * Criterion 3 — surprises, with a turn the reader does not see coming
 * (weight 0.20). The later the last turn marker lands, the less of the
 * joke is left after it for the reader to guess the ending. A turn in
 * the final third is a full surprise; one before the halfway mark is
 * telegraphed; no turn at all is a complaint stated plainly.
 */
function scoreSurprise(text: string): number {
  const at = lastTurnPosition(text);
  if (at < 0) return 0.1;
  if (at >= 0.66) return 1;
  if (at >= 0.5) return 0.75;
  if (at >= 0.33) return 0.5;
  return 0.25;
}

/**
 * Criterion 4 — lands in one line, every word earning its place, and
 * the punchline last (weight 0.15). Two halves: economy, where a shorter
 * line scores better (a one-liner should not ramble), and punchline
 * position, where the last clause must carry the twist — the turn marker
 * or the payoff word sitting in the final quarter of the line.
 */
function scoreLanding(text: string): number {
  const length = charCount(text);

  // Economy: a line near 100 characters is tight; one pushing the 200
  // ceiling is carrying dead weight. The floor keeps a very short line
  // from gaming the score — it still has to be a joke.
  const economy = Math.max(0.3, Math.min(1, 1 - (length - 90) / 110));

  // Punchline last: the final quarter of the line should hold either a
  // turn marker or one of the payoff words that flip the meaning.
  const tailStart = Math.floor(text.length * 0.75);
  const tail = lower(text.slice(tailStart));
  const payoffWords = [
    "again",
    "back in",
    "better",
    "my bed",
    "that order",
    "the intern",
    "circle back",
    "living room",
    "reply time",
    "working from home",
    "my office",
    "break room",
    "thank-you note",
    "in silence",
    "a policy",
  ];
  const tailHasTurn = lastTurnPosition(text) >= 0.75;
  const tailHasPayoff = payoffWords.some((word) => tail.includes(word));
  // Both halves of a landing — a turn in the tail and a payoff word in
  // it — is a full mark; either half alone is most of the way there.
  // (The old line here had a dead branch: `tailHasTurn || tailHasPayoff`
  // already covered the second condition, so either half alone scored
  // a full point.)
  const punchline =
    tailHasTurn && tailHasPayoff ? 1 : tailHasTurn || tailHasPayoff ? 0.8 : 0.5;

  return (economy + punchline) / 2;
}

/**
 * Criterion 5 — feels new rather than like a joke already going round
 * the office (weight 0.10). Repeating one of the brief's own quoted
 * examples costs half the freshness; repeating two costs it all. A line
 * built on its own scene keeps the full point.
 */
function scoreFreshness(text: string): number {
  const hits = countMatches(text, CLICHE_PHRASES);
  if (hits >= 2) return 0;
  if (hits === 1) return 0.5;
  return 1;
}

interface ScoredCandidate {
  candidate: Candidate;
  breakdown: {
    structure: number;
    recognisable: number;
    surprise: number;
    landing: number;
    freshness: number;
  };
  total: number;
  bytes: number;
}

/** Score one candidate against all five criteria, in the brief's order. */
function scoreCandidate(candidate: Candidate): ScoredCandidate {
  const text = candidate.text;
  const breakdown = {
    structure: scoreStructure(text),
    recognisable: scoreRecognisable(text),
    surprise: scoreSurprise(text),
    landing: scoreLanding(text),
    freshness: scoreFreshness(text),
  };
  const total =
    breakdown.structure * WEIGHTS.structure +
    breakdown.recognisable * WEIGHTS.recognisable +
    breakdown.surprise * WEIGHTS.surprise +
    breakdown.landing * WEIGHTS.landing +
    breakdown.freshness * WEIGHTS.freshness;
  return {
    candidate,
    breakdown,
    total,
    bytes: Buffer.byteLength(text, "utf8"),
  };
}

/**
 * Pick the winner. Highest total first. Ties break toward the shorter
 * text (the brief's own tie-break prefers fewer bytes), then toward the
 * earlier candidate, so the result is the same on every run.
 */
function pickWinner(scored: ScoredCandidate[]): ScoredCandidate {
  const ranked = [...scored].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.bytes !== b.bytes) return a.bytes - b.bytes;
    return (
      CANDIDATES.indexOf(a.candidate) - CANDIDATES.indexOf(b.candidate)
    );
  });
  return ranked[0];
}

// ---------------------------------------------------------------------------
// Write and verify
// ---------------------------------------------------------------------------

/**
 * Write the winning line to entry.txt and read it back. The read-back
 * must match byte for byte, and must itself pass the gate, or the run
 * fails loudly instead of handing the grader a file it did not check.
 */
function writeAndVerify(winner: string): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, winner, "utf8");

  const readBack = readFileSync(OUTPUT_FILE);
  const expected = Buffer.from(winner, "utf8");
  if (!readBack.equals(expected)) {
    throw new Error(
      `read-back mismatch: wrote ${expected.length} bytes, read ${readBack.length} bytes`,
    );
  }

  const gateCheck = gate(readBack.toString("utf8"));
  if (!gateCheck.ok) {
    throw new Error(
      `written entry failed the gate: ${gateCheck.reasons.join("; ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): number {
  // Gate first: drop anything the sealed scorer would refuse.
  const survivors: Candidate[] = [];
  for (const candidate of CANDIDATES) {
    const check = gate(candidate.text);
    if (!check.ok) {
      console.error(
        `gate: dropping ${candidate.id}: ${check.reasons.join("; ")}`,
      );
      continue;
    }
    survivors.push(candidate);
  }

  if (survivors.length === 0) {
    console.error("gate: no candidate survived; nothing to write");
    return 1;
  }

  // Score the survivors and rank them, highest first.
  const scored = survivors.map(scoreCandidate);
  const ranked = [...scored].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.bytes !== b.bytes) return a.bytes - b.bytes;
    return CANDIDATES.indexOf(a.candidate) - CANDIDATES.indexOf(b.candidate);
  });

  for (const entry of ranked) {
    const b = entry.breakdown;
    console.log(
      `${entry.candidate.id}: total=${entry.total.toFixed(3)} ` +
        `(structure=${b.structure.toFixed(2)} ` +
        `recognisable=${b.recognisable.toFixed(2)} ` +
        `surprise=${b.surprise.toFixed(2)} ` +
        `landing=${b.landing.toFixed(2)} ` +
        `freshness=${b.freshness.toFixed(2)}) ` +
        `${charCount(entry.candidate.text)} chars`,
    );
  }

  const winner = pickWinner(scored);
  console.log(`winner: ${winner.candidate.id} (${winner.total.toFixed(3)})`);
  console.log(`entry: ${winner.candidate.text}`);

  try {
    writeAndVerify(winner.candidate.text);
  } catch (error) {
    console.error(`verify: ${(error as Error).message}`);
    return 1;
  }

  console.log(`wrote: ${OUTPUT_FILE} (${winner.bytes} bytes, verified)`);
  return 0;
}

process.exit(main());
