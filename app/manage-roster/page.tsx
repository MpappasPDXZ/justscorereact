"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AddPlayerModal from "../components/AddPlayerModal"

interface Player {
  player_id: string
  team_id: string
  player_name: string
  jersey_number: string
  active: string
  defensive_position_one: string
  defensive_position_two: string | null
  defensive_position_three: string | null
  defensive_position_allocation_one: string
  defensive_position_allocation_two: string | null
  defensive_position_allocation_three: string | null
}

export default function ManageRoster() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamId = searchParams.get("teamId")

  useEffect(() => {
    fetchPlayers()
  }, []) //Removed teamId from dependency array

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
                        <div className="text-sm font-medium text-gray-900">{player.player_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{player.jersey_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            player.active === "true" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {player.active === "true" ? "Active" : "Inactive"}
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
            onClose={() => setIsAddPlayerModalOpen(false)}
            onAddPlayer={handleAddPlayer}
            existingJerseyNumbers={players.length > 0 ? players.map((player) => player.jersey_number) : []}
          />
        </div>
      )
    }
