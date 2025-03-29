"use client"

import { useState, useEffect } from "react"
import TeamList from "./TeamList"
import ManageTeamForm from "./ManageTeamForm"
import { useRouter } from "next/navigation"

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

interface Team {
  team_id: string
  team_name: string
}

export default function ManageTeam() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold">Manage Teams</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <BackIcon />
            Back
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Create Team
          </button>
        </div>
      </div>
      
      {showCreateForm ? (
        <div>
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-4 flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <BackIcon />
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
          {/* Search bar */}
          <div className="relative mb-4 max-w-3xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search teams by name, coach, or ID..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TeamList onTeamSelect={handleTeamSelect} searchTerm={searchTerm} />
        </div>
      )}
    </div>
  )
}

