"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Team {
  team_id: string;
  team_name: string;
  season?: string;  // Optional as it might not be present in all data
  head_coach?: string;  // Optional as it might not be present in all data
}

// Back arrow icon
const BackIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-3 w-3 mr-0.5" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

// Search icon
const SearchIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-4 w-4 text-gray-400" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function ScoreGame() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0) {
      // Filter teams based on search term
      const results = teams.filter(team => 
        team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.team_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(results);
    }
  }, [searchTerm, teams]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/read_metadata_duckdb`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.metadata || []);
      setFilteredTeams(data.metadata || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (teamId: string) => {
    // Navigate to the team's games page when a team is selected
    router.push(`/score-game/${teamId}`);
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
    <div className="container mx-auto px-4 py-0">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-800">Select Your Team</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <BackIcon />
            Back
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4 max-w-[600px] mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search teams by name or ID..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Teams table */}
      <div className="bg-white rounded-lg shadow overflow-hidden max-w-[600px] mx-auto">
        {filteredTeams.length === 0 ? (
          <div className="p-4 text-center text-gray-700 bg-gray-50">
            {searchTerm ? 'No teams match your search' : 'No teams found. Please create a team first.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 w-24 tracking-wider">
                  Team Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 w-24 tracking-wider">
                  Season
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 w-24 tracking-wider">
                  Head Coach
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 w-28 tracking-wider">
                  Team ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeams.map((team) => (
                <tr 
                  key={team.team_id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleTeamSelect(team.team_id)}
                      className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 transition-colors"
                      title="Select team"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Select</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-24 truncate">
                    <div className="text-sm font-medium text-gray-900">{team.team_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-24 truncate">
                    <div className="text-sm text-gray-500">{team.season || "-"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-24 truncate">
                    <div className="text-sm text-gray-500">{team.head_coach || "-"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-28">
                    <div className="text-sm text-gray-500">{team.team_id}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 