import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronDown, Heart, HeartHandshake, Layers, Scale, Smartphone, Users, AlertTriangle } from "lucide-react";
import type { ComponentType } from "react";
import { PageHeader } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { LEARN_TOPICS, type LearnIcon } from "@/lib/learn/content";

const ICONS: Record<LearnIcon, ComponentType<{ size?: number }>> = {
  book: BookOpen,
  layers: Layers,
  "heart-handshake": HeartHandshake,
  users: Users,
  smartphone: Smartphone,
  heart: Heart,
  scale: Scale,
};

// Learn & Prevent: short, plain-language pages about what bullying is, how to
// stay safe, and what to do — so Amoma is a place to learn as well as report.
// Each topic folds open (no JavaScript needed). Content lives in
// lib/learn/content.ts in all three languages.
export default async function LearnPage() {
  const { t, lang } = await getT();

  return (
    <div>
      <Link
        href="/student"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} />
        {t("common.back")}
      </Link>

      <PageHeader title={t("learn.title")} subtitle={t("learn.sub")} />

      <div className="space-y-3">
        {LEARN_TOPICS.map((topic, index) => {
          const Icon = ICONS[topic.icon];
          return (
            <details
              key={topic.id}
              open={index === 0}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
                  <Icon size={18} />
                </span>
                <span className="flex-1 font-semibold">{topic.title[lang]}</span>
                <ChevronDown
                  size={18}
                  className="flex-shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3">
                <p className="text-sm text-[var(--color-text-muted)]">{topic.intro[lang]}</p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {topic.points.map((point, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-primary-600)]" />
                      <span>{point[lang]}</span>
                    </li>
                  ))}
                </ul>
                {topic.reportCta && (
                  <Link
                    href="/student/report/bully"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-brand)]"
                  >
                    <AlertTriangle size={16} />
                    {t("learn.reportCta")}
                  </Link>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs text-[var(--color-text-muted)]">
        {t("learn.emergency")}
      </p>
    </div>
  );
}
