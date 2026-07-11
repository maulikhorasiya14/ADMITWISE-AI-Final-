import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { requireAdminRouteAccess } from "@/features/auth/authService";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireAdminRouteAccess();

  if (!access.success && access.code === "UNAUTHORIZED") {
    redirect("/auth/sign-in?next=/admin");
  }

  if (!access.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <ErrorState title="Admin access blocked" message={access.message} />
      </div>
    );
  }

  return children;
}
