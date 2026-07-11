import type { ConfidenceLevel } from "@admitwise/shared-types";

const confidenceText: Record<ConfidenceLevel, string> = {
  A: "High confidence",
  B: "Official source",
  C: "Verified student",
  D: "Unverified public",
  E: "Inference only"
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const tone = level === "A" || level === "B" ? "border-positive text-positive" : level === "E" ? "border-warning text-warning-foreground bg-warning/20" : "border-border text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {level}: {confidenceText[level]}
    </span>
  );
}
