/**
 * Erfolg-mit-Immobilien logo — house outline in brand blue with an
 * upward-rising growth arrow in brand peach. Symbolisiert Wertsteigerung
 * und Erfolg mit Immobilien.
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
      {/* House outline (rounded corners) in brand blue */}
      <path
        d="M7 18.5 L20 7 L33 18.5 V32 a2.5 2.5 0 0 1 -2.5 2.5 H9.5 A2.5 2.5 0 0 1 7 32 Z"
        stroke="#1583C9"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Rising growth arrow in brand peach */}
      <path
        d="M12.5 28.5 L18 22.5 L22.5 26 L28 19"
        stroke="#F2A661"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M24.5 18.5 H28.5 V22.5"
        stroke="#F2A661"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
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
        <span className="text-brand-primary">Erfolg mit </span>
        <span className="text-brand-accent">Immobilien</span>
      </span>
    </span>
  );
}
