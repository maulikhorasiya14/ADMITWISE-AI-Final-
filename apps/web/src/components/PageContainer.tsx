export function PageContainer({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</div>;
}
