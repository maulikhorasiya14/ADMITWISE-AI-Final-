import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";

export default function NotFound() {
  return (
    <PageContainer>
      <EmptyState
        title="Page not found"
        message="This page is not part of the current AdmitWise scaffold."
        action={<Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Go home</Link>}
      />
    </PageContainer>
  );
}
