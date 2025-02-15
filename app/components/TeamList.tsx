"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Team {
  team_id: string
  team_name: string
  head_coach: string
  age: number
  season: string
  session: string
  created_on: string
}

interface TeamMetadata {
  total_teams: number
  metadata: Team[]
}

export default function TeamList() {
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/read_metadata_duckdb`)
        if (!response.ok) {
          throw new Error("Failed to fetch teams")
        }
        const data: TeamMetadata = await response.json()
        setTeams(data.metadata)
      } catch (error) {
        setError("Failed to fetch teams")
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  const handleTeamClick = (teamId: string) => {
    router.push(`/manage-roster?teamId=${teamId}`)
  }

  if (loading) return <div className="text-center">Loading teams...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Teams ({teams.length})</h2>
      {teams.length === 0 ? (
        <p>No teams created yet.</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <li
              key={team.team_id}
              className="bg-white shadow rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
              onClick={() => handleTeamClick(team.team_id)}
            >
              <h3 className="text-lg font-semibold">{team.team_name}</h3>
              <p className="text-gray-600">Coach: {team.head_coach}</p>
              <p className="text-gray-600">
                Age: {team.age} | Season: {team.season} | Session: {team.session}
              </p>
              <p className="text-gray-600">Created on: {team.created_on}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

