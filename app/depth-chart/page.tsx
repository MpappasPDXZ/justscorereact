"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

interface PlayerRank {
  team_id: string
  position: string
  player_rank: number
  jersey_number: string
  player_name: string
}

interface PositionPlayers {
  [key: string]: PlayerRank[]
}

const positions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]

export default function DepthChart() {
  const [positionPlayers, setPositionPlayers] = useState<PositionPlayers>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const teamId = searchParams.get("teamId")
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  const fetchData = async () => {
    if (!teamId) return;
    
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/depth_chart_get`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch depth chart")
      }
      
      const data = await response.json()
      console.log('API Response:', data)
      const playerData: PlayerRank[] = data.depth_chart || []
      
      const newPositionPlayers: PositionPlayers = {}
      positions.forEach(position => {
        const positionPlayers = playerData
          .filter((player: PlayerRank) => player.position === position)
          .sort((a: PlayerRank, b: PlayerRank) => a.player_rank - b.player_rank)
        newPositionPlayers[position] = positionPlayers
      })
      setPositionPlayers(newPositionPlayers)
    } catch (err) {
      setError("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [teamId])

  const handleMovePlayer = (position: string, index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const players = [...positionPlayers[position]];
    const [player] = players.splice(index, 1);
    players.splice(newIndex, 0, player);
    
    // Update ranks
    const updatedPlayers = players.map((p, i) => ({
      ...p,
      player_rank: i + 1
    }));

    setPositionPlayers({
      ...positionPlayers,
      [position]: updatedPlayers
    });
  };

  const handleSaveDepthChart = async () => {
    try {
      setSaveStatus('saving');
      
      // Prepare the data in the format the API expects
      const depthChartData = {
        team_id: teamId,
        depth_chart: Object.entries(positionPlayers).reduce((acc, [position, players]) => {
          acc[position] = players.map(player => ({
            jersey_number: player.jersey_number,
            player_rank: player.player_rank
          }));
          return acc;
        }, {} as Record<string, Array<{ jersey_number: string; player_rank: number }>>)
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/depth_chart_post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(depthChartData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save depth chart');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Error saving depth chart:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="max-w-full mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Depth Chart</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDepthChart}
            disabled={saveStatus === 'saving'}
            className={`py-2 px-4 border rounded-md shadow-sm text-sm font-medium transition-colors
              ${saveStatus === 'saving' 
                ? 'bg-gray-100 text-gray-500' 
                : saveStatus === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : saveStatus === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
          >
            {saveStatus === 'saving' ? 'Saving...' 
              : saveStatus === 'success' ? 'Saved!'
              : saveStatus === 'error' ? 'Error!'
              : 'Save Changes'}
          </button>
          <button
            onClick={() => router.push(`/manage-roster?teamId=${teamId}`)}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Roster
          </button>
        </div>
      </div>

      <div className="grid grid-cols-9 gap-2">
        {positions.map(position => (
          <div key={position} className="font-bold text-gray-500 text-sm uppercase text-center">
            {position}
          </div>
        ))}

        {positions.map(position => (
          <div key={position} className="min-h-[200px] bg-gray-50 rounded p-2">
            {positionPlayers[position]?.map((player, index) => (
              <div
                key={`${position}_${player.jersey_number}`}
                className="bg-white p-2 pt-4 mb-2 border rounded shadow-sm hover:bg-gray-50 relative group h-14 flex flex-col justify-center items-center"
              >
                <div className="absolute -top-2 -left-2 w-5 h-5 border-2 border-indigo-600 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {player.player_rank}
                </div>
                <div className="absolute -top-2 -right-2 flex bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => handleMovePlayer(position, index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 disabled:text-gray-200 disabled:hover:bg-white disabled:cursor-not-allowed border-r border-gray-200 transition-colors"
                  >
                    <svg 
                      className="w-3 h-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMovePlayer(position, index, 'down')}
                    disabled={index === positionPlayers[position].length - 1}
                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 disabled:text-gray-200 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
                  >
                    <svg 
                      className="w-3 h-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
                <div className="text-xs w-full text-center">
                  <span className="truncate">
                    <span className="hidden md:inline">{player.player_name}</span>
                    <span className="md:hidden">{player.player_name.slice(0, 2)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
} 