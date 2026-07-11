import type { StudentExperienceSource } from "../collegeQualitativeSchemas";
import { ExternalLink, Info } from "lucide-react";

export function StudentExperienceSection({ sources }: { sources: StudentExperienceSource[] }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Student Experience Sources</h2>
      <p className="text-sm text-muted-foreground mb-4">
        These are the publicly available student accounts that were analyzed to generate the campus reality summaries.
      </p>
      
      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <article key={source.id} className="rounded-lg border bg-card p-5 text-sm flex flex-col h-full">
            <div className="flex justify-between items-start mb-2 gap-4">
              <h3 className="font-semibold text-base line-clamp-2">{source.source_title || "Unnamed Source"}</h3>
              {source.platform && (
                <span className="inline-flex rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground shrink-0">
                  {source.platform}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
              {source.publication_date && <span>Date: {source.publication_date}</span>}
              {source.source_identity_type && <span>Identity: {source.source_identity_type}</span>}
            </div>

            <div className="space-y-2 flex-1">
              {source.topics_covered && (
                <p><span className="font-medium text-foreground">Topics:</span> {source.topics_covered.replace(/;/g, ", ")}</p>
              )}
              
              {source.positive_themes && (
                <p><span className="font-medium text-green-700 dark:text-green-500">Positives:</span> {source.positive_themes.replace(/;/g, ", ")}</p>
              )}
              
              {source.negative_themes && (
                <p><span className="font-medium text-amber-700 dark:text-amber-500">Concerns:</span> {source.negative_themes.replace(/;/g, ", ")}</p>
              )}
            </div>

            {(source.possible_bias || source.notes) && (
              <div className="mt-4 rounded-md bg-muted p-3 flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  {source.possible_bias && <p><strong>Bias Check:</strong> {source.possible_bias}</p>}
                  {source.notes && <p className="mt-1">{source.notes}</p>}
                </div>
              </div>
            )}

            {source.url && (
              <div className="mt-4 pt-3 border-t">
                <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                  View Original Source
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
