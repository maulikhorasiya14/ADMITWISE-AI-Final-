import type { CampusReality } from "../collegeQualitativeSchemas";

export function CampusRealitySection({ campusReality }: { campusReality: CampusReality | null }) {
  if (!campusReality) {
    return <p className="text-sm text-muted-foreground">Campus reality data not publicly available</p>;
  }

  const topics = Object.entries(campusReality.data).filter(([k]) => k !== "overall_satisfaction");

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Campus Life Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map(([key, value]) => {
          const val = value as any;
          if (!val?.summary) return null;
          return (
            <article key={key} className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold capitalize">{key.replace(/_/g, " ")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{val.summary}</p>
              
              {val.positive_themes?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium uppercase text-muted-foreground">Positives</h4>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {val.positive_themes.map((theme: string, i: number) => (
                      <li key={i} className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {theme}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {val.negative_themes?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium uppercase text-muted-foreground">Concerns</h4>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {val.negative_themes.map((theme: string, i: number) => (
                      <li key={i} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {theme}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Evidence: {val.evidence_strength || "Unknown"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
