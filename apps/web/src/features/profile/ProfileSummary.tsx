import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import { getPreferenceWeightTotal } from "@/features/profile/profileSchema";

type ProfileSummaryProps = {
  profile: SavedStudentProfile;
};

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  const rows = [
    ["Exams", profile.exams.map(e => `${e.exam} ${e.examYear} (${[e.rank ? `Rank ${e.rank}` : null, e.categoryRank ? `Category Rank ${e.categoryRank}` : null, e.percentile !== undefined ? `${e.percentile}%ile` : null, e.marks !== undefined ? `${e.marks} marks` : null].filter(Boolean).join(", ")})`).join(" | ")],
    ["Category", profile.category],
    ["Gender", profile.gender.replaceAll("_", " ")],
    ["Home", [profile.homeCity, profile.homeState].filter(Boolean).join(", ")],
    ["Branches", profile.preferredBranches.join(", ")],
    ["States", profile.preferredStates.length ? profile.preferredStates.join(", ") : "No state preference"],
    ["College type", profile.collegeTypePreference],
    ["Hostel", profile.hostelRequired ? "Required" : "Not required"],
    ["Annual budget", profile.maximumAnnualBudget !== undefined ? `INR ${profile.maximumAnnualBudget.toLocaleString("en-IN")}` : "Not specified"],
    ["Income band", profile.familyIncomeBand || "Not specified"],
    ["Career goal", profile.careerGoal.replaceAll("_", " ")],
    ["Weight total", `${getPreferenceWeightTotal(profile.weights)} / 100`]
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </div>
  );
}
