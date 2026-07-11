type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="mb-2 text-sm font-medium uppercase tracking-wide text-positive">{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
