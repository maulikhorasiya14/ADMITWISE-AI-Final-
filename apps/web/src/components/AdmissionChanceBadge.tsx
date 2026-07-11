import type { RecommendationClassification } from "@admitwise/shared-types";

const labels: Record<RecommendationClassification, string> = {
  SAFE: "Safe",
  SMART: "Smart",
  AMBITIOUS: "Ambitious",
  UNLIKELY: "Unlikely"
};

const tones: Record<RecommendationClassification, string> = {
  SAFE: "bg-positive text-positive-foreground",
  SMART: "bg-primary text-primary-foreground",
  AMBITIOUS: "bg-warning text-warning-foreground",
  UNLIKELY: "bg-destructive text-destructive-foreground"
};

export function AdmissionChanceBadge({ classification }: { classification: RecommendationClassification }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${tones[classification]}`}>
      {labels[classification]}
    </span>
  );
}
