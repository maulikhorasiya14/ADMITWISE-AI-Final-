"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { loadGuestProfile } from "@/features/profile/profileStorage";
import { comparisonResultSchema, type ComparisonMode, type ComparisonResult } from "./comparisonTypes";

type CompareClientProps = {
  optionIds: string[];
  mode: ComparisonMode;
  showDifferencesOnly: boolean;
};

export function CompareClient({ optionIds, mode, showDifferencesOnly }: CompareClientProps) {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const profile = loadGuestProfile();
    if (!profile) {
      setMessage("Complete your student profile first so the comparison can include admission chance and branch fit.");
      return;
    }

    if (optionIds.length !== 2 || optionIds[0] === optionIds[1]) {
      setMessage("Select exactly two different published college-branch options.");
      return;
    }

    let active = true;
    setStatus("loading");
    setMessage(null);

    fetch("/api/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ profile, optionIds, mode })
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error("Unable to load comparison right now.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const parsed = comparisonResultSchema.nullable().safeParse(
          typeof payload === "object" && payload && "data" in payload ? payload.data : null
        );
        if (!parsed.success) {
          throw new Error("Comparison data did not match the expected format.");
        }
        setResult(parsed.data);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to load comparison right now.");
      });

    return () => {
      active = false;
    };
  }, [mode, optionIds]);

  const visibleRows = useMemo(() => {
    if (!result) return [];
    const rows = buildComparisonRows(result);
    return showDifferencesOnly ? rows.filter((row) => row.winner !== "tie") : rows;
  }, [result, showDifferencesOnly]);

  if (message) {
    return (
      <EmptyState
        title="Comparison not ready"
        message={message}
        action={
          <Link href="/profile" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Edit profile
          </Link>
        }
      />
    );
  }

  if (status === "loading") {
    return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Loading deterministic comparison...</div>;
  }

  if (status === "error") {
    return <div className="rounded-lg border border-destructive/40 bg-card p-5 text-sm text-muted-foreground">{message}</div>;
  }

  if (!result) {
    return (
      <EmptyState
        title="Choose two options"
        message="Select exactly two published college-branch options to compare verified data."
      />
    );
  }

  const [left, right] = result.options;
  if (!left || !right) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Overall deterministic winner</p>
        <h2 className="mt-1 text-2xl font-semibold">
          {winnerLabel(result.winner, left.collegeName, right.collegeName)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scores do not imply guaranteed admission, placement or salary.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3 font-medium">Signal</th>
              <th className="p-3 font-medium">{left.collegeName}</th>
              <th className="p-3 font-medium">{right.collegeName}</th>
              <th className="p-3 font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.label} className="border-t">
                <td className="p-3 font-medium">{row.label}</td>
                <td className="p-3">{row.left}</td>
                <td className="p-3">{row.right}</td>
                <td className="p-3">{winnerLabel(row.winner, left.collegeName, right.collegeName)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildComparisonRows(result: ComparisonResult) {
  const [left, right] = result.options;
  if (!left || !right) return [];

  return [
    {
      label: "Branch",
      left: left.branchName,
      right: right.branchName,
      winner: "tie"
    },
    {
      label: "Admission classification",
      left: left.admissionClassification ?? "Data not publicly available",
      right: right.admissionClassification ?? "Data not publicly available",
      winner: result.categoryWinners.admission
    },
    {
      label: "Branch fit",
      left: scoreLabel(left.branchFitScore),
      right: scoreLabel(right.branchFitScore),
      winner: result.categoryWinners.branchFit
    },
    {
      label: "Four-year cost",
      left: moneyLabel(left.fourYearCost),
      right: moneyLabel(right.fourYearCost),
      winner: result.categoryWinners.fourYearCost
    },
    {
      label: "Placement percentage",
      left: percentLabel(left.placementPercentage),
      right: percentLabel(right.placementPercentage),
      winner: result.categoryWinners.placementPercentage
    },
    {
      label: "Median package",
      left: packageLabel(left.medianPackage),
      right: packageLabel(right.medianPackage),
      winner: result.categoryWinners.package
    },
    {
      label: "Average package",
      left: packageLabel(left.averagePackage),
      right: packageLabel(right.averagePackage),
      winner: result.categoryWinners.package
    },
    {
      label: "ROI score",
      left: scoreLabel(left.roiScore),
      right: scoreLabel(right.roiScore),
      winner: result.categoryWinners.roi
    },
    {
      label: "Affordability",
      left: scoreLabel(left.affordabilityScore),
      right: scoreLabel(right.affordabilityScore),
      winner: result.categoryWinners.affordability
    },
    {
      label: "Data confidence",
      left: scoreLabel(left.dataConfidenceScore),
      right: scoreLabel(right.dataConfidenceScore),
      winner: result.categoryWinners.dataConfidence
    },
    {
      label: "Missing information",
      left: left.missingInformation.length ? left.missingInformation.join(", ") : "None",
      right: right.missingInformation.length ? right.missingInformation.join(", ") : "None",
      winner: "insufficient_data"
    }
  ];
}

function winnerLabel(winner: string, leftName: string, rightName: string) {
  if (winner === "left") return leftName;
  if (winner === "right") return rightName;
  if (winner === "tie") return "Tie";
  return "Insufficient data";
}

function moneyLabel(value: number | null) {
  return value === null ? "Data not publicly available" : `INR ${value.toLocaleString("en-IN")}`;
}

function scoreLabel(value: number | null) {
  return value === null ? "Data not publicly available" : `${value}/100`;
}

function percentLabel(value: number | null) {
  return value === null ? "Data not publicly available" : `${value}%`;
}

function packageLabel(value: number | null) {
  return value === null ? "Data not publicly available" : `${value} LPA`;
}
