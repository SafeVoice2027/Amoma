"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { ArrowLeft, X, Heart, Compass, Send, ShieldAlert, Phone, ChevronDown, ArrowRight } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { CRISIS_LINES } from "@/lib/crisis-lines";
import type { SupportChatContext, SupportChatMessage, SupportChatMode } from "@/lib/ai/support-chat";

const MODE_TITLES: Record<SupportChatMode, string> = {
  feelings: "Just Here to Listen",
  guidance: "What Happens Next",
};

const MODE_OPENERS: Record<SupportChatMode, string> = {
  feelings:
    "I'm really glad you spoke up — that took courage. However you're feeling right now is okay. What's on your mind?",
  guidance:
    "Happy to walk you through it. Once your counselor reviews your report, you'll see the status update. Any follow-up from them happens right here, anonymously, in your report's thread — not by name or in person. What would you like to know more about?",
};

export function SupportChat({
  urgent,
  caseId,
  sendMessage,
  onClose,
}: {
  urgent: boolean;
  caseId: string;
  sendMessage: (context: SupportChatContext) => Promise<{ reply: string } | { error: string }>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<SupportChatMode | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showCrisis, setShowCrisis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const chooseMode = (chosen: SupportChatMode) => {
    setMode(chosen);
    setMessages([{ role: "assistant", content: MODE_OPENERS[chosen] }]);
  };

  const send = () => {
    const text = input.trim();
    if (!text || !mode || pending) return;
    setError(null);
    const nextMessages: SupportChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    startTransition(async () => {
      const result = await sendMessage({ mode, urgent, caseId, messages: nextMessages });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    });
  };

  if (!mode) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold">Talk it Through</h1>
          <span className="w-9" />
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Want to talk about it?</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            This is a supportive AI chat — not a replacement for your counselor, who will still
            follow up on your actual report. Pick whichever feels right for you right now.
          </p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => chooseMode("feelings")}
              className="block w-full rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
                  <Heart size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[var(--color-primary-800)]">Talk about how I feel</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Share what&apos;s on your mind — I&apos;m here to listen.
                  </p>
                </div>
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white">
                  <ArrowRight size={16} />
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => chooseMode("guidance")}
              className="block w-full rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
                  <Compass size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[var(--color-accent-800)]">Guide me through next steps</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    I&apos;ll explain what happens now that you&apos;ve filed your report.
                  </p>
                </div>
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-white">
                  <ArrowRight size={16} />
                </span>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full text-center text-sm font-medium text-[var(--color-text-muted)] underline"
          >
            Not right now
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col" style={{ minHeight: "70vh" }}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode(null)}
          aria-label="Back to options"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">{MODE_TITLES[mode]}</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-3 overflow-hidden rounded-xl border border-[var(--color-danger-300)]">
        <button
          type="button"
          onClick={() => setShowCrisis((s) => !s)}
          className="flex w-full items-center justify-between gap-2 bg-[var(--color-danger-50)] px-4 py-2.5 text-left text-sm font-medium text-[var(--color-danger-700)]"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert size={16} />
            In immediate danger? Get help now
          </span>
          <ChevronDown size={16} className={`transition-transform ${showCrisis ? "rotate-180" : ""}`} />
        </button>
        {showCrisis && (
          <ul className="space-y-2 bg-[var(--color-danger-50)] p-3 pt-0">
            {CRISIS_LINES.map((line) => (
              <li key={line.number}>
                <a
                  href={`tel:${line.number.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 hover:bg-[var(--color-danger-100)]"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
                    <Phone size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--color-danger-700)]">
                      {line.label}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-sm font-semibold text-[var(--color-danger-700)]">
                    {line.number}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        style={{ maxHeight: "50vh" }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--color-primary-600)] text-white"
                : "bg-[var(--color-background)] text-[var(--color-text)]"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="max-w-[85%] rounded-xl bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-muted)]">
            Typing...
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
          {error}
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)]"
        />
        <Button type="submit" disabled={pending || !input.trim()} className="px-4">
          <Send size={18} />
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
        This is supportive AI guidance, not a substitute for professional care. Your counselor will
        still follow up on your actual report.
      </p>
    </div>
  );
}
