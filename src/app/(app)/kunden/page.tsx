import { listKunden } from "@/lib/data/kunden";
import { KundenListView } from "@/components/kunden/KundenListView";

export const metadata = {
  title: "Kunden · Objektpilot",
};

export default async function KundenPage() {
  const kunden = await listKunden();
  return <KundenListView kunden={kunden} />;
}
