"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AddPlayerModal from "../components/AddPlayerModal"
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline"
import BaseballDiamondModal from "../components/BaseballDiamondModal"
import { BaseballIcon } from "../components/BaseballIcon"

interface Player {
  player_id: string
  team_id: string
  player_name: string
  jersey_number: string
  active: string
  defensive_position_one: string
  defensive_position_two: string | null
  defensive_position_three: string | null
  defensive_position_four: string | null
  defensive_position_allocation_one: string
  defensive_position_allocation_two: string | null
  defensive_position_allocation_three: string | null
  defensive_position_allocation_four: string | null
}

export default function ManageRoster() {
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
      setError("No team ID provided")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/roster`)
      if (!response.ok) {
        throw new Error("Failed to fetch players")
      }
      const data = await response.json()
      console.log('API Response line 47:', data)
      setPlayers(data.roster)
    } catch (err) {
      setError("No Players Added")
    } finally {
      setLoading(false)
    }
  }

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

  const handleAddPlayer = async (playerData: Omit<Player, "player_id" | "team_id">) => {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/player`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...playerData,
              team_id: teamId,
            }),
          })
    
          if (!response.ok) {
            const errorData = await response.json()
            console.error("Error response:", errorData)
            throw new Error(`Failed to add player: ${errorData.error || response.statusText}`)
          }
    
          const data = await response.json()
          console.log("Player added successfully:", data)
          await fetchPlayers()
          setIsAddPlayerModalOpen(false)
        } catch (error) {
          console.error("Error adding player:", error)
          setError(error instanceof Error ? error.message : "Failed to add player")
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
          await fetchPlayers() // Refresh the roster after deletion
        } catch (error) {
          setError("Failed to delete player")
        }
      }
    
      const handleEditPlayer = async (jerseyNumber: string) => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/roster`)
          if (!response.ok) throw new Error("Failed to fetch player")
          const data = await response.json()
          const player = data.roster.find((p: Player) => p.jersey_number === jerseyNumber)
          if (player) {
            setEditingPlayer(player)
            setIsEditModalOpen(true)
          }
        } catch (error) {
          setError("Failed to fetch player details")
        }
      }
    
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
    
      const validateForm = () => {
        if (!playerData.player_name || !playerData.jersey_number) {
          setError("Player name and jersey number are required")
          return false
        }

        if (existingJerseyNumbers && existingJerseyNumbers.includes(playerData.jersey_number)) {
          setError("This jersey number is already in use")
          return false
        }

        // Only check total allocation at save time
        if (Math.abs(totalAllocation - 1) > 0.001) {
          setError("The sum of all allocations must equal 1 (100%)")
          return false
        }

        setError("")
        return true
      }
    
      return (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Manage Roster
            </h1>
            <div>
              <button
                onClick={() => setIsAddPlayerModalOpen(true)}
                className="mr-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Player
              </button>
              <button
                onClick={() => router.push("/manage-team")}
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Team List
              </button>
              <button
                onClick={() => setIsBaseballDiamondOpen(true)}
                className="ml-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
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
                              onClick={() => handleEditPlayer(player.jersey_number)}
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
              setIsAddPlayerModalOpen(false)
              fetchPlayers()
            }}
            onAddPlayer={handleAddPlayer}
            existingJerseyNumbers={currentJerseyNumbers}
          />

          <AddPlayerModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setEditingPlayer(null)
              fetchPlayers()
            }}
            onAddPlayer={handleAddPlayer}
            existingJerseyNumbers={currentJerseyNumbers.filter(n => n !== editingPlayer?.jersey_number)}
            isEditing={true}
            initialData={editingPlayer}
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
