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

interface ManageTeamFormProps {
  onTeamCreated?: () => void
  isCreate?: boolean
}

const SESSIONS = ['Summer', 'Fall'] as const;
const DEFAULT_VALUES = {
  team_name: 'Enter Team Name',
  head_coach: 'Enter Head Coach',
  age: 30,
  season: 2025,
  session: 'Summer'
} as const;

// Add a helper function to get today's date in mm-dd-yyyy format
const getTodayFormatted = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

export default function ManageTeamForm({ onTeamCreated, isCreate }: ManageTeamFormProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (isCreate) {
      setShowCreateModal(true)
    }
  }, [isCreate])

  const handleCreateOrEdit = async (formData: FormData) => {
    try {
      // Prepare the data to be sent
      const teamData = {
        team_name: formData.get('team_name')?.toString().trim(),
        head_coach: formData.get('head_coach')?.toString().trim(),
        age: Number(formData.get('age')),
        season: formData.get('season')?.toString(), // Convert number to string
        session: formData.get('session')?.toString(),
        created_on: selectedTeam?.created_on || getTodayFormatted(), // Use existing date or today
        ...(selectedTeam?.team_id && { team_id: parseInt(selectedTeam.team_id) }) // Convert team_id to integer
      };
      
      // Log the data being sent for debugging
      console.log('Team data being sent:', teamData);
      
      // Determine the endpoint based on whether we're creating or editing
      const endpoint = selectedTeam?.team_id 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${parseInt(selectedTeam.team_id)}/edit` 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/create_team/`;
      
      console.log('Using endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST', // Using POST for both create and edit
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save team');
      }
      
      setShowCreateModal(false);
      setShowEditModal(false);
      if (onTeamCreated) onTeamCreated();
      router.refresh();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Failed to save team. Please try again.');
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete team');
      
      router.refresh()
    } catch (error) {
      console.error('Error deleting team:', error)
    }
  }

  return (
    <div className="p-4">
      <div className="space-y-4">
        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-xl font-bold mb-4">
                {showCreateModal ? 'Create New Team' : 'Edit Team'}
              </h2>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleCreateOrEdit(new FormData(e.currentTarget))
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Team Name</label>
                    <input
                      type="text"
                      name="team_name"
                      defaultValue={selectedTeam?.team_name || DEFAULT_VALUES.team_name}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Head Coach</label>
                    <input
                      type="text"
                      name="head_coach"
                      defaultValue={selectedTeam?.head_coach || DEFAULT_VALUES.head_coach}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <input
                      type="number"
                      name="age"
                      min="1"
                      max="100"
                      defaultValue={selectedTeam?.age || DEFAULT_VALUES.age}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Season</label>
                    <input
                      type="number"
                      name="season"
                      min="2000"
                      max="2100"
                      defaultValue={selectedTeam?.season || DEFAULT_VALUES.season}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                      onBlur={(e) => {
                        // Ensure the value is within bounds
                        const val = Number(e.target.value);
                        if (val < 2000) e.target.value = '2000';
                        if (val > 2100) e.target.value = '2100';
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session</label>
                    <select
                      name="session"
                      defaultValue={selectedTeam?.session || DEFAULT_VALUES.session}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    >
                      {SESSIONS.map(session => (
                        <option key={session} value={session}>
                          {session}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setShowEditModal(false)
                      setSelectedTeam(null)
                    }}
                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    {showCreateModal ? 'Create' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

