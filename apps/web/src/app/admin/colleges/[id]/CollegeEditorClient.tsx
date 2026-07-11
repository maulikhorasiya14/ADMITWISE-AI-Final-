"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  GitBranch,
  DollarSign,
  BarChart3,
  MapPin,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle
} from "lucide-react";
import type { CollegeEditorData, BranchRow, FeeRow, PlacementRow } from "@/features/admin/adminCollegeService";
import {
  collegeIdentitySchema,
  branchInputSchema,
  feeInputSchema,
  placementInputSchema,
  locationInputSchema,
  type CollegeIdentityInput,
  type BranchInput,
  type FeeInput,
  type PlacementInput,
  type LocationInput
} from "@/features/admin/adminCollegeSchemas";

// --- Tabs ---

const tabs = [
  { key: "identity", label: "Identity", icon: Building2 },
  { key: "branches", label: "Branches", icon: GitBranch },
  { key: "fees", label: "Fees", icon: DollarSign },
  { key: "placements", label: "Placements", icon: BarChart3 },
  { key: "location", label: "Location", icon: MapPin }
] as const;

type TabKey = (typeof tabs)[number]["key"];

// --- Main Component ---

export function CollegeEditorClient({ data }: { data: CollegeEditorData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const readOnly = !data.isAdmin;

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <strong>View only.</strong> Your researcher account can view college data but cannot make changes. Admin access is required to edit.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "identity" && <IdentityTab data={data} readOnly={readOnly} />}
      {activeTab === "branches" && <BranchesTab data={data} readOnly={readOnly} />}
      {activeTab === "fees" && <FeesTab data={data} readOnly={readOnly} />}
      {activeTab === "placements" && <PlacementsTab data={data} readOnly={readOnly} />}
      {activeTab === "location" && <LocationTab data={data} readOnly={readOnly} />}
    </div>
  );
}

// --- Shared helpers ---

function StatusMessage({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <p className={`mt-2 text-sm ${type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {type === "success" && <Check className="mr-1 inline h-4 w-4" />}
      {type === "error" && <AlertTriangle className="mr-1 inline h-4 w-4" />}
      {message}
    </p>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FieldInput({
  id,
  register,
  error,
  type = "text",
  placeholder,
  disabled
}: {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-400" : ""}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

async function apiCall(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? "An error occurred.");
  }
  return json.data;
}

// ============================================================
// IDENTITY TAB
// ============================================================

function IdentityTab({ data, readOnly }: { data: CollegeEditorData; readOnly: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CollegeIdentityInput>({
    resolver: zodResolver(collegeIdentitySchema as any),
    defaultValues: {
      name: data.college.name,
      short_name: data.college.short_name ?? "",
      slug: data.college.slug,
      ownership: data.college.ownership as CollegeIdentityInput["ownership"],
      institute_type: data.college.institute_type ?? "",
      affiliated_university: data.college.affiliated_university ?? "",
      established_year: data.college.established_year ?? undefined,
      official_website: data.college.official_website ?? "",
      admission_website: data.college.admission_website ?? "",
      placement_website: data.college.placement_website ?? "",
      address: data.college.address ?? "",
      city: data.college.city,
      state: data.college.state,
      pincode: data.college.pincode ?? "",
      latitude: data.college.latitude ?? undefined,
      longitude: data.college.longitude ?? undefined,
      is_published: data.college.is_published
    }
  });

  const onSubmit = async (values: CollegeIdentityInput) => {
    setSaving(true);
    setStatus(null);
    try {
      await apiCall(`/api/admin/colleges/${data.college.id}/identity`, "PUT", values);
      setStatus({ message: "College identity saved.", type: "success" });
      router.refresh();
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : "Save failed.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">College identity</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel label="Name" required />
          <FieldInput id="name" register={register("name")} error={errors.name?.message} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Short name" />
          <FieldInput id="short_name" register={register("short_name")} error={errors.short_name?.message} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Slug" required />
          <FieldInput
            id="slug"
            register={register("slug")}
            error={errors.slug?.message}
            placeholder="e.g. iit-bombay"
            disabled={readOnly}
          />
        </div>
        <div>
          <FieldLabel label="Ownership" required />
          <select
            {...register("ownership")}
            disabled={readOnly}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE">Private</option>
            <option value="DEEMED">Deemed</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <FieldLabel label="Institute type" />
          <FieldInput id="institute_type" register={register("institute_type")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Affiliated university" />
          <FieldInput id="affiliated_university" register={register("affiliated_university")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Established year" />
          <FieldInput id="established_year" register={register("established_year")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Official website" />
          <FieldInput id="official_website" register={register("official_website")} placeholder="https://…" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Admission website" />
          <FieldInput id="admission_website" register={register("admission_website")} placeholder="https://…" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Placement website" />
          <FieldInput id="placement_website" register={register("placement_website")} placeholder="https://…" disabled={readOnly} />
        </div>
      </div>

      <h3 className="text-base font-medium">Location</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <FieldLabel label="City" required />
          <FieldInput id="city" register={register("city")} error={errors.city?.message} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="State" required />
          <FieldInput id="state" register={register("state")} error={errors.state?.message} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Pincode" />
          <FieldInput id="pincode" register={register("pincode")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Address" />
          <FieldInput id="address" register={register("address")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Latitude" />
          <FieldInput id="latitude" register={register("latitude")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Longitude" />
          <FieldInput id="longitude" register={register("longitude")} type="number" disabled={readOnly} />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <input
          type="checkbox"
          id="is_published"
          {...register("is_published")}
          disabled={readOnly}
          className="h-4 w-4 rounded accent-primary"
        />
        <div>
          <label htmlFor="is_published" className="text-sm font-medium">
            Published
          </label>
          <p className="text-xs text-muted-foreground">Publishing makes this college visible to students on public pages.</p>
        </div>
      </div>

      {status && <StatusMessage message={status.message} type={status.type} />}

      {!readOnly && (
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save identity
        </button>
      )}
    </form>
  );
}

// ============================================================
// BRANCHES TAB
// ============================================================

function BranchesTab({ data, readOnly }: { data: CollegeEditorData; readOnly: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BranchRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<BranchRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiCall(`/api/admin/colleges/${data.college.id}/branches/${deleting.id}`, "DELETE");
      setStatus({ message: "Branch deleted.", type: "success" });
      setDeleting(null);
      router.refresh();
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : "Delete failed.", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleting, data.college.id, router]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Branches ({data.branches.length})</h2>
        {!readOnly && (
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add branch
          </button>
        )}
      </div>

      {status && <StatusMessage message={status.message} type={status.type} />}

      {data.branches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No branches added yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Degree</th>
                <th className="px-4 py-3 font-medium">Years</th>
                <th className="px-4 py-3 font-medium">Intake</th>
                <th className="px-4 py-3 font-medium">Year</th>
                {!readOnly && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b) => (
                <tr key={b.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3">{b.degree}</td>
                  <td className="px-4 py-3">{b.duration_years}</td>
                  <td className="px-4 py-3">{b.intake ?? "—"}</td>
                  <td className="px-4 py-3">{b.academic_year ?? "—"}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(b)} className="rounded p-1 hover:bg-muted" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(b)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <BranchModal
          collegeId={data.college.id}
          branch={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setStatus({ message: "Branch saved.", type: "success" });
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete branch"
        message="This will permanently delete this branch and all linked cutoff records. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

function BranchModal({
  collegeId,
  branch,
  onClose,
  onSaved
}: {
  collegeId: string;
  branch: BranchRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<BranchInput>({
    resolver: zodResolver(branchInputSchema as any),
    defaultValues: branch
      ? {
          id: branch.id,
          name: branch.name,
          degree: branch.degree,
          duration_years: branch.duration_years,
          intake: branch.intake ?? undefined,
          nba_accredited: branch.nba_accredited ?? undefined,
          source_id: branch.source_id,
          academic_year: branch.academic_year ?? "",
          confidence_level: branch.confidence_level as BranchInput["confidence_level"]
        }
      : { duration_years: 4, confidence_level: "B" }
  });

  const onSubmit = async (values: BranchInput) => {
    setSaving(true);
    setError(null);
    try {
      await apiCall(`/api/admin/colleges/${collegeId}/branches`, "POST", values);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{branch ? "Edit branch" : "Add branch"}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {branch && <input type="hidden" {...register("id")} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Branch name" required />
              <FieldInput id="branch_name" register={register("name")} error={errors.name?.message} />
            </div>
            <div>
              <FieldLabel label="Degree" required />
              <FieldInput id="degree" register={register("degree")} error={errors.degree?.message} placeholder="B.Tech" />
            </div>
            <div>
              <FieldLabel label="Duration (years)" required />
              <FieldInput id="duration_years" register={register("duration_years")} type="number" error={errors.duration_years?.message} />
            </div>
            <div>
              <FieldLabel label="Intake" />
              <FieldInput id="intake" register={register("intake")} type="number" />
            </div>
            <div>
              <FieldLabel label="Academic year" />
              <FieldInput id="academic_year" register={register("academic_year")} placeholder="2025-26" />
            </div>
            <div>
              <FieldLabel label="Source ID" required />
              <FieldInput id="source_id" register={register("source_id")} error={errors.source_id?.message} placeholder="UUID" />
            </div>
            <div>
              <FieldLabel label="Confidence" />
              <select {...register("confidence_level")} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                <option value="A">A — Government</option>
                <option value="B">B — Official college</option>
                <option value="C">C — Verified student</option>
                <option value="D">D — Public unverified</option>
                <option value="E">E — Inference</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("nba_accredited")} className="h-4 w-4 rounded accent-primary" />
                NBA accredited
              </label>
            </div>
          </div>

          {error && <StatusMessage message={error} type="error" />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// FEES TAB
// ============================================================

function FeesTab({ data, readOnly }: { data: CollegeEditorData; readOnly: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FeeRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<FeeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiCall(`/api/admin/colleges/${data.college.id}/fees/${deleting.id}`, "DELETE");
      setStatus({ message: "Fee record deleted.", type: "success" });
      setDeleting(null);
      router.refresh();
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : "Delete failed.", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleting, data.college.id, router]);

  const fmt = (v: number | null) => (v != null ? `₹${v.toLocaleString("en-IN")}` : "—");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fee records ({data.fees.length})</h2>
        {!readOnly && (
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add fee record
          </button>
        )}
      </div>

      {status && <StatusMessage message={status.message} type={status.type} />}

      {data.fees.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No fee records added yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Academic year</th>
                <th className="px-4 py-3 font-medium">Tuition</th>
                <th className="px-4 py-3 font-medium">Hostel</th>
                <th className="px-4 py-3 font-medium">4-yr est.</th>
                {!readOnly && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.fees.map((f) => (
                <tr key={f.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{f.academic_year}</td>
                  <td className="px-4 py-3">{fmt(f.tuition_fee)}</td>
                  <td className="px-4 py-3">{fmt(f.hostel_fee)}</td>
                  <td className="px-4 py-3">{fmt(f.estimated_four_year_cost)}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(f)} className="rounded p-1 hover:bg-muted" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(f)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <FeeModal
          collegeId={data.college.id}
          fee={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setStatus({ message: "Fee record saved.", type: "success" });
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete fee record"
        message={`Delete the fee record for ${deleting?.academic_year ?? "this year"}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

function FeeModal({ collegeId, fee, onClose, onSaved }: { collegeId: string; fee: FeeRow | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FeeInput>({
    resolver: zodResolver(feeInputSchema as any),
    defaultValues: fee
      ? {
          id: fee.id,
          academic_year: fee.academic_year,
          tuition_fee: fee.tuition_fee ?? undefined,
          hostel_fee: fee.hostel_fee ?? undefined,
          mess_fee: fee.mess_fee ?? undefined,
          admission_fee: fee.admission_fee ?? undefined,
          refundable_deposit: fee.refundable_deposit ?? undefined,
          other_compulsory_fees: fee.other_compulsory_fees ?? undefined,
          estimated_four_year_cost: fee.estimated_four_year_cost ?? undefined,
          source_id: fee.source_id
        }
      : {}
  });

  const onSubmit = async (values: FeeInput) => {
    setSaving(true);
    setError(null);
    try {
      await apiCall(`/api/admin/colleges/${collegeId}/fees`, "POST", values);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{fee ? "Edit fee record" : "Add fee record"}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {fee && <input type="hidden" {...register("id")} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Academic year" required />
              <FieldInput id="academic_year" register={register("academic_year")} error={errors.academic_year?.message} placeholder="2025-26" />
            </div>
            <div>
              <FieldLabel label="Source ID" required />
              <FieldInput id="source_id" register={register("source_id")} error={errors.source_id?.message} placeholder="UUID" />
            </div>
            <div>
              <FieldLabel label="Tuition fee (₹)" />
              <FieldInput id="tuition_fee" register={register("tuition_fee")} type="number" />
            </div>
            <div>
              <FieldLabel label="Hostel fee (₹)" />
              <FieldInput id="hostel_fee" register={register("hostel_fee")} type="number" />
            </div>
            <div>
              <FieldLabel label="Mess fee (₹)" />
              <FieldInput id="mess_fee" register={register("mess_fee")} type="number" />
            </div>
            <div>
              <FieldLabel label="Admission fee (₹)" />
              <FieldInput id="admission_fee" register={register("admission_fee")} type="number" />
            </div>
            <div>
              <FieldLabel label="Refundable deposit (₹)" />
              <FieldInput id="refundable_deposit" register={register("refundable_deposit")} type="number" />
            </div>
            <div>
              <FieldLabel label="Other compulsory (₹)" />
              <FieldInput id="other_compulsory_fees" register={register("other_compulsory_fees")} type="number" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel label="Estimated 4-year cost (₹)" />
              <FieldInput id="estimated_four_year_cost" register={register("estimated_four_year_cost")} type="number" />
            </div>
          </div>

          {error && <StatusMessage message={error} type="error" />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// PLACEMENTS TAB
// ============================================================

function PlacementsTab({ data, readOnly }: { data: CollegeEditorData; readOnly: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlacementRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<PlacementRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiCall(`/api/admin/colleges/${data.college.id}/placements/${deleting.id}`, "DELETE");
      setStatus({ message: "Placement record deleted.", type: "success" });
      setDeleting(null);
      router.refresh();
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : "Delete failed.", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleting, data.college.id, router]);

  const lpa = (v: number | null) => (v != null ? `${v} LPA` : "—");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Placement records ({data.placements.length})</h2>
        {!readOnly && (
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add placement
          </button>
        )}
      </div>

      {status && <StatusMessage message={status.message} type={status.type} />}

      {data.placements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No placement records added yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Placed</th>
                <th className="px-4 py-3 font-medium">%</th>
                <th className="px-4 py-3 font-medium">Avg pkg</th>
                <th className="px-4 py-3 font-medium">Median pkg</th>
                {!readOnly && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.placements.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{p.placement_year}</td>
                  <td className="px-4 py-3">{p.students_placed ?? "—"}</td>
                  <td className="px-4 py-3">{p.placement_percentage != null ? `${p.placement_percentage}%` : "—"}</td>
                  <td className="px-4 py-3">{lpa(p.average_package)}</td>
                  <td className="px-4 py-3">{lpa(p.median_package)}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(p)} className="rounded p-1 hover:bg-muted" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(p)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <PlacementModal
          collegeId={data.college.id}
          branches={data.branches}
          placement={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setStatus({ message: "Placement record saved.", type: "success" });
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete placement record"
        message={`Delete the placement record for ${deleting?.placement_year ?? "this year"}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

function PlacementModal({
  collegeId,
  branches,
  placement,
  onClose,
  onSaved
}: {
  collegeId: string;
  branches: BranchRow[];
  placement: PlacementRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<PlacementInput>({
    resolver: zodResolver(placementInputSchema as any),
    defaultValues: placement
      ? {
          id: placement.id,
          branch_id: placement.branch_id ?? undefined,
          placement_year: placement.placement_year,
          graduating_students: placement.graduating_students ?? undefined,
          students_placed: placement.students_placed ?? undefined,
          placement_percentage: placement.placement_percentage ?? undefined,
          average_package: placement.average_package ?? undefined,
          median_package: placement.median_package ?? undefined,
          highest_package: placement.highest_package ?? undefined,
          source_id: placement.source_id
        }
      : {}
  });

  const onSubmit = async (values: PlacementInput) => {
    setSaving(true);
    setError(null);
    try {
      await apiCall(`/api/admin/colleges/${collegeId}/placements`, "POST", values);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{placement ? "Edit placement record" : "Add placement record"}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {placement && <input type="hidden" {...register("id")} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Placement year" required />
              <FieldInput id="placement_year" register={register("placement_year")} error={errors.placement_year?.message} placeholder="2024-25" />
            </div>
            <div>
              <FieldLabel label="Branch (optional)" />
              <select {...register("branch_id")} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Overall (all branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.degree})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel label="Source ID" required />
              <FieldInput id="source_id" register={register("source_id")} error={errors.source_id?.message} placeholder="UUID" />
            </div>
            <div>
              <FieldLabel label="Graduating students" />
              <FieldInput id="graduating_students" register={register("graduating_students")} type="number" />
            </div>
            <div>
              <FieldLabel label="Students placed" />
              <FieldInput id="students_placed" register={register("students_placed")} type="number" />
            </div>
            <div>
              <FieldLabel label="Placement %" />
              <FieldInput id="placement_percentage" register={register("placement_percentage")} type="number" />
            </div>
            <div>
              <FieldLabel label="Average package (LPA)" />
              <FieldInput id="average_package" register={register("average_package")} type="number" />
            </div>
            <div>
              <FieldLabel label="Median package (LPA)" />
              <FieldInput id="median_package" register={register("median_package")} type="number" />
            </div>
            <div>
              <FieldLabel label="Highest package (LPA)" />
              <FieldInput id="highest_package" register={register("highest_package")} type="number" />
            </div>
          </div>

          {error && <StatusMessage message={error} type="error" />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// LOCATION TAB
// ============================================================

function LocationTab({ data, readOnly }: { data: CollegeEditorData; readOnly: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LocationInput>({
    resolver: zodResolver(locationInputSchema as any),
    defaultValues: data.location
      ? {
          nearest_railway_station: data.location.nearest_railway_station ?? "",
          railway_distance_km: data.location.railway_distance_km ?? undefined,
          nearest_airport: data.location.nearest_airport ?? "",
          airport_distance_km: data.location.airport_distance_km ?? undefined,
          nearest_major_hospital: data.location.nearest_major_hospital ?? "",
          hospital_distance_km: data.location.hospital_distance_km ?? undefined,
          public_transport_score: data.location.public_transport_score ?? undefined,
          city_centre_distance_km: data.location.city_centre_distance_km ?? undefined,
          technology_ecosystem_score: data.location.technology_ecosystem_score ?? undefined,
          cost_of_living_band: (data.location.cost_of_living_band as LocationInput["cost_of_living_band"]) ?? undefined,
          source_id: data.location.source_id
        }
      : {}
  });

  const onSubmit = async (values: LocationInput) => {
    setSaving(true);
    setStatus(null);
    try {
      await apiCall(`/api/admin/colleges/${data.college.id}/location`, "PUT", values);
      setStatus({ message: "Location metrics saved.", type: "success" });
      router.refresh();
    } catch (e) {
      setStatus({ message: e instanceof Error ? e.message : "Save failed.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Location metrics</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <FieldLabel label="Nearest railway station" />
          <FieldInput id="nearest_railway_station" register={register("nearest_railway_station")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Railway distance (km)" />
          <FieldInput id="railway_distance_km" register={register("railway_distance_km")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Nearest airport" />
          <FieldInput id="nearest_airport" register={register("nearest_airport")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Airport distance (km)" />
          <FieldInput id="airport_distance_km" register={register("airport_distance_km")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Nearest hospital" />
          <FieldInput id="nearest_major_hospital" register={register("nearest_major_hospital")} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Hospital distance (km)" />
          <FieldInput id="hospital_distance_km" register={register("hospital_distance_km")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Public transport score (0–100)" />
          <FieldInput id="public_transport_score" register={register("public_transport_score")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="City centre distance (km)" />
          <FieldInput id="city_centre_distance_km" register={register("city_centre_distance_km")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Tech ecosystem score (0–100)" />
          <FieldInput id="technology_ecosystem_score" register={register("technology_ecosystem_score")} type="number" disabled={readOnly} />
        </div>
        <div>
          <FieldLabel label="Cost of living" />
          <select
            {...register("cost_of_living_band")}
            disabled={readOnly}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Not set</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <FieldLabel label="Source ID" required />
          <FieldInput id="source_id" register={register("source_id")} error={errors.source_id?.message} placeholder="UUID" disabled={readOnly} />
        </div>
      </div>

      {status && <StatusMessage message={status.message} type={status.type} />}

      {!readOnly && (
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save location
        </button>
      )}
    </form>
  );
}
