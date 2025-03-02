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

// Add this new modal component for manually adding opponent players
function AddOpponentPlayerModal({ 
  isOpen, 
  onClose, 
  onAddPlayer 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAddPlayer: (player: Player) => void; 
}) {
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('P'); // Default position

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlayer: Player = {
      jersey_number: jerseyNumber,
      name: name,
      position: position,
      order_number: 0 // This will be set when adding to the lineup
    };
    onAddPlayer(newPlayer);
    
    // Reset form
    setJerseyNumber('');
    setName('');
    setPosition('P');
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Add Opponent Player</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Jersey #</label>
            <input 
              type="text" 
              value={jerseyNumber} 
              onChange={(e) => setJerseyNumber(e.target.value)} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <select 
              value={position} 
              onChange={(e) => setPosition(e.target.value)} 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Player
            </button>
          </div>
        </form>
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
  const [isAddOpponentPlayerModalOpen, setIsAddOpponentPlayerModalOpen] = useState(false);

  useEffect(() => {
    if (teamId && gameId) {
      fetchGameDetails();
      fetchLineups();
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
    if (index === 0) return; // Already at the top
    
    const lineup = activeTab === 'home' ? [...homeLineup] : [...awayLineup];
    const temp = lineup[index];
    lineup[index] = lineup[index - 1];
    lineup[index - 1] = temp;
    
    // Update order numbers
    lineup.forEach((player, idx) => {
      player.order_number = idx + 1;
    });
    
    if (activeTab === 'home') {
      setHomeLineup(lineup);
    } else {
      setAwayLineup(lineup);
    }
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
  };

  const deletePlayer = (index: number) => {
    const lineup = activeTab === 'home' ? [...homeLineup] : [...awayLineup];
    
    // Remove the player at the specified index
    lineup.splice(index, 1);
    
    // Update order numbers for remaining players
    lineup.forEach((player, idx) => {
      player.order_number = idx + 1;
    });
    
    // Update the state
    if (activeTab === 'home') {
      setHomeLineup(lineup);
    } else {
      setAwayLineup(lineup);
    }
  };

  const saveLineup = async () => {
    try {
      setSaving(true);
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
  };

  // Add this function to find unused positions
  const findUnusedPositions = (lineup: Player[]): string[] => {
    const requiredPositions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    const usedPositions = new Set(lineup.map(player => player.position));
    
    return requiredPositions.filter(pos => !usedPositions.has(pos));
  };

  // Add this function to handle adding an opponent player
  const handleAddOpponentPlayer = (player: Player) => {
    // Determine which lineup to update based on which team is the opponent
    const isOpponentHome = game?.my_team_ha?.toLowerCase() === 'away';
    const lineup = isOpponentHome ? [...homeLineup] : [...awayLineup];
    
    // Set order_number based on position
    const newPlayer = {
      ...player,
      order_number: (player.position === 'SUB' || player.position === 'FL') ? 0 : 
        lineup.filter(p => p.position !== 'SUB' && p.position !== 'FL').length + 1
    };
    
    // Update the appropriate lineup
    if (isOpponentHome) {
      setHomeLineup([...lineup, newPlayer]);
    } else {
      setAwayLineup([...lineup, newPlayer]);
    }
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
      <h1 className="text-3xl font-bold text-gray-800 mb-1">Game Lineup</h1>
      <div className="text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <p className="flex">
              <span className="font-semibold w-20">Date:</span>
              <span>{game?.event_date}</span>
            </p>
            <p className="flex">
              <span className="font-semibold w-20">Teams:</span>
              <span>
                {game?.my_team_ha?.toLowerCase() === 'home' 
                  ? `Your Team (Home) vs ${game?.away_team_name} (Away)` 
                  : `${game?.away_team_name} (Home) vs Your Team (Away)`}
              </span>
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={saveLineup}
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
            >
              {saving ? 'Saving...' : 'Save Lineup'}
            </button>
            <button
              onClick={() => router.push(`/score-game/${teamId}`)}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Games
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Home Team Lineup</h2>
                {game?.my_team_ha?.toLowerCase() === 'home' ? (
                  <button
                    onClick={handleAddPlayerClick}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                  >
                    + Add Player
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddOpponentPlayerModalOpen(true)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                  >
                    + Add Opponent Player
                  </button>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jersey #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.order_number}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            homeDuplicates.has(player.jersey_number)
                              ? 'bg-red-100 text-red-800' 
                              : 'text-gray-500'
                          }`}>
                            {player.jersey_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <select
                              value={player.position}
                              onChange={(e) => editPosition(index, e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => movePlayerUp(index)}
                                disabled={index === 0}
                                className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                              >
                                ↑
                              </button>
                              <button 
                                onClick={() => movePlayerDown(index)}
                                disabled={index === homeLineup.length - 1}
                                className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                              >
                                ↓
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to remove ${player.name} from the lineup?`)) {
                                    deletePlayer(index);
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                ×
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Away Team Lineup</h2>
                {game?.my_team_ha?.toLowerCase() === 'away' ? (
                  <button
                    onClick={handleAddPlayerClick}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                  >
                    + Add Player
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddOpponentPlayerModalOpen(true)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                  >
                    + Add Opponent Player
                  </button>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jersey #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.order_number}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            awayDuplicates.has(player.jersey_number)
                              ? 'bg-red-100 text-red-800' 
                              : 'text-gray-500'
                          }`}>
                            {player.jersey_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <select
                              value={player.position}
                              onChange={(e) => editPosition(index, e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              {['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DP', 'FL', 'SUB'].map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => movePlayerUp(index)}
                                disabled={index === 0}
                                className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                              >
                                ↑
                              </button>
                              <button 
                                onClick={() => movePlayerDown(index)}
                                disabled={index === awayLineup.length - 1}
                                className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                              >
                                ↓
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to remove ${player.name} from the lineup?`)) {
                                    deletePlayer(index);
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                ×
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

      {/* Then add this component to display the unused positions */}
      {findUnusedPositions(activeTab === 'home' ? homeLineup : awayLineup).length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Missing Positions:</h3>
          <div className="flex flex-wrap gap-2">
            {findUnusedPositions(activeTab === 'home' ? homeLineup : awayLineup).map(position => (
              <span key={position} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                {position}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Opponent Player Modal */}
      <AddOpponentPlayerModal
        isOpen={isAddOpponentPlayerModalOpen}
        onClose={() => setIsAddOpponentPlayerModalOpen(false)}
        onAddPlayer={handleAddOpponentPlayer}
      />
    </div>
  );
} 