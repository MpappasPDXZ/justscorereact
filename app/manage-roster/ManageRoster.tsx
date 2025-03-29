"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AddPlayerModal from "./AddPlayerModal"
import { TrashIcon } from "@heroicons/react/24/outline"

interface Player {
  player_name: string
  jersey_number: string
  active: string
  defensive_position_one: string
  defensive_position_two: string | "None"
  defensive_position_three: string | "None"
  defensive_position_four: string | "None"
  defensive_position_allocation_one: string
  defensive_position_allocation_two: string | "None"
  defensive_position_allocation_three: string | "None"
  defensive_position_allocation_four: string | "None"
  team_id: string
  player_id: string
  last_modified: string
  created_on: string
}

interface ManageRosterProps {
  teamId: string
  onPlayerAdded?: () => void
}

export default function ManageRoster({ teamId, onPlayerAdded }: ManageRosterProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchRoster()
  }, [teamId])

  const fetchRoster = async () => {
    if (!teamId) {
      setError("No team ID provided")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/roster`)
      const data = await response.json()
      setPlayers(data.roster)
      if (onPlayerAdded) {
        onPlayerAdded()
      }
    } catch (err) {
      setError("Failed to fetch roster")
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async (formData: FormData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/players`, {
        method: 'POST',
        // ... rest of fetch config ...
      });

      if (!response.ok) {
        throw new Error('Failed to add player');
      }

      setIsAddPlayerModalOpen(false);
      fetchRoster(); // Fetch the updated roster
      if (onPlayerAdded) {
        onPlayerAdded(); // Call the callback to trigger parent refresh
      }
    } catch (error) {
      setError("Failed to add player")
    }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/player`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlayer),
      })
      if (!response.ok) throw new Error("Failed to update player")
      await fetchRoster()
      if (onPlayerAdded) {
        onPlayerAdded()
      }
    } catch (error) {
      setError("Failed to update player")
    }
  }

  const handleDeletePlayer = async (player: Player) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/player/${player.jersey_number}`,
        {
          method: "DELETE",
        }
      )
      if (!response.ok) throw new Error("Failed to delete player")
      await fetchRoster() // Refresh the roster after deletion
      if (onPlayerAdded) {
        onPlayerAdded()
      }
    } catch (error) {
      setError("Failed to delete player")
    }
  }

  const renderPositions = (player: Player) => {
    const positions = [
      { name: player.defensive_position_one, allocation: player.defensive_position_allocation_one },
      { name: player.defensive_position_two, allocation: player.defensive_position_allocation_two },
      { name: player.defensive_position_three, allocation: player.defensive_position_allocation_three },
      { name: player.defensive_position_four, allocation: player.defensive_position_allocation_four },
    ].filter((pos) => {
      // Only include positions that have both a name and an allocation that aren't "None"
      return pos.name && 
             pos.name !== "None" && 
             pos.allocation && 
             pos.allocation !== "None"
    })

    // If no positions, show "None"
    if (positions.length === 0) {
      return <div className="text-[10px] text-gray-500">None</div>;
    }

    // Only show the primary position and total count
    const primaryPos = positions[0];
    const allocationPercentage = Math.round(Number.parseFloat(primaryPos.allocation as string) * 100);
    
    if (positions.length === 1) {
      return (
        <div className="text-[10px] text-gray-500">
          <b>{primaryPos.name}</b> ({allocationPercentage}%)
        </div>
      );
    }
    
    return (
      <div className="text-[10px] text-gray-500">
        <b>{primaryPos.name}</b> ({allocationPercentage}%) +{positions.length - 1}
      </div>
    );
  }

  // Filter players based on search term
  const filteredPlayers = players.filter(player => 
    player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.jersey_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort players by jersey number numerically
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const jerseyA = parseInt(a.jersey_number) || 0; // fallback to 0 if not a valid number
    const jerseyB = parseInt(b.jersey_number) || 0;
    return jerseyA - jerseyB;
  });

  // Highlight matching text in player name
  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const after = text.substring(index + searchTerm.length);
    
    return (
      <>
        {before}
        <span className="bg-yellow-100">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-3">
      <div className="flex items-center mb-3 space-x-2 overflow-x-auto">
        <button
          onClick={() => window.history.back()}
          className="py-2 px-3 rounded-md shadow-sm text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={() => setIsAddPlayerModalOpen(true)}
          className="py-2 px-3 rounded-md shadow-sm text-xs font-medium bg-green-600 text-white border border-green-600 hover:bg-green-700 transition-colors"
        >
          Add Player
        </button>
        
        <button
          onClick={() => window.location.href = `/depth-chart?teamId=${teamId}`}
          className="py-2 px-3 rounded-md shadow-sm text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Depth Chart
        </button>
        
        <button
          onClick={() => window.location.href = `/position-visual?teamId=${teamId}`}
          className="py-2 px-3 rounded-md shadow-sm text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Position Visual
        </button>
      </div>
      
      {/* Search Box */}
      <div className="mb-3 p-2 border border-gray-200 rounded-md bg-gray-50">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-base font-bold text-gray-800">Team Roster</h1>
          <div className="text-xs text-gray-500 self-center">
            {sortedPlayers.length} of {players.length} players
          </div>
        </div>
        
        <div className="relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or jersey number..."
            className="w-full text-sm py-2 pl-9 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table displaying the roster */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-2 text-sm text-gray-600">Loading roster...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : sortedPlayers.length === 0 ? (
          <div className="p-4 text-center">
            {searchTerm ? (
              <p className="text-gray-500">No players match your search: <span className="font-medium">&quot;{searchTerm}&quot;</span></p>
            ) : (
              <p className="text-gray-500">No players found. Add players to create a roster.</p>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Jersey
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Positions
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPlayers.map((player) => (
                <tr key={player.jersey_number} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{highlightMatch(player.jersey_number)}</div>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-900">{highlightMatch(player.player_name)}</span>
                      <button
                        className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${player.player_name}?`)) {
                            handleDeletePlayer(player)
                          }
                        }}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      {renderPositions(player)}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className={`px-1.5 inline-flex text-[10px] leading-4 font-medium rounded-full ${
                      player.active === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {player.active}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <button
                      className={`text-[10px] py-0.5 px-1.5 rounded ${
                        player.active === "Active" 
                          ? "text-red-600 border border-red-300 hover:bg-red-50" 
                          : "text-green-600 border border-green-300 hover:bg-green-50"
                      }`}
                      onClick={() => handleUpdatePlayer({ 
                        ...player, 
                        active: player.active === "Active" ? "Inactive" : "Active" 
                      })}
                    >
                      {player.active === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        onAddPlayer={handleAddPlayer}
      />
    </div>
  )
}