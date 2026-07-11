"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import type { ComparisonMode } from "@/features/comparison/comparisonTypes";
import { loadGuestProfile } from "@/features/profile/profileStorage";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import { reportSnapshotSchema, type ReportSectionSelection, type ReportSnapshot } from "./reportTypes";
import { defaultReportSectionSelection } from "./reportTypes";
import { ReportViewer } from "./ReportViewer";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

const sectionLabels: Array<{ key: keyof ReportSectionSelection; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "recommendations", label: "Recommendations" },
  { key: "comparison", label: "Comparison" },
  { key: "costs", label: "Costs and ROI" },
  { key: "scholarships", label: "Scholarships" },
  { key: "counsellor", label: "Counsellor summary" },
  { key: "evidence", label: "Evidence" }
];

const initialComparisonSelection = {
  optionA: "",
  optionB: "",
  mode: "student"
} satisfies ComparisonSelection;

type ReportComparisonOption = {
  optionId: string;
  label: string;
};

type ComparisonSelection = {
  optionA: string;
  optionB: string;
  mode: ComparisonMode;
};

export function ReportPreviewClient({ comparisonOptions }: Readonly<{ comparisonOptions: ReportComparisonOption[] }>) {
  const router = useRouter();
  const [profile, setProfile] = useState<SavedStudentProfile | null>(null);
  const [sections, setSections] = useState<ReportSectionSelection>(defaultReportSectionSelection);
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonSelection>(initialComparisonSelection);
  const [preview, setPreview] = useState<ReportSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const storedProfile = loadGuestProfile();
    setProfile(storedProfile);
    if (!storedProfile) {
      setMessage("Complete your profile before generating a report.");
      setIsLoading(false);
      return;
    }

    void loadPreview(storedProfile, defaultReportSectionSelection, initialComparisonSelection);
  }, []);

  async function loadPreview(nextProfile: SavedStudentProfile, nextSections: ReportSectionSelection, nextComparison: ComparisonSelection) {
    setIsLoading(true);
    setMessage("");
    const response = await fetch("/api/reports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "AdmitWise decision-support report",
        profile: nextProfile,
        sections: nextSections,
        comparison: getComparisonPayload(nextComparison)
      })
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
    if (!response.ok || !payload || !payload.success) {
      setPreview(null);
      setMessage(payload && !payload.success ? payload.error.message : "Unable to prepare report preview.");
      setIsLoading(false);
      return;
    }

    const parsed = reportSnapshotSchema.safeParse(payload.data);
    setPreview(parsed.success ? parsed.data : null);
    setMessage(parsed.success ? "" : "Report preview did not match the expected safe schema.");
    setIsLoading(false);
  }

  async function handleGenerate() {
    if (!profile) return;
    setIsGenerating(true);
    setMessage("");

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "AdmitWise decision-support report",
        profile,
        sections,
        comparison: getComparisonPayload(comparisonSelection)
      })
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<{ id: string }> | null;
    if (!response.ok || !payload || !payload.success) {
      setMessage(payload && !payload.success ? payload.error.message : "Unable to save report.");
      setIsGenerating(false);
      return;
    }

    router.push(`/reports/${payload.data.id}` as Route);
  }

  function updateSection(key: keyof ReportSectionSelection, checked: boolean) {
    const nextSections = { ...sections, [key]: checked };
    setSections(nextSections);
    if (profile) void loadPreview(profile, nextSections, comparisonSelection);
  }

  function updateComparison(nextComparison: ComparisonSelection) {
    setComparisonSelection(nextComparison);
    if (profile) void loadPreview(profile, sections, nextComparison);
  }

  if (!profile) {
    return (
      <ErrorState
        title="No profile found"
        message="Complete and save your profile in this browser, then return here to generate a decision-support report."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="print-hidden rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Report checklist</h2>
            <p className="text-sm text-muted-foreground">Choose sections to include. Report data is rebuilt on preview, then saved as a fixed snapshot when generated.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || isLoading || !preview}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {isGenerating ? "Generating..." : "Generate report"}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {sectionLabels.map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={sections[item.key]}
                onChange={(event) => updateSection(item.key, event.target.checked)}
                className="h-4 w-4"
              />
              {item.label}
            </label>
          ))}
        </div>
        {comparisonOptions.length >= 2 ? (
          <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3">
            <label>
              <span className="text-sm font-medium">Comparison option A</span>
              <select
                value={comparisonSelection.optionA}
                onChange={(event) => updateComparison({ ...comparisonSelection, optionA: event.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">No option A</option>
                {comparisonOptions.map((option) => (
                  <option key={option.optionId} value={option.optionId}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Comparison option B</span>
              <select
                value={comparisonSelection.optionB}
                onChange={(event) => updateComparison({ ...comparisonSelection, optionB: event.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">No option B</option>
                {comparisonOptions.map((option) => (
                  <option key={option.optionId} value={option.optionId}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Comparison mode</span>
              <select
                value={comparisonSelection.mode}
                onChange={(event) => updateComparison({ ...comparisonSelection, mode: event.target.value as ComparisonMode })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="student">Student Mode</option>
                <option value="parent">Parent Mode</option>
              </select>
            </label>
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm font-medium text-destructive">{message}</p> : null}
      </section>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Preparing report preview...</div>
      ) : preview ? (
        <ReportViewer report={preview} />
      ) : (
        <ErrorState title="Preview unavailable" message={message || "Unable to prepare report preview."} />
      )}
    </div>
  );
}

function getComparisonPayload(selection: ComparisonSelection) {
  if (!selection.optionA || !selection.optionB || selection.optionA === selection.optionB) {
    return undefined;
  }

  return {
    optionIds: [selection.optionA, selection.optionB],
    mode: selection.mode
  };
}
