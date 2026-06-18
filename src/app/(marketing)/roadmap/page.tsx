import type { Metadata } from "next";
import { RoadmapPage } from "@/components/marketing/roadmap-page";

export const metadata: Metadata = {
  title: "Roadmap — EMI Hub",
  description:
    "Die Produkt-Roadmap von EMI Hub: was live ist, woran wir gerade bauen und was als Nächstes kommt.",
};

export default function Roadmap() {
  return <RoadmapPage />;
}
