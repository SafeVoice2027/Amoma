import type { SeverityLevel } from "@/types/database";
import type { Translate } from "./translate";

// Translated severity badge text for the student app (see SeverityBadge's
// `labels` prop in components/ui.tsx).
export function severityLabels(t: Translate): Record<SeverityLevel | "pending", string> {
  return {
    pending: t("sev.pending"),
    precursor: t("sev.precursor"),
    minor: t("sev.minor"),
    less_serious: t("sev.less_serious"),
    serious: t("sev.serious"),
    complex: t("sev.complex"),
  };
}
