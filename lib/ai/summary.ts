import type { ReportStatus, SeverityLevel } from "@/types/database";

export interface UnresolvedCase {
  id: string;
  status: ReportStatus;
  severity: SeverityLevel | null;
  createdAt: string;
  followupCount: number;
}

const UNRESOLVED_STATUSES: ReportStatus[] = ["unresolved", "in_process"];

function daysOpen(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

// Summarizes why cases are stuck, citing only report metadata (status,
// severity, age, follow-up count) — never the free-text description — to
// keep PII out of the prompt per the Data Privacy Act minimization rule.
export async function summarizeUnresolved(cases: UnresolvedCase[]): Promise<string> {
  const unresolved = cases.filter((c) => UNRESOLVED_STATUSES.includes(c.status));
  if (unresolved.length === 0) return "No unresolved cases right now — nice work staying on top of the queue.";

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await summarizeWithClaude(unresolved);
    } catch {
      // fall through to heuristic
    }
  }

  return heuristicSummary(unresolved);
}

async function summarizeWithClaude(cases: UnresolvedCase[]): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const rows = cases.map((c) => ({
    status: c.status,
    severity: c.severity,
    days_open: daysOpen(c.createdAt),
    followup_count: c.followupCount,
  }));

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system:
      "You summarize why school report cases are stuck for a staff dashboard. Cite only the fields given — never invent facts, and never speculate about people involved. 2-4 sentences, plain language.",
    messages: [{ role: "user", content: JSON.stringify(rows) }],
  });

  return message.content.find((b) => b.type === "text")?.text ?? heuristicSummary(cases);
}

function heuristicSummary(cases: UnresolvedCase[]): string {
  const stale = cases.filter((c) => daysOpen(c.createdAt) >= 3 && c.followupCount === 0);
  const highSeverity = cases.filter((c) => c.severity === "serious" || c.severity === "critical");
  const parts: string[] = [];

  if (highSeverity.length) {
    parts.push(
      `${highSeverity.length} high-severity ${highSeverity.length === 1 ? "case is" : "cases are"} still unresolved.`,
    );
  }
  if (stale.length) {
    parts.push(
      `${stale.length} ${stale.length === 1 ? "case has" : "cases have"} been open 3+ days with no staff reply yet.`,
    );
  }
  if (!parts.length) {
    parts.push(`${cases.length} case${cases.length === 1 ? " is" : "s are"} in the queue, none flagged as stale.`);
  }

  return parts.join(" ");
}
