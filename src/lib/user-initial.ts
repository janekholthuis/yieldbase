/**
 * Einheitlicher User-Initial-Helper für Avatar-Buttons.
 *
 * Priorität: vorname → erstes Wort von name → email → "?".
 * Ergebnis ist immer uppercase, exakt ein Zeichen.
 */
export function getUserInitial(args: {
  vorname?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const first =
    args.vorname?.trim()?.[0] ??
    args.name?.trim().split(/\s+/)[0]?.[0] ??
    args.email?.trim()?.[0] ??
    "?";
  return first.toUpperCase();
}
