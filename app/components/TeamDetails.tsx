"use client"

import { useState, useEffect } from "react"

interface Player {
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

interface TeamRoster {
  team_id: string
  roster: Player[]
}

interface TeamDetailsProps {
  teamId: string
}

export default function TeamDetails({ teamId }: TeamDetailsProps) {
  const [roster, setRoster] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/roster`)
        if (!response.ok) {
          throw new Error("Failed to fetch roster")
        }
        const data: TeamRoster = await response.json()
        setRoster(data.roster)
      } catch (error) {
        setError("Failed to fetch roster")
      } finally {
        setLoading(false)
      }
    }

    fetchRoster()
  }, [teamId])

  if (loading) return <div className="text-center">Loading roster...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Team Roster</h2>
      {roster.length === 0 ? (
        <p>No players in the roster yet.</p>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Jersey</th>
              <th className="py-3 px-6 text-left">Active</th>
              <th className="py-3 px-6 text-left">Positions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {roster.map((player) => (
              <tr key={player.player_name} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="font-medium">{player.player_name}</div>
                </td>
                <td className="py-3 px-6 text-left">{player.jersey_number}</td>
                <td className="py-3 px-6 text-left">{player.active}</td>
                <td className="py-3 px-6 text-left">
                  <div>
                    {player.defensive_position_one} ({player.defensive_position_allocation_one})
                  </div>
                  {player.defensive_position_two && (
                    <div>
                      {player.defensive_position_two} ({player.defensive_position_allocation_two})
                    </div>
                  )}
                  {player.defensive_position_three && (
                    <div>
                      {player.defensive_position_three} ({player.defensive_position_allocation_three})
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

