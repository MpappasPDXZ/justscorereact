"use client"

import { useEffect, useState } from "react";

interface Team {
  team_id: string;
  team_name: string;
}

interface SimpleTeamListProps {
  onTeamSelect: (teamId: string) => void;
}

export default function SimpleTeamList({ onTeamSelect }: SimpleTeamListProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/read_metadata_duckdb`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.metadata || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Error!</strong>
      <span className="block sm:inline"> {error}</span>
    </div>
  );

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {teams.length === 0 ? (
        <div className="p-4 text-gray-700">No teams found. Please create a team first.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {teams.map((team) => (
            <li 
              key={team.team_id} 
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              onClick={() => onTeamSelect(team.team_id)}
            >
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{team.team_name}</p>
                  <p className="text-sm text-gray-500">Team ID: {team.team_id}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 