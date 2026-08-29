import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ContactUsCard } from "@/components/contact-us-card";
import { BugReportForm } from "@/components/bug-report-form";
import { submitBugReport } from "@/app/student/help/actions";

export default function HelpHubPage() {
  return (
    <div>
      <Link
        href="/student"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <PageHeader title="Help Hub" subtitle="Get in touch with us or report a problem with the app." />

      <div className="space-y-6">
        <ContactUsCard />
        <BugReportForm submitBugReport={submitBugReport} />
      </div>
    </div>
  );
}
