import { notFound } from "next/navigation";
import { getContact } from "@/lib/crm-mock";
import { CrmContactDetail } from "@/components/crm/CrmContactDetail";

export const metadata = {
  title: "Kontakt · CRM · Erfolg mit Immobilien",
};

export default async function CrmContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const contact = getContact(contactId);
  if (!contact) notFound();
  return <CrmContactDetail contact={contact} />;
}
