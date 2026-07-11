import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { AuthStatus } from "@/features/auth/AuthStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdmitWise AI",
  description: "Evidence-based engineering admission decisions for Indian students."
};

const navItems = [
  { href: "/profile", label: "Profile" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/colleges", label: "Colleges" },
  { href: "/compare", label: "Compare" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/counsellor", label: "Counsellor" },
  { href: "/reports/new", label: "Reports" },
  { href: "/admin", label: "Admin" }
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="print-hidden border-b bg-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
              <span>AdmitWise AI</span>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <nav aria-label="Primary navigation" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <AuthStatus />
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
