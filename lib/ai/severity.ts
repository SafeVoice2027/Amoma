import type { SeverityLevel } from "@/types/database";

// DepEd Order No. 006, s. 2026 ("Guidelines on Ensuring a Safe and
// Motivating Learning Environment"), Section 21 — Levels of Disciplinary
// Intervention (pp. 40-42). Reproduced verbatim from the official order so
// the classifier is grounded in the actual named acts, not an approximation.
// DepEd may amend this order — re-verify against the current text
// periodically.
//
// The order defines three levels; our `SeverityLevel` type has a fourth
// value ("less_serious") left over from an earlier, non-DepEd-sourced
// scale. The classifier below no longer emits "less_serious" — it maps
// strictly First/Second/Third Level -> minor/serious/critical — but the
// value stays in the schema so older, already-scored reports keep working.
const DEPED_SEVERITY_GUIDE = `
First Level of Disciplinary Intervention ("minor bullying acts") — precursors to bullying, or bullying behaviors, including but not limited to:
  1. Uttering profanities/swearwords against a learner;
  2. Disruptive behavior and/or pranks against a learner;
  3. Grabbing belongings of another learner without permission;
  4. Punching, pinching another learner which does NOT result in physical injuries; and
  5. Fighting a learner which does NOT result in physical injuries.

Second Level of Disciplinary Intervention ("serious bullying acts") — bullying behaviors, including but not limited to:
  1. Stalking;
  2. Catcalling, wolf-whistling, unwanted invitations, misogynistic, transphobic, homophobic and sexist slurs, persistent uninvited comments or gestures on a person's appearance, relentless requests for personal details, sexual comments or suggestions against a learner;
  3. Assaulting or inflicting SLIGHT physical injuries to another learner;
  4. Theft or stealing a learner's belongings; and
  5. Intimidating or threatening a learner.

Third Level of Disciplinary Intervention — the most severe tier, for acts that cannot be resolved by the teacher at the classroom level or by the Learner Formation Officer, including but not limited to:
  1. Inflicting physical injuries to another learner when the victim is incapacitated or requires medical intervention for 10 days or more;
  2. Offensive physical or body gestures, or exposing private parts for sexual gratification, with the effect of demeaning, harassing, threatening, or intimidating the offended party — including flashing, public masturbation, groping, and similar lewd sexual actions;
  3. Uploading or sharing recorded or live videos which degrade, demean, or shame other learners; and
  4. Uploading or sharing a learner's recorded/live video, photo, or voice with sexual content on social media, or to any person willing to pay, for purposes of gain or profit.
`.trim();

export interface SeverityInput {
  description: string;
  isRepeatOccurrence?: boolean;
  inImmediateDanger: boolean;
}

export interface SeverityResult {
  severity: SeverityLevel;
  rationale: string;
  recommendations: string[];
  modelVersion: string;
}

const DISCLAIMER =
  "This is guidance, not a professional decision — a staff member will review your report.";

// Only used for "Bully" reports — Conflict reports go straight to staff for
// support rather than being severity-scored, so `reports.severity` stays
// null and no `ai_assessments` row is created for them.
export async function classifySeverity(input: SeverityInput): Promise<SeverityResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await classifyWithClaude(input);
    } catch {
      // fall through to heuristic so a submission never fails outright
    }
  }

  return heuristicClassify(input);
}

async function classifyWithClaude(input: SeverityInput): Promise<SeverityResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const model = "claude-sonnet-5";
  const message = await client.messages.create({
    model,
    max_tokens: 500,
    system: `You triage school bullying reports for severity only — you never determine guilt or discipline. Classify strictly against the three Levels of Disciplinary Intervention defined in DepEd Order No. 006, s. 2026, Section 21:\n${DEPED_SEVERITY_GUIDE}\nMap your classification to severity values: First Level -> "minor"; Second Level -> "serious"; Third Level -> "critical". Never use "less_serious" — it is not part of this standard. If the report describes acts spanning more than one level, classify at the HIGHEST level clearly supported by the facts stated. Physical contact (punching, pinching, fighting) is First Level UNLESS the report states it caused an injury, in which case it is at least Second Level ("slight" injury) or Third Level (victim incapacitated or needs 10+ days of medical care) depending on severity of the injury described — if the report doesn't say whether an injury occurred, do not assume one occurred. Students may write in English, Filipino/Tagalog, Bisaya/Cebuano, or a mix — read and classify the report correctly regardless of language; write your rationale and recommendations in English for staff-facing consistency. Respond ONLY with JSON: {"severity": "minor"|"serious"|"critical", "rationale": string (cite only facts present in the report, and name which Level of Disciplinary Intervention applies and why), "recommendations": string[] (2-4 short, supportive next steps for the student)}.`,
    messages: [
      {
        role: "user",
        content: `Report description: ${input.description}\nRepeat occurrence: ${input.isRepeatOccurrence ? "yes" : "no"}\nStudent flagged immediate danger: ${input.inImmediateDanger ? "yes" : "no"}`,
      },
    ],
  });

  const rawText = message.content.find((b) => b.type === "text")?.text ?? "{}";
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(text) as {
    severity: SeverityLevel;
    rationale: string;
    recommendations: string[];
  };

  return {
    severity: input.inImmediateDanger ? "critical" : parsed.severity,
    rationale: parsed.rationale,
    recommendations: [...parsed.recommendations, DISCLAIMER],
    modelVersion: model,
  };
}

// Keyword-based approximation of DO_s2026_006 Section 21 for when no
// ANTHROPIC_API_KEY is configured. Injury / act-type keywords decide the
// Level; `isRepeatOccurrence` only affects the rationale text, since under
// the order repetition changes the *penalty* (1st/2nd/3rd offense), not
// the Level itself.
//
// Filipino students commonly write reports in English, Filipino/Tagalog,
// Bisaya/Cebuano, or a code-switched mix, so each list below includes
// common word stems in all three. This is still a rough approximation (the
// same false-positive/negative risk the English list already has, e.g.
// "hurt my feelings") — Claude, when available, reads meaning rather than
// keywords and doesn't have this limitation.
const THIRD_LEVEL_KEYWORDS = [
  // English
  "10 days", "ten days", "incapacitat", "hospitaliz", "hospitalize",
  "groping", "grope", "masturbat", "flashing", "flashed", "expos", "nude", "naked",
  "sexual", "molest",
  // Tagalog — "hinipo" is the -in- infixed conjugation of "hipo" ("touch");
  // that infix inserts inside the root, so it doesn't contain "hipo" as a
  // substring and needs listing separately (same for banta/hikap below).
  "ospital", "hubad", "hipo", "hinipo",
  // Bisaya/Cebuano
  "hubo", "hikap", "hinikap",
];
const SECOND_LEVEL_KEYWORDS = [
  // English
  "injur", "hurt", "bruis", "wound", "bleed", "bled", "swoll", "welt", "stole", "steal", "theft",
  "stolen", "threat", "stalk", "intimidat", "catcall", "wolf-whistl", "slur",
  // Tagalog
  "nasaktan", "sinaktan", "nasugatan", "sugat", "dugo", "ninakaw", "nakaw", "banta", "binanta",
  "pananakot",
  // Bisaya/Cebuano
  "nasamdan", "samad", "gikawat", "hulga", "gihulga",
];

// A report saying an act "did NOT result in injuries" still contains the
// substring "injur" — plain keyword matching would misclassify the report
// from your own DO_s2026_006 example (punching with no injury) as Second
// Level. This checks a short window before each keyword hit for a negation
// word (English, Tagalog "hindi"/"wala", Bisaya "dili"/"wala"/"walay")
// before counting it as a real signal.
const NEGATION_PATTERN =
  /\b(no|not|never|without|nothing|none|n't|didn't|doesn't|does not|did not|hindi|wala|walang|dili|walay)\b[^.!?]{0,25}$/i;

function hasSignal(text: string, keywords: string[]): boolean {
  for (const keyword of keywords) {
    let index = text.indexOf(keyword);
    while (index !== -1) {
      const windowStart = Math.max(0, index - 40);
      const preceding = text.slice(windowStart, index);
      if (!NEGATION_PATTERN.test(preceding)) return true;
      index = text.indexOf(keyword, index + 1);
    }
  }
  return false;
}

function heuristicClassify(input: SeverityInput): SeverityResult {
  const text = input.description.toLowerCase();

  let severity: SeverityLevel = "minor";
  let levelName = "First Level";
  if (hasSignal(text, THIRD_LEVEL_KEYWORDS)) {
    severity = "critical";
    levelName = "Third Level";
  } else if (hasSignal(text, SECOND_LEVEL_KEYWORDS)) {
    severity = "serious";
    levelName = "Second Level";
  }
  if (input.inImmediateDanger) {
    severity = "critical";
    levelName = "Third Level";
  }

  const repeatNote = input.isRepeatOccurrence
    ? " This has happened before, which affects the offense count under DO_s2026_006 even though it doesn't change the Level."
    : "";

  return {
    severity,
    rationale: input.inImmediateDanger
      ? `Marked critical (${levelName}) because the student flagged immediate danger.${repeatNote}`
      : `Marked ${severity} (${levelName} of Disciplinary Intervention per DO_s2026_006 Section 21) based on keywords in the description.${repeatNote}`,
    recommendations: [
      "A staff member will review your report and follow up here.",
      "You can add more details anytime using the follow-up thread on this report.",
      DISCLAIMER,
    ],
    modelVersion: "heuristic-fallback",
  };
}
