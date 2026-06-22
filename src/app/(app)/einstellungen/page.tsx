// Settings page (Server Component). Fetches the active org, the user's orgs and
// the active org's members via the `server-only` data layer, then hands the data
// to the client `EinstellungenView`, which performs mutations via server actions.
import {
  getActiveOrganisation,
  listMyOrganisations,
  listOrganisationMembers,
  type OrganisationMember,
} from "@/lib/data/organisationen";
import { EinstellungenView } from "@/components/organisation/EinstellungenView";

export const metadata = {
  title: "Einstellungen",
};

export default async function EinstellungenPage() {
  // The active org is needed to scope the member list, but listMyOrganisations
  // and the (org-scoped) member list don't depend on each other — kick the member
  // fetch off from the active org without serialising it behind listMyOrganisations.
  const activeOrgPromise = getActiveOrganisation();
  const [activeOrg, myOrgs, members] = await Promise.all([
    activeOrgPromise,
    listMyOrganisations(),
    activeOrgPromise.then((org) =>
      org ? listOrganisationMembers(org.id).catch(() => [] as OrganisationMember[]) : [],
    ),
  ]);

  // The active org row carries branding but not the caller's role — pull the
  // role from the membership list so the client can gate the branding card.
  const activeMembership = activeOrg
    ? (myOrgs.find((o) => o.id === activeOrg.id) ?? null)
    : null;

  return (
    <EinstellungenView
      activeOrg={activeOrg}
      activeRole={activeMembership?.rolle ?? null}
      members={members}
    />
  );
}
