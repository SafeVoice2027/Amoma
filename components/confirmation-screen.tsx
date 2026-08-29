"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, Hash, MessageCircle, Home, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { SupportChat } from "@/components/support-chat";
import { sendSupportChatMessage } from "@/app/student/report/actions";

export function ConfirmationScreen({ urgent, caseId }: { urgent: boolean; caseId: string }) {
  const [showChat, setShowChat] = useState(false);

  if (showChat) {
    return (
      <SupportChat
        urgent={urgent}
        caseId={caseId}
        sendMessage={sendSupportChatMessage}
        onClose={() => setShowChat(false)}
      />
    );
  }

  const steps = [
    "Your counselor will review your report within 48 hours.",
    "You'll see the status update to 'Under Review' in My Reports.",
    "Your counselor won't call you to the office or reach out by name — any follow-up happens right here, anonymously, in your report's thread.",
    urgent
      ? "If needed, the counselor may take action without revealing your identity."
      : "Your counselor may take action without revealing your identity.",
  ];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex flex-col items-center text-center">
        <div
          className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${
            urgent ? "bg-[var(--color-danger-600)]" : "bg-[var(--color-primary-600)]"
          }`}
        >
          {urgent ? (
            <AlertTriangle className="h-7 w-7 text-white" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={2} />
          )}
        </div>
        <h1 className="text-xl font-semibold">Report Submitted{urgent ? " — Urgent" : ""}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {urgent
            ? "Your counselor has been notified immediately. Crisis resources have been sent to you."
            : "Thank you for speaking up. Your report is confidential and being reviewed."}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-primary-800)]">
          <Hash size={14} />
          Your Case ID
        </div>
        <p className="mt-1 text-2xl font-bold tracking-wide text-[var(--color-primary-800)]">{caseId}</p>
        <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--color-primary-800)_75%,transparent)]">
          Use this ID to check the status of your report. No one can identify you from this ID.
        </p>
      </div>

      <Card className="mt-4 text-left">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Eye size={16} />
          What happens next
        </div>
        <ol className="space-y-3">
          {steps.map((text, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-xs font-semibold text-[var(--color-primary-700)]">
                {i + 1}
              </span>
              <span className="text-[var(--color-text-muted)]">{text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => setShowChat(true)}
          className="block w-full rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5 text-left transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
              <MessageCircle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--color-primary-800)]">Talk it Through</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Chat with a supportive AI while you wait for your counselor.
              </p>
            </div>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white">
              <ArrowRight size={16} />
            </span>
          </div>
        </button>

        <Link
          href="/student"
          className="block rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
              <Home size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--color-accent-800)]">Back to Home</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Return home — you can check on this report anytime from My Reports.
              </p>
            </div>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-white">
              <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
