import { BrandMark } from "@/components/layout/BrandMark";

export function TriageHeader() {
  return (
    <header className="flex items-start gap-4">
      <BrandMark size={44} />
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-flamingo-cyan">
          Flamingo
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Triage
        </h1>
        <p className="max-w-xl text-sm text-muted">
          Shared queue per workspace. Claim an item so nobody duplicates the
          work — then resolve or release.
        </p>
      </div>
    </header>
  );
}
