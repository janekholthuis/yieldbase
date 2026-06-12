import type { Metadata } from "next";
import { listReservierungen } from "@/lib/data/reservierungen";
import { ReservierungenListView } from "@/components/reservierung/ReservierungenListView";

export const metadata: Metadata = {
  title: "Reservierungen · Erfolg mit Immobilien",
};

export default async function ReservierungenPage() {
  const reservierungen = await listReservierungen();
  return <ReservierungenListView reservierungen={reservierungen} />;
}
