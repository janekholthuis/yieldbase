import type { ReactNode } from "react";
import { ObjektpilotWordmark } from "@/components/brand/ObjektpilotLogo";

/**
 * design (PROJ-25): clean, ruhig — kein Gradient-Wash, keine Marketing-Eyebrow.
 * Karte: rounded-2xl + border-brand-borderSoft + bg-brand-surface + shadow-card.
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
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-brand-borderSoft bg-brand-surface p-8 shadow-card">
          <div className="mb-7">
            <ObjektpilotWordmark logoSize={30} textClassName="text-xl" />
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
