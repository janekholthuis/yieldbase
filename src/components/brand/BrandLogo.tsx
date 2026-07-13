"use client";

import { useActiveOrg } from "@/components/providers";

/**
 * Erfolg-mit-Immobilien fallback mark — navy chevron rising under a gold dot.
 * Used when the active organisation has no custom logo.
 */
export function BrandLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Gold dot at apex */}
      <circle cx="20" cy="9" r="4" fill="#C99B4D" />
      {/* Navy chevron */}
      <path
        d="M5 33 L20 18 L35 33"
        stroke="#1B2D45"
        strokeWidth="5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

/**
 * Brand wordmark. Shows the active organisation's logo + name when set,
 * otherwise the default Erfolg-mit-Immobilien mark. Colors follow the active theme.
 */
export function BrandWordmark({
  className,
  logoSize = 28,
  textClassName = "text-lg",
}: {
  className?: string;
  logoSize?: number;
  textClassName?: string;
}) {
  const org = useActiveOrg();

  if (org) {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logoUrl}
            alt=""
            style={{ height: logoSize, width: "auto" }}
            className="object-contain"
          />
        ) : (
          <BrandLogo size={logoSize} />
        )}
        <span
          className={`font-bold tracking-tight text-brand-primary ${textClassName}`}
          style={{ letterSpacing: "-0.02em" }}
        >
          {org.name}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandLogo size={logoSize} />
      <span
        className={`font-bold tracking-tight ${textClassName}`}
        style={{ letterSpacing: "-0.02em" }}
      >
        <span className="text-brand-primary">Erfolg mit </span>
        <span className="text-brand-accent">Immobilien</span>
      </span>
    </span>
  );
}
