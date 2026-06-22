import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* Geteilte Marketing-Navigation + Footer für Landing (`/`) und Roadmap. */

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center bg-brand-primary text-sm font-bold text-white">
            OP
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-brand-ink">
            Objekt&nbsp;Pilot
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-brand-body md:flex">
          <Link href="/#plattform" className="hover:text-brand-ink">
            Plattform
          </Link>
          <Link href="/#module" className="hover:text-brand-ink">
            Module
          </Link>
          <Link href="/roadmap" className="hover:text-brand-ink">
            Roadmap
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-9 items-center px-4 text-sm font-medium text-brand-body hover:text-brand-ink sm:inline-flex"
          >
            Anmelden
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primaryHover"
          >
            Demo ansehen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-brand-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center bg-brand-primary text-xs font-bold text-white">
            OP
          </span>
          <span className="text-sm font-semibold text-brand-ink">Objekt Pilot</span>
        </div>
        <p className="text-sm text-brand-muted">
          © 2026 Objekt Pilot · Eine Plattform statt zehn Tools.
        </p>
        <div className="flex items-center gap-6 text-sm text-brand-body">
          <Link href="/roadmap" className="hover:text-brand-ink">
            Roadmap
          </Link>
          <Link href="/#module" className="hover:text-brand-ink">
            Module
          </Link>
          <Link href="/login" className="hover:text-brand-ink">
            Anmelden
          </Link>
        </div>
      </div>
    </footer>
  );
}
