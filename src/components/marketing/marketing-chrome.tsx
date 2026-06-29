import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* Geteilte Marketing-Navigation + Footer für Landing (`/`) und Roadmap. */

/** Objekt-Pilot-Logo-Mark — navy Quadrat mit weißem Navigations-/Piloten-Pfeil. */
function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center bg-brand-primary text-white ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
        className="h-[58%] w-[58%]"
      >
        <path d="M12 3.5 L19 20.5 L12 16.6 L5 20.5 Z" />
      </svg>
    </span>
  );
}

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
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
            className="inline-flex h-9 items-center gap-1.5 bg-brand-primary px-4 text-sm font-semibold text-white transition-colors duration-ds-short ease-ds-out hover:bg-brand-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
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
          <BrandMark className="h-7 w-7" />
          <span className="text-sm font-semibold text-brand-ink">Objekt Pilot</span>
        </div>
        <p className="text-sm text-brand-muted">
          © 2026 Objekt Pilot · Ein Produkt der Enablence Ltd.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-body">
          <Link href="/roadmap" className="hover:text-brand-ink">
            Roadmap
          </Link>
          <Link href="/impressum" className="hover:text-brand-ink">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-brand-ink">
            Datenschutz
          </Link>
          <Link href="/login" className="hover:text-brand-ink">
            Anmelden
          </Link>
        </div>
      </div>
    </footer>
  );
}
