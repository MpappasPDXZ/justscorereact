"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AddPlayerModal from "./AddPlayerModal"
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline"
import BaseballDiamondModal from "../components/BaseballDiamondModal"
import { BaseballIcon } from "../components/BaseballIcon"
import type { PlayerData } from './AddPlayerModal'

// Back arrow icon
const BackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-3 w-3 mr-2" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export interface Player {
  player_id: string
  team_id: string
  player_name: string
  jersey_number: string
  active: "Active" | "Inactive"
  defensive_position_one: string
  defensive_position_two: string
  defensive_position_three: string
  defensive_position_four: string
  defensive_position_allocation_one: string
  defensive_position_allocation_two: string
  defensive_position_allocation_three: string
  defensive_position_allocation_four: string
  created_on?: string
  last_modified?: string
}

// Create a wrapper component that uses searchParams
function RosterContent() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false)
  const [currentJerseyNumbers, setCurrentJerseyNumbers] = useState<string[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [isBaseballDiamondOpen, setIsBaseballDiamondOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamId = searchParams.get("teamId")

  useEffect(() => {
    fetchPlayers()
  }, []) //Removed teamId from dependency array

  useEffect(() => {
    if (isAddPlayerModalOpen) {
      setCurrentJerseyNumbers(players.map((player) => player.jersey_number))
    }
  }, [isAddPlayerModalOpen, players])

  const fetchPlayers = async () => {
    if (!teamId) {
      setError("No team ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/roster`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404 && errorData.detail?.includes("No players found")) {
          setPlayers([]);
          setError(null);
          return;
        }
        throw new Error(errorData.detail || "Failed to fetch players");
      }

      const data = await response.json();
      const formattedRoster = data.roster.map((player: any) => ({
        ...player,
        defensive_position_one: player.defensive_position_one || 'P',
        defensive_position_two: player.defensive_position_two || '',
        defensive_position_three: player.defensive_position_three || '',
        defensive_position_four: player.defensive_position_four || '',
        defensive_position_allocation_one: player.defensive_position_allocation_one || '1.00',
        defensive_position_allocation_two: player.defensive_position_allocation_two || '',
        defensive_position_allocation_three: player.defensive_position_allocation_three || '',
        defensive_position_allocation_four: player.defensive_position_allocation_four || '',
        active: player.active || 'Active'
      }));

      setPlayers(formattedRoster);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes("No players found")) {
        setPlayers([]);
        setError(null);
      } else {
        setError("Failed to fetch roster");
        setPlayers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPositions = (player: Player) => {
    const positions = [
      { name: player.defensive_position_one, allocation: player.defensive_position_allocation_one },
      { name: player.defensive_position_two, allocation: player.defensive_position_allocation_two },
      { name: player.defensive_position_three, allocation: player.defensive_position_allocation_three },
      { name: player.defensive_position_four, allocation: player.defensive_position_allocation_four },
    ].filter((pos) => pos.name && pos.allocation)

    return positions.map((pos, index) => {
      const allocationPercentage = Math.round(Number.parseFloat(pos.allocation || '0') * 100)
      return (
        <div key={index} className="text-xs text-gray-500">
          {index + 1}: {pos.name} {allocationPercentage}%
        </div>
      )
    })
  }

  const formatPlayerData = (data: Omit<Player, "player_id" | "team_id">) => {
    return {
      ...data,
      defensive_position_allocation_one: String(parseFloat(data.defensive_position_allocation_one)),
      defensive_position_allocation_two: data.defensive_position_allocation_two ? 
        String(parseFloat(data.defensive_position_allocation_two)) : "",
      defensive_position_allocation_three: data.defensive_position_allocation_three ? 
        String(parseFloat(data.defensive_position_allocation_three)) : "",
      defensive_position_allocation_four: data.defensive_position_allocation_four ? 
        String(parseFloat(data.defensive_position_allocation_four)) : "",
    };
  };

  const handleAddPlayer = async (playerData: PlayerData) => {
    try {
      // Format the data to match backend expectations
      const formattedData = {
        player_name: playerData.player_name,
        jersey_number: playerData.jersey_number,
        active: playerData.active,  // "Active" or "Inactive"
        team_id: teamId,
        // Primary position is required
        defensive_position_one: playerData.defensive_position_one,
        defensive_position_allocation_one: playerData.defensive_position_allocation_one,
        // Optional positions - convert empty strings to null
        defensive_position_two: playerData.defensive_position_two || null,
        defensive_position_three: playerData.defensive_position_three || null,
        defensive_position_four: playerData.defensive_position_four || null,
        // Optional allocations - convert empty strings to null
        defensive_position_allocation_two: playerData.defensive_position_allocation_two || null,
        defensive_position_allocation_three: playerData.defensive_position_allocation_three || null,
        defensive_position_allocation_four: playerData.defensive_position_allocation_four || null,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/player`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add player');
      }

      // Wait for the response before closing modal
      const data = await response.json();
      
      // Add a small delay to ensure the backend has processed the addition
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch the updated roster
      await fetchPlayers();
      
      // Only close modal after successful fetch
      setIsAddPlayerModalOpen(false);
      
      // Force a re-render of the component
      setPlayers(prev => [...prev]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add player");
    }
  };

  const handleDeletePlayer = async (player: Player) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/player/${player.jersey_number}`,
        {
          method: "DELETE",
        }
      )
      if (!response.ok) throw new Error("Failed to delete player")
      await fetchPlayers() // Refresh the roster after deletion
    } catch (error) {
      setError("Failed to delete player")
    }
  }

  // Function to initialize editing (when pencil icon is clicked)
  const initializeEditPlayer = async (jerseyNumber: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/roster`);
      if (!response.ok) throw new Error("Failed to fetch player");
      const data = await response.json();
      const player = data.roster.find((p: Player) => p.jersey_number === jerseyNumber);
      if (player) {
        setEditingPlayer(player);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      setError("Failed to fetch player details");
    }
  };

  // Function to handle the edit submission
  const handleEditPlayer = async (playerData: PlayerData) => {
    try {
      const formattedData = {
        player_name: playerData.player_name,
        jersey_number: playerData.jersey_number,
        active: playerData.active,
        team_id: teamId,
        defensive_position_one: playerData.defensive_position_one,
        defensive_position_allocation_one: playerData.defensive_position_allocation_one,
        defensive_position_two: playerData.defensive_position_two || null,
        defensive_position_three: playerData.defensive_position_three || null,
        defensive_position_four: playerData.defensive_position_four || null,
        defensive_position_allocation_two: playerData.defensive_position_allocation_two || null,
        defensive_position_allocation_three: playerData.defensive_position_allocation_three || null,
        defensive_position_allocation_four: playerData.defensive_position_allocation_four || null,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/player`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Failed to update player');
      }

      await fetchPlayers();
      setIsEditModalOpen(false);
      setEditingPlayer(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update player");
    }
  };

  const getPositionCounts = () => {
    const allocations: { [key: string]: number } = {}
    
    players.forEach(player => {
      // First position
      if (player.defensive_position_one && player.defensive_position_allocation_one) {
        const pos = player.defensive_position_one
        const alloc = parseFloat(player.defensive_position_allocation_one)
        allocations[pos] = (allocations[pos] || 0) + alloc
      }
      
      // Second position
      if (player.defensive_position_two && player.defensive_position_allocation_two) {
        const pos = player.defensive_position_two
        const alloc = parseFloat(player.defensive_position_allocation_two)
        allocations[pos] = (allocations[pos] || 0) + alloc
      }
      
      // Third position
      if (player.defensive_position_three && player.defensive_position_allocation_three) {
        const pos = player.defensive_position_three
        const alloc = parseFloat(player.defensive_position_allocation_three)
        allocations[pos] = (allocations[pos] || 0) + alloc
      }

      // Fourth position
      if (player.defensive_position_four && player.defensive_position_allocation_four) {
        const pos = player.defensive_position_four
        const alloc = parseFloat(player.defensive_position_allocation_four)
        allocations[pos] = (allocations[pos] || 0) + alloc
      }
    })

    const positionAllocations = Object.entries(allocations).map(([position, count]) => ({
      position,
      count: Math.round(count * 100) / 100
    }))
    
    return positionAllocations
  }

  // Sort players by jersey number numerically
  const sortedPlayers = [...players].sort((a, b) => {
    // Convert jersey numbers to integers for proper numerical sorting
    const jerseyA = parseInt(a.jersey_number) || 0; // fallback to 0 if not a valid number
    const jerseyB = parseInt(b.jersey_number) || 0;
    return jerseyA - jerseyB;
  });

  // Filter players based on search term
  const filteredPlayers = sortedPlayers.filter(player => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      player.player_name.toLowerCase().includes(term) ||
      player.jersey_number.toString().includes(term)
    );
  });

  // Count filtered players for display
  const filteredCount = filteredPlayers.length;
  const totalCount = players.length;

  // Highlight matching text in player name or jersey number
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
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Manage Roster
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push("/manage-team")}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >            
          <BackIcon />
            Back
          </button>
          <button
            onClick={() => setIsAddPlayerModalOpen(true)}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-white border border-green-600 bg-green-600 hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Add Player
          </button>
          <button
            onClick={() => router.push(`/depth-chart?teamId=${teamId}`)}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Depth Chart
          </button>
          <button
            onClick={() => setIsBaseballDiamondOpen(true)}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 12l10 10 10-10L12 2z" />
            </svg>
            Position Visual
          </button>
        </div>
      </div>

      {/* Modern search */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1 relative max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="w-full text-sm py-2 pl-9 pr-4 border-b border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors"
          />
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button 
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 ml-2">
          {filteredCount} of {totalCount} players
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-xs table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-3/12">
                Name
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">
                Actions
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">
                Status
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4/12">
                Positions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-2 text-center text-xs text-gray-500">
                  Loading roster...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-3 py-2 text-center text-xs text-gray-500">
                  {error}
                </td>
              </tr>
            ) : players.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">No players in the roster yet</p>
                  <button
                    onClick={() => setIsAddPlayerModalOpen(true)}
                    className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Add your first player
                  </button>
                </td>
              </tr>
            ) : filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-2 text-center text-xs text-gray-500">
                  No players match your search: <span className="font-medium">&quot;{searchTerm}&quot;</span>
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => (
                <tr key={player.jersey_number}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{highlightMatch(player.jersey_number)}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{highlightMatch(player.player_name)}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => initializeEditPlayer(player.jersey_number)}
                        className="p-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player)}
                        className="p-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        player.active === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {player.active}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {renderPositions(player)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => {
          setIsAddPlayerModalOpen(false);
          fetchPlayers();
        }}
        onAddPlayer={handleAddPlayer}
        existingJerseyNumbers={currentJerseyNumbers}
      />

      <AddPlayerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPlayer(null);
          fetchPlayers();
        }}
        onAddPlayer={handleEditPlayer}
        existingJerseyNumbers={currentJerseyNumbers.filter(n => n !== editingPlayer?.jersey_number)}
        isEditing={true}
        initialData={editingPlayer as PlayerData | null}
        title="Edit Player"
      />

      <BaseballDiamondModal
        isOpen={isBaseballDiamondOpen}
        onClose={() => setIsBaseballDiamondOpen(false)}
        positions={getPositionCounts()}
      />
    </div>
  )
}

// Main component with Suspense
export default function ManageRoster() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RosterContent />
    </Suspense>
  )
}