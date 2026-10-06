import type { BullyingType, SeverityLevel } from "@/types/database";
import { BULLYING_TYPE_LABELS } from "@/lib/reports/bullying-types";
import { buildKeywordGuide, describeHits, highestLevel, scanKeywords, type KeywordLevel } from "@/lib/ai/bullying-keywords";

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
  // Student-selected tags from the "What type of bullying was this?"
  // multi-select on the report form — a structured signal alongside the
  // free-text description, not a replacement for reading it.
  bullyingTypes?: BullyingType[];
  inImmediateDanger: boolean;
  // People Involved / Setting fields from Page 2 of the report — folded into
  // the staff-facing summary below so a staff member skimming the case gets
  // who/where without having to cross-reference the Report details card.
  victimGradeSection?: string | null;
  oppressorGradeSection?: string | null;
  oppressorName?: string | null;
  setting?: string | null;
}

export interface SeverityResult {
  severity: SeverityLevel;
  // Why it was classified at this Level — the report content, people
  // involved, setting, and evidence are shown as their own fields on the
  // "AI assessment" card (see the report detail pages), so this only needs
  // to cover the classification reasoning, not re-summarize the incident.
  // Still staff-facing: guidance FOR the person handling the case, not
  // reassurance directed at the student who filed it.
  rationale: string;
  recommendations: string[];
  modelVersion: string;
}

const DISCLAIMER = "AI-assisted classification — use professional judgment when acting on this case.";

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

  const hits = scanKeywords(input.description, { cyberTagged: input.bullyingTypes?.includes("cyber") });

  const model = "claude-sonnet-5";
  const message = await client.messages.create({
    model,
    max_tokens: 500,
    system: [{ type: "text" as const, cache_control: { type: "ephemeral" as const }, text: `You triage school bullying reports for a staff member who is about to open the case for the first time — you never determine guilt or discipline. Classify strictly against the three Levels of Disciplinary Intervention defined in DepEd Order No. 006, s. 2026, Section 21:\n${DEPED_SEVERITY_GUIDE}\nMap your classification to severity values: First Level -> "minor"; Second Level -> "serious"; Third Level -> "critical". Never use "less_serious" — it is not part of this standard. If the report describes acts spanning more than one level, classify at the HIGHEST level clearly supported by the facts stated. Physical contact (punching, pinching, fighting) is First Level UNLESS the report states it caused an injury, in which case it is at least Second Level ("slight" injury) or Third Level (victim incapacitated or needs 10+ days of medical care) depending on severity of the injury described — if the report doesn't say whether an injury occurred, do not assume one occurred. The student also tags which type(s) of bullying this was (Social/Cyber/Physical/Verbal) — treat that as a structured hint about where to look in the description (e.g. a "Cyber" tag means check for online sharing/uploading acts, which can reach Third Level), never as the sole basis for a Level by itself. Students may write in English, Filipino/Tagalog, Bisaya/Cebuano, or a mix — read and classify the report correctly regardless of language; write your rationale and recommendations in English for staff-facing consistency. The report content, people involved, setting, and evidence are already shown to staff as their own fields elsewhere on the page — your rationale should NOT restate them, only explain the classification. "Victim's grade/section" and "Oppressor's grade/section" are CLASS IDENTIFIERS (grade level + section name, e.g. "Grade 9 - Crystal"), never a person's name — even if only a section name is given with no grade number, do not treat it as anyone's name or address a recommendation to it as if it were a person (e.g. never write "refer Crystal to the nurse"; write "refer the Grade 9 - Crystal victim to the nurse" or similar instead). ${KEYWORD_PROMPT}\nRespond ONLY with JSON: {"severity": "minor"|"serious"|"critical", "rationale": string (1-2 sentences: which Level of Disciplinary Intervention applies and why, citing only facts present in the report), "recommendations": string[] (2-4 short, concrete next steps for the STAFF MEMBER handling this case — e.g. who to interview, whether to loop in a counselor or Prefect of Discipline, what evidence to verify — never advice addressed to the student)}.` }],
    messages: [
      {
        role: "user",
        content: `Report description: ${input.description}\nBullying type(s) selected by student: ${input.bullyingTypes?.length ? input.bullyingTypes.map((t) => BULLYING_TYPE_LABELS[t]).join(", ") : "none selected"}\nVictim's grade/section (a class identifier, not a name): ${input.victimGradeSection || "not given"}\nOppressor's grade/section and, if known, name: ${[input.oppressorGradeSection, input.oppressorName].filter(Boolean).join(" · ") || "not given"}\nSetting: ${input.setting || "not given"}\nStudent flagged immediate danger: ${input.inImmediateDanger ? "yes" : "no"}`,
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

  let severity: SeverityLevel = input.inImmediateDanger ? "critical" : parsed.severity;
  let rationale = parsed.rationale;

  // Safety net: if high-precision terms (hospitalization, groping, explicit
  // threats...) matched at a higher Level than Claude chose, raise it — a
  // staff member verifies either way, and under-classifying a severe case
  // costs more than over-classifying one. Only categories marked `floor` can
  // do this; everyday-word categories never override Claude's reading.
  const floorLevel = highestLevel(hits.filter((h) => h.floor));
  if (floorLevel && floorLevel > (SEVERITY_RANK[severity] ?? 1)) {
    severity = LEVEL_TO_SEVERITY[floorLevel];
    rationale += ` Raised to ${LEVEL_NAMES[floorLevel]} by keyword scan (${describeHits(hits.filter((h) => h.floor && h.level === floorLevel))}) — please verify against the report.`;
  }

  return {
    severity,
    rationale,
    recommendations: [...parsed.recommendations, DISCLAIMER],
    modelVersion: model,
  };
}

// Keyword-based classifier for when no ANTHROPIC_API_KEY is configured (or
// the API call fails). The Cebuano/Tagalog/English vocabulary and matching
// rules live in lib/ai/bullying-keywords.ts, grounded in DO_s2026_006
// Section 21 — the highest Level any category matched decides the result.
// Claude, when available, reads meaning rather than keywords and doesn't
// have this approach's false-positive/negative risk.
const LEVEL_TO_SEVERITY: Record<KeywordLevel, SeverityLevel> = { 1: "minor", 2: "serious", 3: "critical" };
const SEVERITY_RANK: Record<SeverityLevel, number> = { minor: 1, less_serious: 1, serious: 2, critical: 3 };
const LEVEL_NAMES: Record<KeywordLevel, string> = { 1: "First Level", 2: "Second Level", 3: "Third Level" };

// Reading guide for Claude: the vocabulary itself, plus how to treat it.
const KEYWORD_PROMPT =
  'Bisaya/Cebuano and Tagalog vocabulary for each Level follows. Treat it as a reading guide for slang, code-switching and spelling variants, NOT a checklist: words marked "everyday" and many insults (e.g. "mura", "sarap", "hot", "dugo", "baboy") are ordinary language outside bullying, so decide from what the report says actually happened and to whom. A homophobic, sexist or transphobic slur used against a learner is Second Level (not downgraded to a mere insult). Physical-contact words (sumbag, suntok, tulak, kurot...) are First Level unless the report states an injury. A term listed under a Level is never proof of that Level by itself.\n' +
  buildKeywordGuide();

const STAFF_NEXT_STEPS: Record<SeverityLevel, string[]> = {
  critical: [
    "Treat as highest priority — confirm the student's immediate safety first.",
    "Loop in the guidance counselor or Prefect of Discipline right away.",
  ],
  serious: [
    "Interview the students involved separately to confirm the details.",
    "Check whether this is a repeat incident before deciding next steps.",
  ],
  minor: ["Follow up with the student to confirm they feel safe.", "Monitor for repeat incidents before escalating."],
  less_serious: ["Follow up with the student to confirm they feel safe.", "Monitor for repeat incidents before escalating."],
};

function heuristicClassify(input: SeverityInput): SeverityResult {
  const hits = scanKeywords(input.description, { cyberTagged: input.bullyingTypes?.includes("cyber") });
  const level = highestLevel(hits);

  let severity: SeverityLevel = LEVEL_TO_SEVERITY[level || 1];
  let levelName = LEVEL_NAMES[level || 1];
  if (input.inImmediateDanger) {
    severity = "critical";
    levelName = LEVEL_NAMES[3];
  }

  // The heuristic's Level is decided by keywords — the bullying-type tags
  // don't change that here (that kind of holistic weighing is what
  // classifyWithClaude is for). Still surface them to staff since the
  // student took the time to select them.
  const typesNote = input.bullyingTypes?.length
    ? ` Student-tagged type(s): ${input.bullyingTypes.map((t) => BULLYING_TYPE_LABELS[t]).join(", ")}.`
    : "";

  const matchedNote = hits.length ? ` Matched: ${describeHits(hits.filter((h) => h.level === level))}.` : "";

  const rationale = input.inImmediateDanger
    ? `Marked critical (${levelName}) because the student flagged immediate danger.${typesNote}`
    : `Marked ${severity} (${levelName} of Disciplinary Intervention per DO_s2026_006 Section 21) based on keywords in the description.${matchedNote}${typesNote}`;

  return {
    severity,
    rationale,
    recommendations: [...STAFF_NEXT_STEPS[severity], DISCLAIMER],
    modelVersion: "heuristic-fallback",
  };
}
