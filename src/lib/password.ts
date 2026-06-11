import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Mindestens 10 Zeichen")
  .regex(/[A-Z]/, "Mindestens 1 Großbuchstabe")
  .regex(/[a-z]/, "Mindestens 1 Kleinbuchstabe")
  .regex(/[0-9]/, "Mindestens 1 Zahl");

export function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 10, label: "Mindestens 10 Zeichen" },
    { ok: /[A-Z]/.test(pw), label: "Mindestens 1 Großbuchstabe" },
    { ok: /[a-z]/.test(pw), label: "Mindestens 1 Kleinbuchstabe" },
    { ok: /[0-9]/.test(pw), label: "Mindestens 1 Zahl" },
  ];
}
