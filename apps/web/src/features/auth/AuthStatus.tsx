import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}

export async function AuthStatus() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href={"/auth/sign-in" as Route}
        className="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Sign in
      </Link>
    );
  }

  return (
    <form action={signOut} className="flex items-center gap-2">
      <span className="max-w-[180px] truncate text-sm text-muted-foreground">{user.email}</span>
      <button type="submit" className="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
        Sign out
      </button>
    </form>
  );
}
