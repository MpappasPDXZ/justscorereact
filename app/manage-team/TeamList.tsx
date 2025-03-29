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

interface TeamListProps {
  onTeamSelect: (teamId: string) => void
  searchTerm?: string
}

export default function TeamList({ onTeamSelect, searchTerm = "" }: TeamListProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteTeamId, setPendingDeleteTeamId] = useState<string | null>(null)
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null)
  const router = useRouter()

  // Fetch teams list
  useEffect(() => {
    fetchTeams()
  }, [])

  // Apply search filter when searchTerm changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTeams(teams)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = teams.filter(team => 
      team.team_name.toLowerCase().includes(term) || 
      team.head_coach.toLowerCase().includes(term) ||
      team.team_id.toLowerCase().includes(term) ||
      team.season.toLowerCase().includes(term)
    )
    
    setFilteredTeams(filtered)
  }, [searchTerm, teams])

  // Effect to handle team deletion outside the click handler
  useEffect(() => {
    // Only run when pendingDeleteTeamId changes and isn't null
    if (pendingDeleteTeamId) {
      const deleteTeam = async () => {
        try {
          setDeletingTeamId(pendingDeleteTeamId);
          
          // Optimistically update UI first (before API call)
          setTeams(prevTeams => prevTeams.filter(team => team.team_id !== pendingDeleteTeamId));
          setFilteredTeams(prevTeams => prevTeams.filter(team => team.team_id !== pendingDeleteTeamId));
          
          // Then make the API call
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${parseInt(pendingDeleteTeamId)}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete team');
          }
          
          // Only fetch teams if needed (optional refresh)
          fetchTeams();
        } catch (error) {
          console.error('Error deleting team:', error);
          alert('Failed to delete team. Please try again.');
          
          // Revert the optimistic update if there was an error
          fetchTeams();
        } finally {
          setDeletingTeamId(null);
          setPendingDeleteTeamId(null);
        }
      };
      
      // Start the deletion process on next frame
      deleteTeam();
    }
  }, [pendingDeleteTeamId]);

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/read_metadata_duckdb`)
      if (!response.ok) throw new Error('Failed to fetch teams')
      const data: TeamMetadata = await response.json()
      setTeams(data.metadata || [])
      setFilteredTeams(data.metadata || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      setError('Failed to load teams. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (teamId: string) => {
    try {
      // Fetch team metadata - using the same data we already have
      const team = teams.find(t => t.team_id === teamId)
      if (team) {
        setSelectedTeam(team)
        setShowEditModal(true)
      }
    } catch (error) {
      console.error('Error setting up team edit:', error)
    }
  }

  const handleSave = async (formData: FormData) => {
    try {
      if (!selectedTeam?.team_id) {
        throw new Error('No team ID found');
      }
      
      // Create the team data object with consistent data types
      const teamData = {
        team_id: parseInt(selectedTeam.team_id),
        team_name: formData.get('team_name')?.toString().trim(),
        head_coach: formData.get('head_coach')?.toString().trim(),
        age: Number(formData.get('age')),
        season: formData.get('season')?.toString(), // Explicitly convert to string
        session: formData.get('session')?.toString(), // Explicitly convert to string
        created_on: selectedTeam.created_on
      };
      
      // Log the data for debugging
      console.log('Editing team with data:', teamData);
      console.log('Using edit endpoint:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${parseInt(selectedTeam.team_id)}/edit`);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${parseInt(selectedTeam.team_id)}/edit`, 
        {
          method: 'POST', // Changed from PUT to POST
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(teamData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.detail || 'Failed to save team');
      }
      
      setShowEditModal(false);
      setSelectedTeam(null);
      fetchTeams(); // Refresh the list
    } catch (error) {
      console.error('Error saving team:', error);
      // Optionally add user feedback for the error
      alert('Failed to save team changes. Please try again.');
    }
  };

  // Quick click handler that just opens the confirm modal
  const handleDeleteClick = (teamId: string, event: React.MouseEvent) => {
    // Stop event propagation to prevent team selection
    event.stopPropagation();
    
    // Don't do anything if already in the process of deleting
    if (deletingTeamId || pendingDeleteTeamId) return;
    
    // Set the team to delete and show the confirmation modal
    setTeamToDelete(teamId);
    setShowDeleteConfirmModal(true);
  };
  
  // Confirm deletion - triggered by modal
  const confirmDelete = () => {
    if (!teamToDelete) return;
    
    // Set pending delete ID - the useEffect will handle the actual deletion
    setPendingDeleteTeamId(teamToDelete);
    
    // Close the modal and clear the team to delete
    setShowDeleteConfirmModal(false);
    setTeamToDelete(null);
  };
  
  // Cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setTeamToDelete(null);
  };

  const handleTeamClick = (teamId: string) => {
    router.push(`/manage-roster?teamId=${teamId}`)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  )

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Error!</strong>
      <span className="block sm:inline"> {error}</span>
    </div>
  )

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden max-w-3xl mx-auto">
      {filteredTeams.length === 0 ? (
        <div className="p-3 text-gray-700 text-center">No teams match your search criteria.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {filteredTeams.map((team) => (
            <li 
              key={team.team_id}
              className="py-2 px-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              onClick={() => handleTeamClick(team.team_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{team.team_name}</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-0.5">
                    <span>Coach: {team.head_coach}</span>
                    <span className="mx-1.5">•</span>
                    <span>Age: {team.age}</span>
                    <span className="mx-1.5">•</span>
                    <span>{team.season} {team.session}</span>
                    <span className="mx-1.5">•</span>
                    <span>ID: {team.team_id}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(team.team_id)}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="Edit team"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(team.team_id, e)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete team"
                    disabled={deletingTeamId === team.team_id}
                  >
                    {deletingTeamId === team.team_id ? (
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Edit Team</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSave(new FormData(e.currentTarget))
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <input
                    type="text"
                    name="team_name"
                    defaultValue={selectedTeam.team_name}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Head Coach</label>
                  <input
                    type="text"
                    name="head_coach"
                    defaultValue={selectedTeam.head_coach}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Age</label>
                  <input
                    type="number"
                    name="age"
                    defaultValue={selectedTeam.age}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Season</label>
                  <input
                    type="text"
                    name="season"
                    defaultValue={selectedTeam.season}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session</label>
                  <input
                    type="text"
                    name="session"
                    defaultValue={selectedTeam.session}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && teamToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
            <p>Are you sure you want to delete this team? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

