import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { ErrorState } from "@/components/ErrorState";
import { getCollegeForEditor } from "@/features/admin/adminCollegeService";
import { CollegeEditorClient } from "./CollegeEditorClient";

export const dynamic = "force-dynamic";

export default async function CollegeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCollegeForEditor(id);

  if (!result.success && result.code === "NOT_FOUND") {
    notFound();
  }

  if (!result.success) {
    return (
      <PageContainer>
        <ErrorState title="Unable to load college" message={result.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={"/admin/colleges" as Route}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Editing college</p>
            <h1 className="text-xl font-semibold">{result.data.college.name}</h1>
          </div>
        </div>

        <CollegeEditorClient data={result.data} />
      </div>
    </PageContainer>
  );
}
