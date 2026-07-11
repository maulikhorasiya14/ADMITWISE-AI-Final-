"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SessionResponse =
  | {
      success: true;
      data: {
        roles: Array<"student" | "researcher" | "admin">;
        postSignInPath: string;
      };
    }
  | {
      success: false;
      error: {
        message: string;
      };
    };

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const initialError = searchParams.get("error") === "forbidden" ? "Your account does not have admin or researcher access." : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const sessionPayload = (await sessionResponse.json().catch(() => null)) as SessionResponse | null;

    if (!sessionResponse.ok || !sessionPayload) {
      setMessage("Signed in, but the account role could not be verified.");
      setIsSubmitting(false);
      return;
    }

    if (!sessionPayload.success) {
      setMessage(sessionPayload.error.message);
      setIsSubmitting(false);
      return;
    }

    const safeNextPath = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";
    const target = safeNextPath || sessionPayload.data.postSignInPath;

    router.push(target as Route);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-5 shadow-sm">
      
      {/* Demo Credentials Helper */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-semibold mb-1">Demo Credentials:</p>
        <ul className="space-y-1 text-xs">
          <li><strong>Admin:</strong> admin@example.com / admin123</li>
          <li><strong>Researcher:</strong> researcher@example.com / researcher123</li>
          <li><strong>Student:</strong> student@example.com / student123</li>
        </ul>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      {message ? <p className="text-sm font-medium text-destructive">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
