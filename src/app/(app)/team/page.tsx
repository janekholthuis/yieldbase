import type { Metadata } from "next";
import { getMyTeam, listPendingInvites } from "@/lib/data/team";
import { TeamView } from "@/components/team/TeamView";

export const metadata: Metadata = {
  title: "Mein Team · Objektpilot",
};

export default async function TeamPage() {
  const [members, invites] = await Promise.all([
    getMyTeam(),
    listPendingInvites(),
  ]);
  return <TeamView members={members} invites={invites} />;
}
