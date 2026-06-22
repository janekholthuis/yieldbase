import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Objekt Pilot — Eine Plattform statt zehn Tools",
  description:
    "Objekt Pilot bündelt Objekte, Kunden, Kalkulation, Reservierung und Finanzierung in einer Plattform. Schluss mit verstreuten Mails, Excel-Listen und Ordnern.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white text-brand-ink">{children}</div>;
}
