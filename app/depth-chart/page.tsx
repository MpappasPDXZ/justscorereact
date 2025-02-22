"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided } from "react-beautiful-dnd"

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

const positions = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"]

interface PositionPlayers {
  [key: string]: Player[]
}

interface DepthChartEntry {
  team_id: string;
  position: string;
  jersey_number: string;
  player_rank: number;
}

export default function DepthChart() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const teamId = searchParams.get("teamId")
  const [showJson, setShowJson] = useState(false)
  const [positionPlayers, setPositionPlayers] = useState<PositionPlayers>({})
  const [existingDepthChart, setExistingDepthChart] = useState<DepthChartEntry[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch players
        const playersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/roster`)
        if (!playersResponse.ok) throw new Error("Failed to fetch players")
        const playersData = await playersResponse.json()
        setPlayers(playersData.roster)

        // Fetch depth chart - simplified back to working version
        const depthChartResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/depth_chart`)
        if (depthChartResponse.ok) {
          const depthChartData = await depthChartResponse.json()
          setExistingDepthChart(depthChartData)
        }
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    if (teamId) fetchData()
  }, [teamId])

  useEffect(() => {
    const newPositionPlayers: PositionPlayers = {}
    const organizedDepthChart = organizeDepthChartByPosition(existingDepthChart)

    positions.forEach(position => {
      let positionPlayerList = getPlayersForPosition(position)
      if (organizedDepthChart[position]) {
        positionPlayerList.sort((a, b) => {
          const rankA = organizedDepthChart[position][a.jersey_number] || Number.MAX_VALUE
          const rankB = organizedDepthChart[position][b.jersey_number] || Number.MAX_VALUE
          return rankA - rankB
        })
      }
      newPositionPlayers[position] = positionPlayerList
    })

    setPositionPlayers(newPositionPlayers)
  }, [players, existingDepthChart])

  const getPlayersForPosition = (position: string) => {
    const playersWithAllocation = players.filter(player => {
      if (player.defensive_position_one === position && parseFloat(player.defensive_position_allocation_one) > 0) return true;
      if (player.defensive_position_two === position && player.defensive_position_allocation_two && parseFloat(player.defensive_position_allocation_two) > 0) return true;
      if (player.defensive_position_three === position && player.defensive_position_allocation_three && parseFloat(player.defensive_position_allocation_three) > 0) return true;
      if (player.defensive_position_four === position && player.defensive_position_allocation_four && parseFloat(player.defensive_position_allocation_four) > 0) return true;
      return false;
    });

    return playersWithAllocation.sort((a, b) => {
      const getAllocation = (player: Player) => {
        if (player.defensive_position_one === position) return parseFloat(player.defensive_position_allocation_one);
        if (player.defensive_position_two === position) return parseFloat(player.defensive_position_allocation_two || '0');
        if (player.defensive_position_three === position) return parseFloat(player.defensive_position_allocation_three || '0');
        if (player.defensive_position_four === position) return parseFloat(player.defensive_position_allocation_four || '0');
        return 0;
      };

      // Compare allocations first
      const allocationDiff = getAllocation(b) - getAllocation(a);
      if (allocationDiff !== 0) return allocationDiff;

      // If allocations are equal, check position priority
      const getPositionPriority = (player: Player) => {
        if (player.defensive_position_one === position) return 1;
        if (player.defensive_position_two === position) return 2;
        if (player.defensive_position_three === position) return 3;
        if (player.defensive_position_four === position) return 4;
        return 5;
      };

      const priorityDiff = getPositionPriority(a) - getPositionPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      // If position priority is equal, sort by jersey number
      return parseInt(a.jersey_number) - parseInt(b.jersey_number);
    });
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    const sourcePosition = source.droppableId;
    const destPosition = destination.droppableId;
    
    // Only allow dragging within the same position
    if (sourcePosition !== destPosition) return;
    
    const players = Array.from(positionPlayers[sourcePosition] || []);
    const [reorderedPlayer] = players.splice(source.index, 1);
    players.splice(destination.index, 0, reorderedPlayer);

    setPositionPlayers({
      ...positionPlayers,
      [sourcePosition]: players
    });
  };

  const prepareDepthChartData = () => {
    const depthChartData: { [key: string]: Array<{jersey_number: string, player_rank: number}> } = {};
    
    positions.forEach(position => {
      const positionPlayerList = positionPlayers[position] || [];
      // Map to jersey numbers with their player_rank
      depthChartData[position] = positionPlayerList.map((player: Player, index: number) => ({
        jersey_number: player.jersey_number,
        player_rank: index + 1
      }));
    });

    return {
      team_id: teamId,
      depth_chart: depthChartData
    };
  };

  const organizeDepthChartByPosition = (entries: DepthChartEntry[]) => {
    const organized: { [key: string]: { [key: string]: number } } = {};
    entries.forEach(entry => {
      if (!organized[entry.position]) {
        organized[entry.position] = {};
      }
      organized[entry.position][entry.jersey_number] = entry.player_rank;
    });
    return organized;
  };

  const saveDepthChart = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/depth_chart_post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(prepareDepthChartData())
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save depth chart');
      }

      // Show success message or handle successful save
      alert('Depth chart saved successfully');
    } catch (error) {
      console.error('Error saving depth chart:', error);
      alert('Failed to save depth chart');
    }
  };

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="max-w-full mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Depth Chart</h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowJson(!showJson)}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {showJson ? 'Hide JSON' : 'Show JSON'}
          </button>
          <button
            onClick={() => router.push(`/manage-roster?teamId=${teamId}`)}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Roster
          </button>
        </div>
      </div>

      {showJson && (
        <div className="mb-4">
          <textarea
            className="w-full h-48 p-2 font-mono text-sm border rounded"
            value={JSON.stringify(prepareDepthChartData(), null, 2)}
            readOnly
          />
          <button
            onClick={saveDepthChart}
            className="mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Save Depth Chart
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-9 gap-4">
          {/* Headers */}
          {positions.map(position => (
            <div key={position} className="font-bold text-gray-500 text-sm uppercase text-center">
              {position}
            </div>
          ))}

          {/* Position columns */}
          {positions.map(position => (
            <Droppable 
              key={position}
              droppableId={position}
              isDropDisabled={false}
              isCombineEnabled={false}
              ignoreContainerClipping={false}
              direction="vertical"
              type="DEFAULT"
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-h-[200px] bg-gray-50 rounded p-2"
                >
                  {positionPlayers[position]?.map((player, index) => (
                    <Draggable
                      key={player.player_id}
                      draggableId={`${position}-${player.player_id}`}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-2 mb-2 border rounded shadow-sm hover:bg-gray-50 relative"
                        >
                          <div className="absolute -top-2 -left-2 w-6 h-6 border-2 border-indigo-600 bg-white text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="pl-4">{player.jersey_number} - {player.player_name}</div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
} 