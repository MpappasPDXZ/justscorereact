"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import EditGameModal from "../EditGameModal";
import CreateGameModal from "../CreateGameModal";

// Add TrashIcon component
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
    />
  </svg>
);

// Back arrow icon
const BackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-3 w-3 mr-0.5" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

interface Player {
  jersey_number: string;
  name: string;
  position: string;
  order_number: number;
}

interface Game {
  away_team_name: string;
  coach: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  field_location: string;
  field_name: string;
  field_temperature: number;
  field_type: string;
  game_id: string;
  game_status: string;
  my_team_ha: string;
  user_team: number;
}

// Empty game template for creating new games
const emptyGame: Game = {
  away_team_name: "",
  coach: "",
  event_date: "",
  event_hour: 12,
  event_minute: 0,
  field_location: "",
  field_name: "",
  field_temperature: 70,
  field_type: "",
  game_id: "",
  game_status: "open",
  my_team_ha: "home",
  user_team: 0
};

export default function TeamGames() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [homeLineup, setHomeLineup] = useState<Player[]>([]);
  const [awayLineup, setAwayLineup] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (teamId) {
      fetchGames(teamId);
    }
  }, [teamId]);
  
  const fetchGames = async (teamId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/gamelist`);
      if (!response.ok) throw new Error("Failed to fetch games");
      const data = await response.json();
      
      // Check if data.games exists and is an array
      if (data && Array.isArray(data.games)) {
        // Sort games by date (ascending)
        const sortedGames = [...data.games].sort((a, b) => {
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        });
        
        // Ensure all games have the correct data types
        const processedGames = sortedGames.map(game => ({
          ...game,
          user_team: parseInt(game.user_team) || 0,
          event_hour: parseInt(game.event_hour) || 0,
          event_minute: parseInt(game.event_minute) || 0,
          field_temperature: parseInt(game.field_temperature) || 0
        }));
        
        setGames(processedGames);
      } else {
        setGames([]);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      setError("Failed to load games. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (game: Game) => {
    setSelectedGame(game);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleCreateGame = () => {
    setSelectedGame({...emptyGame, user_team: parseInt(teamId) || 0});
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGame(null);
    setIsCreating(false);
  };

  const handleGameSaved = () => {
    // Refresh the games list after a game is saved
    fetchGames(teamId);
    setIsModalOpen(false);
    setSelectedGame(null);
    setIsCreating(false);
  };

  // Add delete handler
  const handleDeleteGame = async (game: Game) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${game.game_id}/delete_game`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete game');
      }
      
      // Refresh the games list after successful deletion
      fetchGames(teamId);
    } catch (error) {
      console.error('Error deleting game:', error);
      setError('Failed to delete game. Please try again later.');
    }
  };

  // Format time to AM/PM
  const formatTime = (hour: number, minute: number) => {
    const period = hour < 12 ? "AM" : "PM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${String(minute).padStart(2, '0')} ${period}`;
  };

  // Add function to handle Score button click
  const handleScoreGame = (game: Game) => {
    if (!game.game_id || game.game_id === 'undefined') {
      console.error('Invalid game ID', game);
      setError('Cannot score game: invalid game ID');
      return;
    }
    router.push(`/score-game/${teamId}/lineup/${game.game_id}`);
  };

  const fetchLineups = async (game: Game) => {
    try {
      const myTeamResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${game.game_id}/my`);
      const opponentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${game.game_id}/opponent`);

      if (myTeamResponse.ok) {
        const myTeamData = await myTeamResponse.json();
        if (game.my_team_ha === 'home') {
          setHomeLineup(myTeamData.lineup || []);
        } else {
          setAwayLineup(myTeamData.lineup || []);
        }
      }

      if (opponentResponse.ok) {
        const opponentData = await opponentResponse.json();
        if (game.my_team_ha === 'home') {
          setAwayLineup(opponentData.lineup || []);
        } else {
          setHomeLineup(opponentData.lineup || []);
        }
      }
    } catch (error) {
      console.error("Error fetching lineups:", error);
      setError("Failed to load lineups. Please try again later.");
    }
  };

  // Filter games based on search term
  const filteredGames = games.filter(game => 
    game.away_team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Highlight matching text in opponent name
  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const after = text.substring(index + searchTerm.length);
    
    return (
      <>
        {before}
        <span className="bg-yellow-100">{match}</span>
        {after}
      </>
    );
  };

  if (loading) return (
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

  return (
    <div className="container mx-auto px-4 py-0">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-800">Games for Team {teamId}</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push(`/score-game`)}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <BackIcon />
            Back
          </button>
          <button
            onClick={handleCreateGame}
            className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium border bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Create Game
          </button>
        </div>
      </div>
      
      {/* Modern search */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1 relative max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search opponents..."
            className="w-full text-sm py-2 pl-9 pr-4 border-b border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors"
          />
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button 
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 ml-2">
          {filteredGames.length} of {games.length} games
        </div>
      </div>
      
      {games.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">No games found for this team.</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">No opponents match your search: <span className="font-medium">&quot;{searchTerm}&quot;</span></p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-20">
                  Actions
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-28">
                  Date & Time
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-32">
                  Opponent
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-24">
                  Coach
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-32">
                  Field
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-24">
                  Field Type
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-20">
                  Temp
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-16">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider w-16">
                  Game ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGames.map((game) => (
                <tr 
                  key={game.game_id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleScoreGame(game)}
                        className="flex items-center justify-center py-2 px-4 rounded-md shadow-sm text-xs font-medium border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 transition-colors"
                        title="Score game"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Score
                      </button>
                      
                      <button
                        onClick={() => handleGameClick(game)}
                        className="p-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-colors"
                        title="Edit game"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        className="p-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-colors"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete game ${game.game_id}?`)) {
                            handleDeleteGame(game);
                          }
                        }}
                        title="Delete game"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{game.event_date}</div>
                    <div className="text-xs text-gray-500">{formatTime(game.event_hour, game.event_minute)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">
                      {game.my_team_ha === "home" ? (
                        <>
                          {highlightMatch(game.away_team_name)} <span className="text-gray-500">(Away)</span>
                        </>
                      ) : (
                        <>
                          {highlightMatch(game.away_team_name)} <span className="text-gray-500">(Home)</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{game.coach}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{game.field_name}</div>
                    <div className="text-xs text-gray-500">{game.field_location}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <div className="text-xs text-gray-900">{game.field_type}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <div className="text-xs text-gray-900">{game.field_temperature}°F</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      game.game_status === "open" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {game.game_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <div className="text-xs text-gray-900">{game.game_id}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for editing or creating game */}
      {isModalOpen && selectedGame && (
        isCreating ? (
          <CreateGameModal 
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleGameSaved}
            gameData={selectedGame}
            teamId={teamId}
          />
        ) : (
          <EditGameModal 
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleGameSaved}
            gameData={selectedGame}
            teamId={teamId}
            gameId={selectedGame.game_id}
            isCreating={false}
          />
        )
      )}
    </div>
  );
} 