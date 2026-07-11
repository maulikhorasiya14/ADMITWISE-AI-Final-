import type { CollegeFacilities } from "../collegeQualitativeSchemas";

export function FacilitiesSection({ facilities }: { facilities: CollegeFacilities | null }) {
  if (!facilities) {
    return <p className="text-sm text-muted-foreground">Facilities data not publicly available</p>;
  }

  const { data } = facilities;

  const renderItem = (label: string, value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">Data not publicly available</span>;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") {
      if (value.available === true) return "Available";
      if (value.available === false) return "Not available";
      if (value.count) return `${value.count} (Capacity: ${value.capacity || value.capacity_each || 'Unknown'})`;
      if (value.published === true) return "Published as available";
      return "Details available";
    }
    return String(value);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Facilities & Infrastructure</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FacilityCard label="Campus Area" value={data.campus_area_acres ? `${data.campus_area_acres} acres` : null} />
        <FacilityCard label="Boys Hostels" value={renderItem("Boys Hostels", data.boys_hostels)} />
        <FacilityCard label="Girls Hostels" value={renderItem("Girls Hostels", data.girls_hostels)} />
        <FacilityCard label="Mess" value={renderItem("Mess", data.mess)} />
        <FacilityCard label="Wi-Fi" value={renderItem("Wi-Fi", data.wifi)} />
        <FacilityCard label="Gym" value={renderItem("Gym", data.gym)} />
        <FacilityCard label="Library" value={renderItem("Library", data.library)} />
        <FacilityCard label="Sports" value={data.sports_facilities} />
        <FacilityCard label="Medical Centre" value={renderItem("Medical Centre", data.medical_centre)} />
        <FacilityCard label="Laboratories" value={data.laboratories} />
      </div>
    </section>
  );
}

function FacilityCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value || <span className="text-muted-foreground">Data not publicly available</span>}</dd>
    </div>
  );
}
