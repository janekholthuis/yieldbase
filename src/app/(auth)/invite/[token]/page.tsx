import Link from "next/link";
import { getInviteInfo } from "@/lib/actions/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { InviteAcceptForm } from "./InviteAcceptForm";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  support: "Support",
  vertriebsleiter: "Vertriebsleiter",
  vp_l1: "Vertriebspartner Level 1",
  vp_l2: "Vertriebspartner Level 2",
  vp_l3: "Vertriebspartner Level 3",
  kunde: "Kunde",
  finanzierer: "Finanzierungspartner",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let info: Awaited<ReturnType<typeof getInviteInfo>> | null = null;
  let errored = false;
  try {
    info = await getInviteInfo({ token });
  } catch {
    errored = true;
  }

  const errorMessage =
    errored || !info
      ? "Einladung konnte nicht geladen werden."
      : !info.ok
        ? info.reason === "expired"
          ? "Diese Einladung ist abgelaufen."
          : info.reason === "used"
            ? "Diese Einladung wurde bereits eingelöst."
            : "Einladung wurde nicht gefunden."
        : null;

  return (
    <AuthShell
      title="Account aktivieren"
      subtitle={
        info && info.ok
          ? `Du wurdest als ${ROLE_LABEL[info.role] ?? info.role} eingeladen.`
          : undefined
      }
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Zum Login
        </Link>
      }
    >
      {info && info.ok ? (
        <InviteAcceptForm token={token} email={info.email} role={info.role} />
      ) : (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
    </AuthShell>
  );
}
