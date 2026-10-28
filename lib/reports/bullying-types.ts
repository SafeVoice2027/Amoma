import type { BullyingType, BullyingTypeDetails } from "@/types/database";

export const BULLYING_TYPE_OPTIONS: { value: BullyingType; label: string }[] = [
  { value: "social", label: "Social" },
  { value: "cyber", label: "Cyber" },
  { value: "physical", label: "Physical" },
  { value: "verbal", label: "Verbal" },
  { value: "emotional", label: "Emotional" },
  { value: "gender_based", label: "Gender-based" },
];

export const BULLYING_TYPE_LABELS: Record<BullyingType, string> = {
  social: "Social",
  cyber: "Cyber",
  physical: "Physical",
  verbal: "Verbal",
  emotional: "Emotional",
  gender_based: "Gender-based",
};

// The follow-up each selected type shows the student. Every one is optional
// and uses tap-to-select options (plus an "Other" box) so it stays quick to
// fill in on a phone. `multiple: false` is a pick-one question.
export interface TypeQuestion {
  prompt: string;
  hint?: string;
  multiple: boolean;
  options: string[];
}

export const TYPE_QUESTIONS: Record<BullyingType, TypeQuestion> = {
  cyber: {
    prompt: "Which social media or app did it happen on?",
    multiple: true,
    options: [
      "Facebook",
      "Messenger",
      "Instagram",
      "TikTok",
      "X (Twitter)",
      "YouTube",
      "Viber",
      "Telegram",
      "Discord",
      "Online games",
      "Text message (SMS)",
    ],
  },
  physical: {
    prompt: "Were you hurt?",
    multiple: false,
    options: ["No injury", "Slight injury (bruise, scratch)", "Needed medical attention"],
  },
  verbal: {
    prompt: "What kind of words were used?",
    multiple: true,
    options: ["Name-calling", "Insults about my looks", "Mocking or teasing", "Threats", "Cursing at me"],
  },
  social: {
    prompt: "What happened?",
    multiple: true,
    options: ["Left out on purpose", "Rumors spread about me", "Ignored", "Others turned against me"],
  },
  emotional: {
    prompt: "What happened?",
    multiple: true,
    options: [
      "Humiliated in front of others",
      "Intimidated or scared on purpose",
      "Manipulated or blackmailed",
      "Constantly put down",
    ],
  },
  gender_based: {
    prompt: "What was it about?",
    multiple: true,
    options: [
      "My gender",
      "My sexual orientation or gender identity",
      "Sexual comments or jokes",
      "Unwanted touching",
    ],
  },
};

// Types in the order their follow-up questions are shown (same as the chips).
export const TYPE_ORDER: BullyingType[] = BULLYING_TYPE_OPTIONS.map((o) => o.value);

// "Facebook, TikTok" / "Needed medical attention" — empty string when the
// student didn't answer that type's question.
export function describeTypeAnswer(details: BullyingTypeDetails[BullyingType]): string {
  if (!details) return "";
  return [...details.choices, details.other?.trim() ? `Other: ${details.other.trim()}` : ""]
    .filter(Boolean)
    .join(", ");
}

// One line per answered type, for staff pages and the AI classifier, e.g.
// "Cyber — which social media or app did it happen on?: Facebook, TikTok".
export function describeTypeDetails(details: BullyingTypeDetails | null | undefined): { type: BullyingType; label: string; prompt: string; answer: string }[] {
  if (!details) return [];
  return TYPE_ORDER.flatMap((type) => {
    const answer = describeTypeAnswer(details[type]);
    return answer ? [{ type, label: BULLYING_TYPE_LABELS[type], prompt: TYPE_QUESTIONS[type].prompt, answer }] : [];
  });
}

// Combines the three Setting inputs into the single readable string that is
// stored in `setting` (what every existing screen and the classifier read).
export function formatSetting(date: string, time: string, place: string): string {
  const parts: string[] = [];
  if (date) {
    const d = new Date(`${date}T00:00:00`);
    parts.push(Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  }
  if (time) {
    const [h, m] = time.split(":").map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      parts.push(`${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`);
    } else parts.push(time);
  }
  if (place.trim()) parts.push(place.trim());
  return parts.join(" · ");
}
