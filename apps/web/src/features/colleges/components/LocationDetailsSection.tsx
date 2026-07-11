import type { LocationDetails } from "../collegeQualitativeSchemas";

export function LocationDetailsSection({ location }: { location: LocationDetails | null }) {
  if (!location) {
    return <p className="text-sm text-muted-foreground">Location data not publicly available</p>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Location & Environment</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold mb-4">Address & Surroundings</h3>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Address" value={location.official_address} />
            <DetailRow label="Locality" value={location.locality} />
            <DetailRow label="District" value={location.district} />
            <DetailRow label="Ecosystem" value={location.technology_ecosystem} />
            <DetailRow label="Cost of Living" value={location.cost_of_living_description} />
          </dl>
        </article>

        <article className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold mb-4">Transport & Accessibility</h3>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Nearest Railway" value={location.railway_travel_time_minutes ? `${location.railway_travel_time_minutes} min` : "Data not available"} />
            <DetailRow label="Nearest Airport" value={location.airport_travel_time_minutes ? `${location.airport_travel_time_minutes} min` : "Data not available"} />
            <DetailRow label="Nearest Metro" value={location.nearest_metro} />
            <DetailRow label="Nearest Bus" value={location.nearest_bus_terminal} />
          </dl>
        </article>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground whitespace-nowrap">{label}</dt>
      <dd className="sm:text-right font-medium">{value || <span className="text-muted-foreground">Data not publicly available</span>}</dd>
    </div>
  );
}
