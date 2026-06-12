import type { ReactNode } from "react";
import { ObjektpilotWordmark } from "@/components/brand/ObjektpilotLogo";

/**
 * design: navy+gold token-map for AuthShell
 * - Karte: rounded-2xl + border-brand-borderSoft + bg-brand-surface + shadow-card
 * - Gradient-Blob: subtle Hero-Wash
 * - Header: ObjektpilotWordmark, Subtitle uppercase tracking-[0.2em] text-brand-muted
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-bg px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[860px] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, #1583C9 0%, #F2A661 60%, transparent 100%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-brand-borderSoft bg-brand-surface p-8 shadow-card">
          <div className="mb-7 flex flex-col gap-2">
            <ObjektpilotWordmark logoSize={30} textClassName="text-xl" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Vertriebsplattform
            </p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-primary">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm text-brand-body">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-brand-muted">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
