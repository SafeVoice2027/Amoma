"use client";

import { useRef, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import type { ReportFollowup } from "@/types/database";

export function FollowupPanel({
  followups,
  currentUserId,
  authorLabels,
  sendMessage,
}: {
  followups: ReportFollowup[];
  currentUserId: string;
  authorLabels: Record<string, string>;
  sendMessage: (message: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Follow-up thread</h2>
      <div className="space-y-3">
        {followups.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No messages yet.</p>
        )}
        {followups.map((f) => {
          const mine = f.author_id === currentUserId;
          return (
            <div key={f.id} className={`max-w-[80%] ${mine ? "ml-auto" : ""}`}>
              <p className={`mb-1 text-xs font-medium text-[var(--color-text-muted)] ${mine ? "text-right" : ""}`}>
                {authorLabels[f.author_id] ?? (mine ? "You" : "Unknown")}
              </p>
              <div
                className={`rounded-xl px-4 py-2 text-sm ${
                  mine
                    ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                }`}
              >
                {f.message}
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="mt-4 flex gap-2"
        action={() => {
          const value = inputRef.current?.value ?? "";
          if (!value.trim()) return;
          startTransition(() => sendMessage(value));
          if (inputRef.current) inputRef.current.value = "";
        }}
      >
        <input
          ref={inputRef}
          placeholder="Send a message..."
          className="flex-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <Button type="submit" disabled={pending} className="min-h-0 px-4 py-2 text-sm">
          Send
        </Button>
      </form>
    </Card>
  );
}
