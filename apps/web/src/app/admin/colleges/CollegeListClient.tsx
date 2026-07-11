"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { CollegeListRow } from "@/features/admin/adminCollegeService";
import { Search } from "lucide-react";

export function CollegeListClient({ colleges }: { colleges: CollegeListRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? colleges.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.city.toLowerCase().includes(search.toLowerCase()) ||
          c.state.toLowerCase().includes(search.toLowerCase())
      )
    : colleges;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search colleges…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No colleges match your search.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Ownership</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((college) => (
                <tr key={college.id} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/colleges/${college.id}` as Route}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {college.name}
                    </Link>
                    {college.short_name && (
                      <span className="ml-2 text-xs text-muted-foreground">({college.short_name})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{college.city}</td>
                  <td className="px-4 py-3">{college.state}</td>
                  <td className="px-4 py-3 capitalize">{college.ownership.toLowerCase()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        college.is_published
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {college.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(college.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
