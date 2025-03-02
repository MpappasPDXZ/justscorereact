"use client"

import { useState, useEffect } from "react"
import TeamList from "./TeamList"
import ManageTeamForm from "./ManageTeamForm"
import { useRouter } from "next/navigation"

interface Team {
  team_id: string
  team_name: string
}

export default function ManageTeam() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/read_metadata_duckdb`)
      if (!response.ok) throw new Error('Failed to fetch teams')
      const data = await response.json()
      setTeams(data.metadata || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleTeamSelect = (teamId: string) => {
    router.push(`/score-game/games?teamId=${teamId}`);
  }

  return (
    <div className="container mx-auto px-4 py-0">
      {/* Header with Create Team Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Teams</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          Create Team
        </button>
      </div>
      
      {showCreateForm ? (
        <div>
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-4 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Team List
          </button>
          <ManageTeamForm
            isCreate={true}
            onTeamCreated={() => {
              setShowCreateForm(false)
            }}
          />
        </div>
      ) : (
        <div>
          <TeamList onTeamSelect={handleTeamSelect} />
        </div>
      )}
    </div>
  )
}

