"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import SimpleTeamList from "./SimpleTeamList";

export default function ScoreGame() {
  const router = useRouter();
  console.log("score-game-->page.tsx-->router:", router);
  const handleTeamSelect = (teamId: string) => {
    // Navigate to the team's games page when a team is selected
    router.push(`/score-game/${teamId}`);
  };

  return (
    <div className="container mx-auto px-4 py-0">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Select Your Team</h1>
      <SimpleTeamList onTeamSelect={handleTeamSelect} />
    </div>
  );
} 