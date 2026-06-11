/**
 * Objektpilot logo — abstract mark: navy chevron rising under a gold dot.
 * Symbolisiert Aufwärtsentwicklung über einem soliden Fundament.
 */
export function ObjektpilotLogo({
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

export function ObjektpilotWordmark({
  className,
  logoSize = 28,
  textClassName = "text-lg",
}: {
  className?: string;
  logoSize?: number;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <ObjektpilotLogo size={logoSize} />
      <span
        className={`font-bold tracking-tight ${textClassName}`}
        style={{ letterSpacing: "-0.02em" }}
      >
        <span className="text-brand-primary">Objekt</span>
        <span className="text-brand-accent">pilot</span>
      </span>
    </span>
  );
}
