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
  teamId: string;
  onRosterUpdated?: () => void;  // Made optional to maintain compatibility
}

export default function ManageRoster({ teamId, onRosterUpdated }: ManageRosterProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false)

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
      onRosterUpdated?.()
    } catch (err) {
      console.error('Fetch error:', err)
      setError("Failed to fetch roster")
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async (playerData: Omit<Player, "team_id">) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...playerData, team_id: teamId }),
      })
      if (!response.ok) throw new Error("Failed to add player")
      await fetchRoster()
      setIsAddPlayerModalOpen(false)
      onRosterUpdated?.()
    } catch (error) {
      setError("Failed to add player")
    }
  }

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/player`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlayer),
      })
      if (!response.ok) throw new Error("Failed to update player")
      await fetchRoster()
      onRosterUpdated?.()
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
      onRosterUpdated?.()
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

    return positions.map((pos, index) => {
      // Now we know allocation is a string that's not "None"
      const allocationPercentage = Math.round(Number.parseFloat(pos.allocation as string) * 100)
      return (
        <div key={index} className="text-sm text-gray-500">
          {index + 1}: {pos.name} {allocationPercentage}%
        </div>
      )
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Team Roster</h1>
        <button
          onClick={() => setIsAddPlayerModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md shadow-sm hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Player
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500">Loading roster...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jersey #
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Primary Position
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No players in the roster yet
                  </td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr key={player.jersey_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">{player.player_name}</div>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.jersey_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        player.active === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {player.active}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderPositions(player)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        onClick={() => handleUpdatePlayer({ 
                          ...player, 
                          active: player.active === "Active" ? "Inactive" : "Active" 
                        })}
                      >
                        {player.active === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        onAddPlayer={handleAddPlayer}
      />
    </div>
  )
}