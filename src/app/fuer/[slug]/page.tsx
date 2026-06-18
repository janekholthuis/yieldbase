// PROJ-24: Öffentliche, gebrandete Lead-Demo-Sandbox (Token-Link, ohne Login).
// Guard: /fuer ist in proxy.ts (PUBLIC_PREFIXES) freigegeben.
import { getDemoBySlug, recordDemoOpen } from "@/lib/data/demo";
import { buildOrgThemeCss } from "@/lib/branding";
import { DemoSandbox } from "@/components/demo/DemoSandbox";

export const metadata = {
  title: "Ihre Plattform-Vorschau",
  // Personalisierter Magic-Link — niemals indexieren.
  robots: { index: false, follow: false },
};

function Unavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-surfaceMuted px-6">
      <div className="max-w-md text-center">
        <span className="grid h-12 w-12 mx-auto place-items-center bg-brand-primary text-base font-bold text-white">
          EH
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-brand-ink">
          Demo nicht verfügbar
        </h1>
        <p className="mt-3 text-brand-body">
          Dieser Vorschau-Link ist nicht mehr gültig oder wurde deaktiviert.
          Bitte fordern Sie bei Ihrem Ansprechpartner einen neuen Link an.
        </p>
        <a
          href="/start"
          className="mt-6 inline-flex h-11 items-center bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-primaryHover"
        >
          Mehr über EMI Hub
        </a>
      </div>
    </main>
  );
}

export default async function DemoSandboxPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const demo = await getDemoBySlug(slug);
  if (!demo) return <Unavailable />;

  // Öffnung zählen (best-effort, blockiert das Rendern nicht).
  void recordDemoOpen(demo.id);

  const themeCss = buildOrgThemeCss({
    primaryColor: demo.primaryColor,
    accentColor: demo.accentColor,
  });

  return (
    <>
      {themeCss ? (
        <style id="demo-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
      ) : null}
      <DemoSandbox
        slug={demo.slug}
        company={demo.leadCompany}
        logoUrl={demo.logoUrl}
      />
    </>
  );
}
