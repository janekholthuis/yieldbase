import type { Metadata } from "next";
import { getMyProfile } from "@/lib/data/profil";
import { ProfilView } from "@/components/profil/ProfilView";

export const metadata: Metadata = {
  title: "Profil · Erfolg mit Immobilien",
};

export default async function ProfilPage() {
  const profile = await getMyProfile();
  return <ProfilView profile={profile} />;
}
