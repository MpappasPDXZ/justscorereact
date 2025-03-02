"use client"

import { useRouter } from "next/router";
import ManageRoster from "../../manage-roster/ManageRoster"; // Update the import path

export default function TeamRoster() {
  const router = useRouter();
  const { teamId } = router.query; // Get the teamId from the query parameters

  return (
    <div className="container mx-auto px-4 py-0">
      <h1 className="text-3xl font-bold mb-4">Manage Roster for Team {teamId}</h1>
      {teamId && <ManageRoster teamId={teamId as string} />} {/* Pass teamId to ManageRoster */}
    </div>
  );
} 