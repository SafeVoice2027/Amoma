import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ContactUsCard } from "@/components/contact-us-card";
import { BugReportForm } from "@/components/bug-report-form";
import { submitBugReport } from "@/app/student/help/actions";
import { getT } from "@/lib/i18n/server";

export default async function HelpHubPage() {
  const { t } = await getT();
  return (
    <div>
      <Link
        href="/student"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} />
        {t("common.back")}
      </Link>

      <PageHeader title={t("help.title")} subtitle={t("help.sub")} />

      <div className="space-y-6">
        <ContactUsCard title={t("help.contact")} />
        <BugReportForm submitBugReport={submitBugReport} />
      </div>
    </div>
  );
}
