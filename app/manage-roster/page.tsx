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
      console.error('Error in fetchPlayers:', err);
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
        <div key={index} className="text-sm text-gray-500">
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

      // Debug logs
      console.log('Raw player data:', playerData);
      console.log('Formatted data:', formattedData);
      console.log('JSON to send:', JSON.stringify(formattedData, null, 2));

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
      console.error("Error adding player:", error);
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

      // Debug logs
      console.log('Raw player data (edit):', playerData);
      console.log('Formatted data (edit):', formattedData);
      console.log('JSON to send (edit):', JSON.stringify(formattedData, null, 2));

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
      console.error("Error updating player:", error);
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

  return (
    <div className="max-w-4xl mx-auto">
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
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-white border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Jersey
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Active
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Positions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading roster...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  {error}
                </td>
              </tr>
            ) : players.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No players in the roster yet. Add players to see them listed here.
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.jersey_number}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">{player.player_name}</div>
                      <div className="flex space-x-2">
                        <button
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          onClick={() => initializeEditPlayer(player.jersey_number)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${player.player_name}?`)) {
                              handleDeletePlayer(player)
                            }
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{player.jersey_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        player.active === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {player.active}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{renderPositions(player)}</td>
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