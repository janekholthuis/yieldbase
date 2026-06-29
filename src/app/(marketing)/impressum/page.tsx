import type { Metadata } from "next";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-chrome";

// PROJ-34: Impressum nach § 5 DDG. Pflicht, weil die Enablence Ltd. (Zypern) den
// DACH-Markt gezielt bewirbt → Herkunftslandprinzip greift nicht. Inhalte aus dem
// bestehenden Enablence-Impressum übernommen (2026-06-28).

export const metadata: Metadata = {
  title: "Impressum — Objekt Pilot",
};

export default function ImpressumPage() {
  return (
    <main className="bg-white text-brand-ink">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-3xl font-bold tracking-tight text-brand-ink md:text-4xl">
          Impressum
        </h1>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-brand-body">
          <div>
            <h2 className="text-lg font-semibold text-brand-ink">
              Angaben gemäß § 5 DDG
            </h2>
            <p className="mt-3">
              Enablence Ltd.
              <br />
              Geschäftsführer: Leon Schmid
              <br />
              Griva Digeni 51, Athineon Court Office 202
              <br />
              8047 Paphos
              <br />
              Zypern
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-brand-ink">
              Umsatzsteuer-ID
            </h2>
            <p className="mt-3">
              Umsatzsteuer-Identifikationsnummer: CY60300238O
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-brand-ink">Kontakt</h2>
            <p className="mt-3">
              Telefon:{" "}
              <a
                href="tel:+491716408303"
                className="text-brand-primary underline underline-offset-2"
              >
                +49 171 6408303
              </a>
              <br />
              E-Mail:{" "}
              <a
                href="mailto:service@enablence.ai"
                className="text-brand-primary underline underline-offset-2"
              >
                service@enablence.ai
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-brand-ink">
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p className="mt-3">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
              vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
