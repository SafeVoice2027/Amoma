export type SupportChatMode = "feelings" | "guidance";

export interface SupportChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SupportChatContext {
  mode: SupportChatMode;
  urgent: boolean;
  caseId: string;
  messages: SupportChatMessage[];
}

const MODE_INSTRUCTIONS: Record<SupportChatMode, string> = {
  feelings:
    'The student chose to talk about how they feel. Listen actively, validate their emotions without judgment, and offer gentle, general coping strategies (breathing, grounding, journaling, talking to a trusted adult) when it fits naturally. Ask open, caring follow-up questions. Do NOT try to investigate, solve, or give an opinion on the bullying incident itself — that is the counselor\'s job.',
  guidance:
    "The student chose to be walked through what happens next. Explain the process factually using the report context below (anonymity protections, review timeline, and that any counselor follow-up happens anonymously through the in-app report thread — never by name, in person, or by contacting them outside the app). Answer their procedural questions as best you can from that context; if you don't know something, say a counselor will be able to answer that.",
};

const SYSTEM_PROMPT_HEADER = `You are Amoma's supportive chat companion for a student who just submitted a school bullying report. You are NOT a licensed counselor or therapist — you never diagnose, give medical/legal advice, or investigate the report. A human school counselor separately reviews the actual report and will follow up with the student through the report thread.

Always:
- Keep replies short (2-5 sentences) and warm, in plain language appropriate for a school-age student.
- Reply in whichever language the student is using — English, Filipino/Tagalog, Bisaya/Cebuano, or a code-switched mix of these. Match their language rather than defaulting to English.
- If anything in the conversation suggests the student may be in immediate danger, thinking about self-harm, or suicidal, respond with care, gently pause the current topic, and clearly tell them to use the crisis hotlines shown on this screen or call 911 / their local emergency number right now.
- Never ask for the student's name, contact details, or other identifying information.
- Never claim to be a real person or a professional counselor.`;

const FALLBACK_DISCLAIMER =
  "(This reply is a general message — live AI chat isn't configured right now. Your counselor will still follow up on your actual report.)";

export async function getSupportReply(context: SupportChatContext): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await replyWithClaude(context);
    } catch {
      // fall through to a static reply so the chat never hard-fails
    }
  }

  return fallbackReply(context);
}

async function replyWithClaude(context: SupportChatContext): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `${SYSTEM_PROMPT_HEADER}\n\n${MODE_INSTRUCTIONS[context.mode]}\n\nReport context:\n- Case ID: ${context.caseId}\n- Urgency: ${context.urgent ? "URGENT — the student flagged immediate danger when filing this report" : "standard, non-urgent"}`;

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 400,
    system,
    messages: context.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = message.content.find((b) => b.type === "text")?.text;
  return text?.trim() || fallbackReply(context);
}

const FEELINGS_FALLBACKS = [
  "Thank you for sharing that with me. However you're feeling right now is okay — there's no right or wrong way to react to something like this. Would it help to take a few slow breaths together, or would you rather just keep talking for a bit?",
  "That sounds really hard, and I'm glad you're not keeping it to yourself. Sometimes it helps to name what you're feeling out loud, even just to yourself. Is there a trusted adult nearby you could also talk to right now?",
  "I hear you. It's okay to feel however you feel about this — you don't have to have it all figured out. Your counselor will be reviewing your report soon, and you can keep talking here in the meantime if that helps.",
];

function fallbackReply(context: SupportChatContext): string {
  if (context.mode === "guidance") {
    const steps = context.urgent
      ? "Because you marked this as urgent, your counselor has already been notified and will review it right away. You'll see the status change to 'Under Review' in My Reports."
      : "Your counselor will review your report within 48 hours, and you'll see the status change to 'Under Review' in My Reports.";
    return `Here's what happens next: ${steps} Your counselor won't call you to the office or reach out by name — any follow-up happens right here, anonymously, in your report's thread. You can check on it anytime using Case ID ${context.caseId}, or add more details through that follow-up thread. ${FALLBACK_DISCLAIMER}`;
  }

  const turnCount = context.messages.filter((m) => m.role === "user").length;
  const base = FEELINGS_FALLBACKS[Math.min(turnCount - 1, FEELINGS_FALLBACKS.length - 1)] ?? FEELINGS_FALLBACKS[0];
  return `${base} ${FALLBACK_DISCLAIMER}`;
}
