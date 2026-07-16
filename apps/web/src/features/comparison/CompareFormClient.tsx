"use client";

import { useMemo, useState } from "react";
import type { ComparisonMode } from "./comparisonTypes";

type CompareFormClientProps = {
  options: Array<{
    optionId: string;
    label: string;
    collegeName: string;
    branchName: string;
  }>;
  initialOptionA?: string;
  initialOptionB?: string;
  initialMode: ComparisonMode;
  initialShowDifferencesOnly: boolean;
};

export function CompareFormClient({
  options,
  initialOptionA,
  initialOptionB,
  initialMode,
  initialShowDifferencesOnly,
}: CompareFormClientProps) {
  // Extract unique colleges
  const colleges = useMemo(() => {
    const uniqueColleges = new Set<string>();
    options.forEach((opt) => uniqueColleges.add(opt.collegeName));
    return Array.from(uniqueColleges).sort();
  }, [options]);

  // Group branches by college
  const branchesByCollege = useMemo(() => {
    const map = new Map<string, typeof options>();
    options.forEach((opt) => {
      if (!map.has(opt.collegeName)) {
        map.set(opt.collegeName, []);
      }
      map.get(opt.collegeName)!.push(opt);
    });
    return map;
  }, [options]);

  // Determine initial selected colleges based on initial option IDs
  const initialCollegeA =
    options.find((opt) => opt.optionId === initialOptionA)?.collegeName ?? "";
  const initialCollegeB =
    options.find((opt) => opt.optionId === initialOptionB)?.collegeName ?? "";

  const [collegeA, setCollegeA] = useState(initialCollegeA);
  const [collegeB, setCollegeB] = useState(initialCollegeB);

  const [optionA, setOptionA] = useState(initialOptionA ?? "");
  const [optionB, setOptionB] = useState(initialOptionB ?? "");

  const branchesA = collegeA ? branchesByCollege.get(collegeA) ?? [] : [];
  const branchesB = collegeB ? branchesByCollege.get(collegeB) ?? [] : [];

  return (
    <form className="grid gap-6 rounded-lg border bg-card p-5 shadow-sm md:grid-cols-2">
      {/* Group A */}
      <div className="space-y-4 rounded-md border bg-muted/20 p-4">
        <h3 className="font-semibold text-sm">Option A</h3>
        <label className="block">
          <span className="text-sm font-medium">Select College</span>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={collegeA}
            onChange={(e) => {
              setCollegeA(e.target.value);
              setOptionA(""); // Reset branch when college changes
            }}
          >
            <option value="">Select College A...</option>
            {colleges.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Select Branch</span>
          <select
            name="optionA"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            disabled={!collegeA}
          >
            <option value="">Select Branch A...</option>
            {branchesA.map((opt) => (
              <option key={opt.optionId} value={opt.optionId}>
                {opt.branchName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Group B */}
      <div className="space-y-4 rounded-md border bg-muted/20 p-4">
        <h3 className="font-semibold text-sm">Option B</h3>
        <label className="block">
          <span className="text-sm font-medium">Select College</span>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={collegeB}
            onChange={(e) => {
              setCollegeB(e.target.value);
              setOptionB(""); // Reset branch when college changes
            }}
          >
            <option value="">Select College B...</option>
            {colleges.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Select Branch</span>
          <select
            name="optionB"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            disabled={!collegeB}
          >
            <option value="">Select Branch B...</option>
            {branchesB.map((opt) => (
              <option key={opt.optionId} value={opt.optionId}>
                {opt.branchName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Mode</span>
            <select
              name="mode"
              defaultValue={initialMode}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="student">Student Mode</option>
              <option value="parent">Parent Mode</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="differences"
              value="1"
              defaultChecked={initialShowDifferencesOnly}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Show differences only</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={!optionA || !optionB || optionA === optionB}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare Options
        </button>
      </div>
    </form>
  );
}
