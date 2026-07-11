"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { loadGuestProfile } from "@/features/profile/profileStorage";
import type { CollegeListItem } from "@/features/colleges/collegeSchemas";
import { scholarshipMatchSchema, type ScholarshipMatch } from "./scholarshipTypes";

type ScholarshipsClientProps = {
  colleges: CollegeListItem[];
};

const matchListSchema = scholarshipMatchSchema.array();

export function ScholarshipsClient({ colleges }: ScholarshipsClientProps) {
  const [collegeId, setCollegeId] = useState("");
  const [matches, setMatches] = useState<ScholarshipMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const profile = loadGuestProfile();
    if (!profile) {
      setMessage("Complete your student profile first so AdmitWise can match scholarships deterministically.");
      return;
    }

    let active = true;
    setLoading(true);
    setMessage(null);

    fetch("/api/scholarships", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile,
        collegeId: collegeId || undefined
      })
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error("Unable to load scholarship matches right now.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const parsed = matchListSchema.safeParse(
          typeof payload === "object" && payload && "data" in payload ? payload.data : null
        );
        if (!parsed.success) {
          throw new Error("Scholarship data did not match the expected format.");
        }
        setMatches(parsed.data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Unable to load scholarship matches right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collegeId]);

  if (message) {
    return (
      <EmptyState
        title="Scholarship matching not ready"
        message={message}
        action={
          <Link href="/profile" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Edit profile
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <label className="block max-w-xl rounded-lg border bg-card p-4 shadow-sm">
        <span className="text-sm font-medium">Selected college</span>
        <select
          value={collegeId}
          onChange={(event) => setCollegeId(event.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All published scholarships</option>
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Checking deterministic scholarship eligibility...</div>
      ) : !matches || matches.length === 0 ? (
        <EmptyState
          title="No published scholarships found"
          message="No verified published scholarships are available for this profile and selected college yet."
        />
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <article key={match.scholarship.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-positive">{statusLabel(match.status)}</p>
                  <h2 className="mt-1 text-lg font-semibold">{match.scholarship.name}</h2>
                  <p className="text-sm text-muted-foreground">{match.scholarship.provider}</p>
                </div>
                <div className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
                  {match.possibleBenefitAmount !== null
                    ? `Possible benefit: INR ${match.possibleBenefitAmount.toLocaleString("en-IN")}`
                    : match.possibleBenefitDescription}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {match.scholarship.description || match.scholarship.benefit_description}
              </p>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <InfoItem label="Deadline" value={match.scholarship.application_deadline || "Data not publicly available"} />
                <InfoItem label="Required documents" value={match.scholarship.required_documents.length ? match.scholarship.required_documents.join(", ") : "Data not publicly available"} />
                <InfoItem label="Renewal" value={match.scholarship.renewal_conditions.length ? match.scholarship.renewal_conditions.join(", ") : "Data not publicly available"} />
                <InfoItem label="Estimated effective cost" value={match.estimatedEffectiveCost === null ? "Select a college with published fees for an estimate" : `Estimated INR ${match.estimatedEffectiveCost.toLocaleString("en-IN")}`} />
              </dl>

              {match.missingInformation.length ? (
                <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">
                  Missing information: {match.missingInformation.join(", ")}
                </p>
              ) : null}

              {match.reasons.length ? (
                <p className="mt-3 text-sm text-muted-foreground">{match.reasons.join(" ")}</p>
              ) : null}

              {match.scholarship.official_url ? (
                <a href={match.scholarship.official_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-primary">
                  Official source
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function statusLabel(status: ScholarshipMatch["status"]) {
  switch (status) {
    case "potentially_eligible":
      return "Potentially eligible";
    case "not_eligible":
      return "Not eligible";
    case "more_information_required":
      return "More information required";
    case "deadline_passed":
      return "Deadline passed";
  }
}
