import { Mail, Phone } from "lucide-react";
import { Card } from "@/components/ui";

export const SUPPORT_EMAIL = "safe.voicer@gmail.com";
export const SUPPORT_PHONE = "09940487218";

export function ContactUsCard() {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Contact us</h2>
      <div className="mt-4 space-y-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm hover:bg-[var(--color-background)]"
        >
          <Mail size={18} className="flex-shrink-0 text-[var(--color-primary-600)]" />
          <span>{SUPPORT_EMAIL}</span>
        </a>
        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm hover:bg-[var(--color-background)]"
        >
          <Phone size={18} className="flex-shrink-0 text-[var(--color-primary-600)]" />
          <span>{SUPPORT_PHONE}</span>
        </a>
      </div>
    </Card>
  );
}
