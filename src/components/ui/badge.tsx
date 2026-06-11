import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * design: navy+gold token-map for Badge
 * - rounded-full (Pill-Form aus Master-Spec)
 * - Variants matchen /design-test StatusBadge: primary=primaryTint, accent=accentSoft,
 *   success=successSoft, warning=warningSoft, destructive=dangerSoft, info=infoSoft
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-brand-primaryTint text-brand-primary",
        primary:
          "bg-brand-primary text-white",
        secondary:
          "bg-brand-surfaceMuted text-brand-primary",
        accent:
          "bg-brand-accentSoft text-brand-accentText",
        success:
          "bg-brand-successSoft text-brand-success",
        warning:
          "bg-brand-warningSoft text-brand-warning",
        destructive:
          "bg-brand-dangerSoft text-brand-danger",
        info:
          "bg-brand-infoSoft text-brand-info",
        muted:
          "bg-brand-surfaceMuted text-brand-muted",
        outline:
          "border border-brand-border bg-transparent text-brand-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
