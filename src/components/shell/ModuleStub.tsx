export function ModuleStub({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Modul folgt in einem späteren Schritt.
        </p>
      </div>
    </div>
  );
}
