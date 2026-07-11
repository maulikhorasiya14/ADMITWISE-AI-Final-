import type { SourceType } from "@admitwise/shared-types";

const sourceLabels: Record<SourceType, string> = {
  government: "Government",
  counselling_authority: "Counselling authority",
  official_college: "Official college",
  verified_student: "Verified student",
  public_unverified: "Public unverified",
  inference: "Inference"
};

export function SourceBadge({ sourceType }: { sourceType: SourceType }) {
  return (
    <span className="inline-flex items-center rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
      Source: {sourceLabels[sourceType]}
    </span>
  );
}
