import { redirect } from "next/navigation";
import { getSessionUser, isKundeOnly } from "@/lib/auth";

export default async function Home() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  redirect(isKundeOnly(session.roles) ? "/portal" : "/dashboard");
}
