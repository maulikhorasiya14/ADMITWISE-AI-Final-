import type { Club } from "../collegeQualitativeSchemas";
import { ExternalLink } from "lucide-react";

export function ClubsSection({ clubs }: { clubs: Club[] }) {
  if (clubs.length === 0) {
    return <p className="text-sm text-muted-foreground">Clubs data not publicly available</p>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Clubs & Activities</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => {
          let badgeColor = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
          const status = club.activity_status?.toLowerCase() || "";
          if (status.includes("active")) badgeColor = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
          if (status.includes("dormant")) badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";

          return (
            <article key={club.id} className="rounded-lg border bg-card p-5 flex flex-col h-full">
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold">{club.club_name}</h3>
                  {club.activity_status && (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
                      {club.activity_status}
                    </span>
                  )}
                </div>
                {club.club_category && <p className="mt-1 text-sm text-muted-foreground">{club.club_category}</p>}
                
                {club.description && <p className="mt-4 text-sm">{club.description}</p>}
                
                {club.latest_activity && (
                  <div className="mt-4 text-sm">
                    <span className="font-medium">Latest Activity: </span>
                    <span className="text-muted-foreground">{club.latest_activity} {club.latest_activity_date ? `(${club.latest_activity_date})` : ""}</span>
                  </div>
                )}
              </div>

              {club.official_page && (
                <div className="mt-6 pt-4 border-t">
                  <a href={club.official_page} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Official Page
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
