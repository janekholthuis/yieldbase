import { notFound } from "next/navigation";
import { getEinheitDetail } from "@/lib/data/objekte";
import { getKalkulationsContext } from "@/lib/data/kalkulation-context";
import { PraesentationView } from "@/components/objekte/PraesentationView";

export const metadata = {
  title: "Präsentation · Objektpilot",
};

export default async function PraesentationPage({
  params,
}: {
  params: Promise<{ einheitId: string; kundeId?: string[] }>;
}) {
  const { einheitId, kundeId } = await params;
  const selectedKundeId = kundeId?.[0];

  const [{ einheit }, kalkContext] = await Promise.all([
    getEinheitDetail(einheitId),
    getKalkulationsContext(),
  ]);

  if (!einheit) notFound();

  return (
    <PraesentationView
      einheit={einheit}
      kalkContext={kalkContext}
      kundeId={selectedKundeId}
    />
  );
}
