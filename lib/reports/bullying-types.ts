import type { BullyingType } from "@/types/database";

export const BULLYING_TYPE_OPTIONS: { value: BullyingType; label: string }[] = [
  { value: "social", label: "Social" },
  { value: "cyber", label: "Cyber" },
  { value: "physical", label: "Physical" },
  { value: "verbal", label: "Verbal" },
];

export const BULLYING_TYPE_LABELS: Record<BullyingType, string> = {
  social: "Social",
  cyber: "Cyber",
  physical: "Physical",
  verbal: "Verbal",
};
