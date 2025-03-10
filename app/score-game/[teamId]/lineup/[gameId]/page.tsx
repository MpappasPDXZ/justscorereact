"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Player {
  jersey_number: string;
  name: string;
  position: string;
  order_number: number;
}

interface RosterPlayer {
  jersey_number: string;
  player_name: string;
  position: string;
}

interface Game {
  away_team_name: string;
  coach: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  field_location: string;
  field_name: string;
  field_temperature: string;
  field_type: string;
  game_id: string;
  game_status: string;
  my_team_ha: string;
  user_team: string;
}

// First, let's add a modal component for adding players
function AddPlayerModal({ 
  isOpen, 
  onClose, 
  availablePlayers, 
  onAddPlayer, 
  loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  availablePlayers: RosterPlayer[]; 
  onAddPlayer: (player: RosterPlayer) => void; 
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Add Player to Lineup</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center my-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {availablePlayers.length === 0 ? (
              <p className="text-center text-gray-500 my-4">No available players found.</p>
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jersey #</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availablePlayers.map((player, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{player.jersey_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{player.player_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{player.position}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            onClick={() => onAddPlayer(player)}
                            className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 transition-colors"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 mr-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// First, let's create a helper function to determine if this is the first SUB in the sorted lineup
const isFirstSub = (player: Player, index: number, sortedLineup: Player[]) => {
  // Check if this player is a SUB or has order_number 0
  if (player.position === 'SUB' || player.order_number === 0) {
    // If it's the first player in the array, it's the first SUB
    if (index === 0) return true;
    
    // If the previous player is not a SUB and doesn't have order_number 0, this is the first SUB
    const prevPlayer = sortedLineup[index - 1];
    return prevPlayer.position !== 'SUB' && prevPlayer.order_number !== 0;
  }
  return false;
};

export default function GameLineup() {
  const params = useParams();
  const teamId = params.teamId as string;
  const gameId = params.gameId as string;
  const router = useRouter();
  
  const [game, setGame] = useState<Game | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  const [homeLineup, setHomeLineup] = useState<Player[]>([]);
  const [awayLineup, setAwayLineup] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<RosterPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  // Move these hooks inside the component
  const [opponentGridData, setOpponentGridData] = useState<Player[]>([]);
  const [newOpponentPlayer, setNewOpponentPlayer] = useState<{
    jersey_number: string;
    name: string;
    position: string;
  }>({
    jersey_number: '',
    name: '',
    position: 'EH'
  });

  // Add this new state to store the team roster
  const [teamRoster, setTeamRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Replace the newTeamPlayer state with a selectedRosterPlayer state
  const [selectedRosterPlayer, setSelectedRosterPlayer] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('P');

  // First, let's add a state to track if changes have been made to the lineup
  const [lineupChanged, setLineupChanged] = useState(false);

  // Add this function to fetch the team roster
  const fetchTeamRoster = async () => {
    setLoadingRoster(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/roster`);
      if (!response.ok) throw new Error('Failed to fetch team roster');
      const data = await response.json();
      setTeamRoster(data.roster || []);
    } catch (error) {
      console.error('Error fetching team roster:', error);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Add this function to handle adding a player to the grid
  const handleAddOpponentToGrid = () => {
    if (!newOpponentPlayer.jersey_number) {
      return; // Don't add players without a jersey number
    }
    
    // Determine which lineup to update based on which team is the opponent
    const isOpponentHome = game?.my_team_ha?.toLowerCase() === 'away';
    const lineup = isOpponentHome ? [...homeLineup] : [...awayLineup];
    
    // Create the new player, using jersey number as name if name is empty
    const newPlayer: Player = {
      jersey_number: newOpponentPlayer.jersey_number,
      name: newOpponentPlayer.name || `#${newOpponentPlayer.jersey_number}`, // Use jersey number if name is empty
      position: newOpponentPlayer.position,
      order_number: (newOpponentPlayer.position === 'SUB' || newOpponentPlayer.position === 'FL') ? 0 : 
        lineup.filter(p => p.position !== 'SUB' && p.position !== 'FL').length + 1
    };
    
    // Update the appropriate lineup
    if (isOpponentHome) {
      setHomeLineup([...lineup, newPlayer]);
    } else {
      setAwayLineup([...lineup, newPlayer]);
    }
    
    // Reset the form
    setNewOpponentPlayer({
      jersey_number: '',
      name: '',
      position: 'EH'  // Reset to 'EH' instead of 'P'
    });
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  // Update the handleAddTeamPlayerQuick function
  const handleAddTeamPlayerQuick = () => {
    if (!selectedRosterPlayer) {
      return; // Don't add if no player is selected
    }
    
    // Find the selected player from the roster
    const player = teamRoster.find(p => p.player_name === selectedRosterPlayer);
    if (!player) return;
    
    // Determine which lineup to update
    const lineup = game?.my_team_ha?.toLowerCase() === 'home' ? [...homeLineup] : [...awayLineup];
    
    // Create the new player
    const newPlayer: Player = {
      jersey_number: player.jersey_number,
      name: player.player_name,
      position: selectedPosition,
      order_number: (selectedPosition === 'SUB' || selectedPosition === 'FL') ? 0 : 
        lineup.filter(p => p.position !== 'SUB' && p.position !== 'FL').length + 1
    };
    
    // Update the appropriate lineup
    if (game?.my_team_ha?.toLowerCase() === 'home') {
      setHomeLineup([...lineup, newPlayer]);
    } else {
      setAwayLineup([...lineup, newPlayer]);
    }
    
    // Reset the form
    setSelectedRosterPlayer('');
    setSelectedPosition('P');
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  useEffect(() => {
    if (teamId && gameId) {
      fetchGameDetails();
      fetchLineups();
      fetchTeamRoster();
    }
  }, [teamId, gameId]);

  const fetchGameDetails = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}`);
      if (!response.ok) throw new Error("Failed to fetch game details");
      const data = await response.json();
      
      if (data && data.game_data) {
        setGame(data.game_data);
        // Set the active tab based on my_team_ha
        setActiveTab(data.game_data.my_team_ha.toLowerCase() === 'home' ? 'home' : 'away');
      } else {
        throw new Error("No game details found");
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
      setError("Failed to load game details. Please try again later.");
    }
  };

  const fetchLineups = async () => {
    try {
      setLoading(true);
      
      // Make sure we have game data first
      let currentGame = game;
      if (!currentGame) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}`);
        if (!response.ok) throw new Error("Failed to fetch game details");
        const data = await response.json();
        
        if (data && data.game_data) {
          currentGame = data.game_data;
          setGame(data.game_data);
        } else {
          throw new Error("No game details found");
        }
      }
      
      // Now we can safely use currentGame
      const myTeamResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${gameId}/my`);
      const opponentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${gameId}/opponent`);
      
      console.log("currentGame?.my_team_ha -->", currentGame?.my_team_ha);
      const isMyTeamHome = currentGame?.my_team_ha?.toLowerCase() === 'home';
      
      if (myTeamResponse.ok) {
        const myTeamData = await myTeamResponse.json();
        if (isMyTeamHome) {
          setHomeLineup(myTeamData.lineup || []);
        } else {
          setAwayLineup(myTeamData.lineup || []);
        }
      }
      
      if (opponentResponse.ok) {
        const opponentData = await opponentResponse.json();
        if (isMyTeamHome) {
          setAwayLineup(opponentData.lineup || []);
        } else {
          setHomeLineup(opponentData.lineup || []);
        }
      }
    } catch (error) {
      console.error("Error fetching lineups:", error);
      setError("Failed to load lineups. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const movePlayerUp = (index: number) => {
    if (index === 0) return;
    
    const lineup = activeTab === 'home' ? [...homeLineup] : [...awayLineup];
    const temp = lineup[index];
    lineup[index] = lineup[index - 1];
    lineup[index - 1] = temp;
    
    // Update order numbers for non-SUB players
    if (temp.position !== 'SUB' && temp.position !== 'FL' && lineup[index].position !== 'SUB' && lineup[index].position !== 'FL') {
      const tempOrder = temp.order_number;
      temp.order_number = lineup[index].order_number;
      lineup[index].order_number = tempOrder;
    }
    
    if (activeTab === 'home') {
      setHomeLineup(lineup);
    } else {
      setAwayLineup(lineup);
    }
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  const movePlayerDown = (index: number) => {
    const lineup = activeTab === 'home' ? [...homeLineup] : [...awayLineup];
    if (index === lineup.length - 1) return; // Already at the bottom
    
    const temp = lineup[index];
    lineup[index] = lineup[index + 1];
    lineup[index + 1] = temp;
    
    // Update order numbers
    lineup.forEach((player, idx) => {
      player.order_number = idx + 1;
    });
    
    if (activeTab === 'home') {
      setHomeLineup(lineup);
    } else {
      setAwayLineup(lineup);
    }
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  const deletePlayer = (index: number) => {
    const lineup = activeTab === 'home' ? [...homeLineup] : [...awayLineup];
    
    // Remove the player at the specified index
    lineup.splice(index, 1);
    
    // Update order numbers for remaining players
    // Only update order numbers for non-SUB and non-FL players
    let orderCounter = 1;
    lineup.forEach((player) => {
      if (player.position !== 'SUB' && player.position !== 'FL') {
        player.order_number = orderCounter++;
      } else {
        player.order_number = 0;
      }
    });
    
    // Update the state
    if (activeTab === 'home') {
      setHomeLineup(lineup);
    } else {
      setAwayLineup(lineup);
    }
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  const saveLineup = async () => {
    setSaving(true);
    try {
      const lineup = activeTab === 'home' ? homeLineup : awayLineup;
      
      // Determine if we're saving "my" team or "opponent" based on active tab and my_team_ha
      const isMyTeamTab = (game?.my_team_ha?.toLowerCase() === 'home' && activeTab === 'home') || 
                          (game?.my_team_ha?.toLowerCase() === 'away' && activeTab === 'away');
      
      const endpoint = isMyTeamTab ? 'my' : 'opponent';
      
      // Format the data according to what the API expects
      // The API expects a Lineup object with a players field
      const requestData = {
        players: lineup.map(player => ({
          jersey_number: player.jersey_number,
          name: player.name,
          position: player.position,
          order_number: player.order_number
        }))
      };
      
      // Log the request data to see what we're sending
      console.log(`Sending to ${endpoint} endpoint:`, JSON.stringify(requestData, null, 2));
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${gameId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        throw new Error(`Failed to save lineup: ${response.status} ${response.statusText}`);
      }
      
      alert(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} lineup saved successfully!`);
      
      // Reset the changed flag after successful save
      setLineupChanged(false);
    } catch (error) {
      console.error(`Error saving ${activeTab} lineup:`, error);
      setError(`Failed to save ${activeTab} lineup. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      setLoadingPlayers(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/active_players`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch players: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Available players:", data);
      
      // Filter out players already in the lineup
      const currentLineup = game?.my_team_ha?.toLowerCase() === 'home' ? homeLineup : awayLineup;
      const filteredPlayers = data.active_players.filter((player: RosterPlayer) => 
        !currentLineup.some(lineupPlayer => 
          lineupPlayer.jersey_number === player.jersey_number && 
          lineupPlayer.name === player.player_name
        )
      );
      
      setAvailablePlayers(filteredPlayers);
    } catch (error) {
      console.error("Error fetching available players:", error);
      setError("Failed to load available players. Please try again.");
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleAddPlayerClick = () => {
    fetchAvailablePlayers();
    setIsAddPlayerModalOpen(true);
  };

  const handleAddPlayerToLineup = (player: RosterPlayer) => {
    const lineup = game?.my_team_ha?.toLowerCase() === 'home' ? [...homeLineup] : [...awayLineup];
    
    // Add the player to the lineup with the appropriate order number
    const newPlayer: Player = {
      jersey_number: player.jersey_number,
      name: player.player_name,
      position: player.position,
      order_number: (player.position === 'SUB' || player.position === 'FL') ? 0 : 
        lineup.filter(p => p.position !== 'SUB' && p.position !== 'FL').length + 1
    };
    
    if (game?.my_team_ha?.toLowerCase() === 'home') {
      setHomeLineup([...lineup, newPlayer]);
    } else {
      setAwayLineup([...lineup, newPlayer]);
    }
    
    setIsAddPlayerModalOpen(false);
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  // Add this function to check for duplicate jersey numbers
  const findDuplicateJerseys = (lineup: Player[]): Set<string> => {
    const jerseyCount = new Map<string, number>();
    const duplicates = new Set<string>();
    
    lineup.forEach(player => {
      const count = jerseyCount.get(player.jersey_number) || 0;
      jerseyCount.set(player.jersey_number, count + 1);
      
      if (count > 0) {
        duplicates.add(player.jersey_number);
      }
    });
    
    return duplicates;
  };

  // Add this function to edit a player's position
  const editPosition = (index: number, newPosition: string) => {
    const lineup = activeTab === 'home' ? [...homeLineup] : [...awayLineup];
    const oldPosition = lineup[index].position;
    lineup[index].position = newPosition;
    
    // If changing to SUB or FL, set order_number to 0
    if (newPosition === 'SUB' || newPosition === 'FL') {
      lineup[index].order_number = 0;
    } 
    // If changing from SUB or FL to another position, assign a new order number
    else if ((oldPosition === 'SUB' || oldPosition === 'FL') && newPosition !== 'SUB' && newPosition !== 'FL') {
      // Find the highest order number
      const maxOrder = Math.max(...lineup.filter(p => p.position !== 'SUB' && p.position !== 'FL').map(p => p.order_number), 0);
      lineup[index].order_number = maxOrder + 1;
    }
    
    if (activeTab === 'home') {
      setHomeLineup(lineup);
    } else {
      setAwayLineup(lineup);
    }
    
    // Set lineup as changed
    setLineupChanged(true);
  };

  // Fix the findUnusedPositions function to correctly identify missing positions
  const findUnusedPositions = (lineup: Player[]): string[] => {
    // Only check for missing positions if this is your team
    const isMyTeam = (activeTab === 'home' && game?.my_team_ha?.toLowerCase() === 'home') ||
                    (activeTab === 'away' && game?.my_team_ha?.toLowerCase() === 'away');
    
    if (!isMyTeam) {
      return []; // Return empty array for opponent team
    }
    
    // Define the required positions
    const requiredPositions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    
    // Get all positions currently used in the lineup
    const usedPositions = lineup.map(player => player.position);
    
    // Find positions that are not used
    return requiredPositions.filter(pos => !usedPositions.includes(pos));
  };

  // First, let's update the canShowScoreButton function to check if both teams have at least 7 players
  const canShowScoreButton = () => {
    const homePlayerCount = homeLineup.filter(p => p.position !== 'SUB').length;
    const awayPlayerCount = awayLineup.filter(p => p.position !== 'SUB').length;
    return homePlayerCount >= 7 && awayPlayerCount >= 7;
  };

  // First, let's fix the isOpponentTab function to correctly identify when we're on the opponent's tab
  const isOpponentTab = () => {
    return (game?.my_team_ha?.toLowerCase() === 'home' && activeTab === 'away') || 
           (game?.my_team_ha?.toLowerCase() === 'away' && activeTab === 'home');
  };

  // And similarly for the isMyTeamTab function
  const isMyTeamTab = () => {
    return (game?.my_team_ha?.toLowerCase() === 'home' && activeTab === 'home') || 
           (game?.my_team_ha?.toLowerCase() === 'away' && activeTab === 'away');
  };

  if (loading && !game) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Error!</strong>
      <span className="block sm:inline"> {error}</span>
    </div>
  );

  // Calculate duplicates first
  const homeDuplicates = findDuplicateJerseys(homeLineup);
  const awayDuplicates = findDuplicateJerseys(awayLineup);

  return (
    <div className="container mx-auto px-3 py-0">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-bold">Game Lineup</h1>
          {game && (
            <div className="text-xs text-gray-500 mt-1">
              {game.event_date} {game.event_hour}:{game.event_minute < 10 ? '0' + game.event_minute : game.event_minute}
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/score-game/${teamId}`)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
          >
            Back to Games
          </button>
          
          <button
            onClick={saveLineup}
            disabled={saving || !lineupChanged}
            className={`px-4 py-2 rounded transition-colors ${
              lineupChanged 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400' 
                : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:border-indigo-300 disabled:text-indigo-300'
            }`}
          >
            {saving ? 'Saving...' : 'Save Lineup'}
          </button>
          
          <button
            onClick={() => router.push(`/score-game/${teamId}/score/${gameId}`)}
            disabled={!canShowScoreButton()}
            className={`px-4 py-2 rounded transition-colors ${
              canShowScoreButton() 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:border-indigo-300 disabled:text-indigo-300'
            }`}
          >
            Score Game
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mt-3">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('home')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'home'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {game?.my_team_ha.toLowerCase() === 'home' ? 'Your Team (Home)' : game?.away_team_name + ' (Home)'}
            </button>
            <button
              onClick={() => setActiveTab('away')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'away'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {game?.my_team_ha.toLowerCase() === 'away' ? 'Your Team (Away)' : game?.away_team_name + ' (Away)'}
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'home' ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Home Team Lineup</h2>
                
                {/* Show your team's player selector when home is your team and home tab is active */}
                {game?.my_team_ha?.toLowerCase() === 'home' && activeTab === 'home' && (
                  <div className="mb-2 bg-white p-2 rounded-lg shadow">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Player</label>
                        {loadingRoster ? (
                          <div className="w-full p-1 text-sm text-gray-500">Loading roster...</div>
                        ) : (
                          <select
                            value={selectedRosterPlayer}
                            onChange={(e) => setSelectedRosterPlayer(e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select a player</option>
                            {teamRoster
                              .filter(player => 
                                // Filter out players that are already in the lineup
                                !homeLineup.some(p => p.jersey_number === player.jersey_number && p.name === player.player_name) &&
                                !awayLineup.some(p => p.jersey_number === player.jersey_number && p.name === player.player_name)
                              )
                              .map(player => (
                                <option key={player.jersey_number} value={player.player_name}>
                                  #{player.jersey_number} - {player.player_name}
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </div>
                      <div className="w-20">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pos</label>
                        <select
                          value={selectedPosition}
                          onChange={(e) => setSelectedPosition(e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                        >
                          {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAddTeamPlayerQuick}
                        disabled={!selectedRosterPlayer}
                        className="bg-indigo-600 text-white py-1 px-3 rounded text-sm hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleAddPlayerClick}
                        className="bg-gray-200 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-300 transition-colors"
                      >
                        Roster
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show opponent player form when home is the opponent and home tab is active */}
                {game?.my_team_ha?.toLowerCase() === 'away' && activeTab === 'home' && (
                  <div className="mb-2 bg-white p-2 rounded-lg shadow">
                    <div className="flex items-end space-x-2">
                      <div className="w-16">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Jersey #</label>
                        <input
                          type="text"
                          value={newOpponentPlayer.jersey_number}
                          onChange={(e) => setNewOpponentPlayer({
                            ...newOpponentPlayer, 
                            jersey_number: e.target.value
                          })}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                          placeholder="##"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name (Optional)</label>
                        <input
                          type="text"
                          value={newOpponentPlayer.name}
                          onChange={(e) => setNewOpponentPlayer({...newOpponentPlayer, name: e.target.value})}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                          placeholder="Leave blank to use jersey #"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pos</label>
                        <select
                          value={newOpponentPlayer.position}
                          onChange={(e) => setNewOpponentPlayer({...newOpponentPlayer, position: e.target.value})}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                        >
                          {['EH', 'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'FL', 'SUB'].map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAddOpponentToGrid}
                        disabled={!newOpponentPlayer.jersey_number}
                        className="bg-indigo-600 text-white py-1 px-3 rounded text-sm hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jersey #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {homeLineup
                    .sort((a, b) => {
                      // If both are non-batting players (SUB or FL), sort alphabetically by name
                      if ((a.order_number === 0 || a.position === 'FL') && (b.order_number === 0 || b.position === 'FL')) {
                        // If they're different types (SUB vs FL), group them
                        if (a.position === 'FL' && b.position === 'SUB') return -1;
                        if (a.position === 'SUB' && b.position === 'FL') return 1;
                        // Otherwise sort by name
                        return a.name.localeCompare(b.name);
                      }
                      // If only a is a non-batting player, it goes to the bottom
                      if (a.order_number === 0 || a.position === 'FL') return 1;
                      // If only b is a non-batting player, it goes to the bottom
                      if (b.order_number === 0 || b.position === 'FL') return -1;
                      // Otherwise sort by order_number
                      return a.order_number - b.order_number;
                    })
                    .reduce((acc, player, index, sortedArray) => {
                      // Check if we need to insert a separator before this player
                      if (index > 0) {
                        const prevPlayer = sortedArray[index-1];
                        const prevIsBatting = prevPlayer.order_number !== 0 && prevPlayer.position !== 'FL';
                        const currentIsBatting = player.order_number !== 0 && player.position !== 'FL';
                        
                        // If transitioning from batting to non-batting
                        if (prevIsBatting && !currentIsBatting) {
                          // Add a separator row for the first non-batting player
                          if (player.position === 'FL') {
                            acc.push(
                              <tr key={`flex-separator-${index}`} className="bg-blue-100">
                                <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-blue-800 uppercase">
                                  Flex Players (Non-Batting)
                                </td>
                              </tr>
                            );
                          } else {
                            acc.push(
                              <tr key={`sub-separator-${index}`} className="bg-gray-200">
                                <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-gray-700 uppercase">
                                  Substitutes
                                </td>
                              </tr>
                            );
                          }
                        }
                        // If transitioning from FL to SUB
                        else if (prevPlayer.position === 'FL' && player.position === 'SUB') {
                          acc.push(
                            <tr key={`sub-separator-${index}`} className="bg-gray-200">
                              <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-gray-700 uppercase">
                                Substitutes
                              </td>
                            </tr>
                          );
                        }
                      }
                      
                      // Add the player row
                      acc.push(
                        <tr 
                          key={index} 
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isFirstSub(player, index, sortedArray) ? 'border-t-2 border-gray-300' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {player.position === 'SUB' || player.position === 'FL' ? '-' : player.order_number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {player.jersey_number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <select
                              value={player.position}
                              onChange={(e) => editPosition(index, e.target.value)}
                              className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => movePlayerUp(index)}
                                disabled={player.position === 'SUB' || player.position === 'FL' || index === 0 || isFirstSub(player, index, sortedArray)}
                                className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => movePlayerDown(index)}
                                disabled={
                                  player.position === 'SUB' || 
                                  player.position === 'FL' || 
                                  index === sortedArray.filter(p => p.position !== 'SUB' && p.position !== 'FL').length - 1 ||
                                  (index < sortedArray.length - 1 && (sortedArray[index + 1].position === 'SUB' || sortedArray[index + 1].position === 'FL'))
                                }
                                className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deletePlayer(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      
                      return acc;
                    }, [] as React.ReactNode[])}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Away Team Lineup</h2>
                
                {/* Show your team's player selector when away is your team and away tab is active */}
                {game?.my_team_ha?.toLowerCase() === 'away' && activeTab === 'away' && (
                  <div className="mb-2 bg-white p-2 rounded-lg shadow">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Player</label>
                        {loadingRoster ? (
                          <div className="w-full p-1 text-sm text-gray-500">Loading roster...</div>
                        ) : (
                          <select
                            value={selectedRosterPlayer}
                            onChange={(e) => setSelectedRosterPlayer(e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select a player</option>
                            {teamRoster
                              .filter(player => 
                                // Filter out players that are already in the lineup
                                !homeLineup.some(p => p.jersey_number === player.jersey_number && p.name === player.player_name) &&
                                !awayLineup.some(p => p.jersey_number === player.jersey_number && p.name === player.player_name)
                              )
                              .map(player => (
                                <option key={player.jersey_number} value={player.player_name}>
                                  #{player.jersey_number} - {player.player_name}
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </div>
                      <div className="w-20">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pos</label>
                        <select
                          value={selectedPosition}
                          onChange={(e) => setSelectedPosition(e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                        >
                          {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAddTeamPlayerQuick}
                        disabled={!selectedRosterPlayer}
                        className="bg-indigo-600 text-white py-1 px-3 rounded text-sm hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleAddPlayerClick}
                        className="bg-gray-200 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-300 transition-colors"
                      >
                        Roster
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show opponent player form when away is the opponent and away tab is active */}
                {game?.my_team_ha?.toLowerCase() === 'home' && activeTab === 'away' && (
                  <div className="mb-2 bg-white p-2 rounded-lg shadow">
                    <div className="flex items-end space-x-2">
                      <div className="w-16">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Jersey #</label>
                        <input
                          type="text"
                          value={newOpponentPlayer.jersey_number}
                          onChange={(e) => setNewOpponentPlayer({
                            ...newOpponentPlayer, 
                            jersey_number: e.target.value
                          })}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                          placeholder="##"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name (Optional)</label>
                        <input
                          type="text"
                          value={newOpponentPlayer.name}
                          onChange={(e) => setNewOpponentPlayer({...newOpponentPlayer, name: e.target.value})}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                          placeholder="Leave blank to use jersey #"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pos</label>
                        <select
                          value={newOpponentPlayer.position}
                          onChange={(e) => setNewOpponentPlayer({...newOpponentPlayer, position: e.target.value})}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                        >
                          {['EH', 'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'FL', 'SUB'].map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAddOpponentToGrid}
                        disabled={!newOpponentPlayer.jersey_number}
                        className="bg-indigo-600 text-white py-1 px-3 rounded text-sm hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jersey #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {awayLineup
                    .sort((a, b) => {
                      // If both are non-batting players (SUB or FL), sort alphabetically by name
                      if ((a.order_number === 0 || a.position === 'FL') && (b.order_number === 0 || b.position === 'FL')) {
                        // If they're different types (SUB vs FL), group them
                        if (a.position === 'FL' && b.position === 'SUB') return -1;
                        if (a.position === 'SUB' && b.position === 'FL') return 1;
                        // Otherwise sort by name
                        return a.name.localeCompare(b.name);
                      }
                      // If only a is a non-batting player, it goes to the bottom
                      if (a.order_number === 0 || a.position === 'FL') return 1;
                      // If only b is a non-batting player, it goes to the bottom
                      if (b.order_number === 0 || b.position === 'FL') return -1;
                      // Otherwise sort by order_number
                      return a.order_number - b.order_number;
                    })
                    .reduce((acc, player, index, sortedArray) => {
                      // Check if we need to insert a separator before this player
                      if (index > 0) {
                        const prevPlayer = sortedArray[index-1];
                        const prevIsBatting = prevPlayer.order_number !== 0 && prevPlayer.position !== 'FL';
                        const currentIsBatting = player.order_number !== 0 && player.position !== 'FL';
                        
                        // If transitioning from batting to non-batting
                        if (prevIsBatting && !currentIsBatting) {
                          // Add a separator row for the first non-batting player
                          if (player.position === 'FL') {
                            acc.push(
                              <tr key={`flex-separator-${index}`} className="bg-blue-100">
                                <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-blue-800 uppercase">
                                  Flex Players (Non-Batting)
                                </td>
                              </tr>
                            );
                          } else {
                            acc.push(
                              <tr key={`sub-separator-${index}`} className="bg-gray-200">
                                <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-gray-700 uppercase">
                                  Substitutes
                                </td>
                              </tr>
                            );
                          }
                        }
                        // If transitioning from FL to SUB
                        else if (prevPlayer.position === 'FL' && player.position === 'SUB') {
                          acc.push(
                            <tr key={`sub-separator-${index}`} className="bg-gray-200">
                              <td colSpan={5} className="px-6 py-2 text-center text-xs font-medium text-gray-700 uppercase">
                                Substitutes
                              </td>
                            </tr>
                          );
                        }
                      }
                      
                      // Add the player row
                      acc.push(
                        <tr 
                          key={index} 
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isFirstSub(player, index, sortedArray) ? 'border-t-2 border-gray-300' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {player.position === 'SUB' || player.position === 'FL' ? '-' : player.order_number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {player.jersey_number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <select
                              value={player.position}
                              onChange={(e) => editPosition(index, e.target.value)}
                              className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => movePlayerUp(index)}
                                disabled={player.position === 'SUB' || player.position === 'FL' || index === 0 || isFirstSub(player, index, sortedArray)}
                                className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => movePlayerDown(index)}
                                disabled={
                                  player.position === 'SUB' || 
                                  player.position === 'FL' || 
                                  index === sortedArray.filter(p => p.position !== 'SUB' && p.position !== 'FL').length - 1 ||
                                  (index < sortedArray.length - 1 && (sortedArray[index + 1].position === 'SUB' || sortedArray[index + 1].position === 'FL'))
                                }
                                className="text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deletePlayer(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      
                      return acc;
                    }, [] as React.ReactNode[])}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        availablePlayers={availablePlayers}
        onAddPlayer={handleAddPlayerToLineup}
        loading={loadingPlayers}
      />

      {/* Make sure the missing positions warning is displayed in the correct location */}
      {findUnusedPositions(activeTab === 'home' ? homeLineup : awayLineup).length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">Missing Positions:</h3>
          <div className="flex flex-wrap gap-2">
            {findUnusedPositions(activeTab === 'home' ? homeLineup : awayLineup).map(position => (
              <span key={position} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                {position}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 