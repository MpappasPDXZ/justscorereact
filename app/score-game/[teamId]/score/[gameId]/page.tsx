'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import PlateAppearanceModal from '@/app/components/PlateAppearanceModal';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import BoxScoreInningCell from '@/app/components/BoxScoreInningCell';

// Define types
interface Game {
  id: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  away_team_name: string;
  home_team_name: string;
  my_team_ha: string;
}

// Updated InningStats interface to match BoxScoreInningCell's requirements
interface InningStats {
  runs: number;
  hits: number;
  errors: number;
  walks: number;
  outs: number;
  strikeouts: number;
  strike_percent: number;
  on_base_percent: number;
  hard_hit: number;
  on_first_base: number;
  on_second_base: number;
  on_third_base: number;
  runners_on_base?: string[];
}

// Updated BoxScoreData interface to match the new API response
interface BoxScoreData {
  game_header: {
    user_team: string;
    coach: string;
    opponent_name: string;
    event_date: string;
    event_hour: number;
    event_minute: number;
    field_name: string;
    field_location: string;
    field_type: string;
    field_temperature: number;
    game_status: string;
    my_team_ha: string;
    game_id: string;
  };
  innings: {
    [key: string]: {
      home: InningStats;
      away: InningStats;
    }
  };
  totals: {
    home: InningStats;
    away: InningStats;
  };
}

interface LineupEntry {
  jersey_number: string;
  name: string;
  position: string;
  order_number: number;
}

interface ScoreBookEntry {
  order_number: number;
  batter_jersey_number: string;
  batter_name: string;
  batter_seq_id: number;
  bases_reached: string;      // 0-4 for bases reached
  why_base_reached: string;   // H, HH, S, B, C, etc.
  pa_result: string;         // Legacy field - will be computed from bases_reached and why_base_reached
  result_type: string;       // Legacy field - will be computed from why_base_reached
  detailed_result: string;   // Fielder position
  base_running: string;
  balls_before_play: number;
  strikes_before_play: number;
  strikes_watching: number;   
  strikes_swinging: number;   
  strikes_unsure: number;     // New field for strikes where type is unknown
  fouls_after_two_strikes: number;
  base_running_stolen_base: number;
  error_on?: string;
  passed_ball?: number;
  wild_pitch?: number;
  round: number;
}

interface InningDetail {
  team_id: string;
  game_id: string;
  inning_number: number;
  my_team_ha: string;
  lineup_available: boolean;
  stats: {
    runs: number;
    hits: number;
    errors: number;
    walks: number;
    outs: number;
    total_plate_appearances: number;
  };
  lineup_entries: LineupEntry[];
  scorebook_entries: ScoreBookEntry[];
}

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (substitution: PlayerSubstitution) => void;
  inningNumber: string;
  teamId: string;
  gameId: string;
  currentLineup: LineupEntry[];
  orderNumber: number;
}

interface PlayerSubstitution {
  team_id: string;
  game_id: string;
  inning_number: number;
  order_number: number;
  jersey_number: string;
  name: string;
  position: string;
}

interface PlateAppearanceModalProps {
  pa: ScoreBookEntry | null;
  isOpen: boolean;
  onClose: (teamSide?: 'home' | 'away') => void;
  onSave?: (updatedPA: ScoreBookEntry) => Promise<void>;
  teamId?: string;
  gameId?: string;
  inningNumber?: number;
  homeOrAway?: string;
  nextBatterSeqId?: number;
  myTeamHomeOrAway?: string;
  onDelete: (paData: {
    team_id: string;
    game_id: string;
    inning_number: number | string;
    home_or_away: string;
    batter_seq_id: number;
  }) => Promise<void>;
  inningDetail: InningDetail | null;
}

const SubstitutionModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  inningNumber, 
  teamId, 
  gameId, 
  currentLineup,
  orderNumber
}: SubstitutionModalProps) => {
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Get the current player in this lineup spot
  const currentPlayer = currentLineup.find(player => player.order_number === orderNumber);
  
  useEffect(() => {
    if (isOpen) {
      fetchAvailablePlayers();
    }
  }, [isOpen]);
  
  const fetchAvailablePlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${teamId}/players`);
      if (!response.ok) throw new Error("Failed to fetch players");
      const data = await response.json();
      
      if (data && data.players) {
        setAvailablePlayers(data.players);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = () => {
    if (!selectedPlayer) {
      alert("Please select a player");
      return;
    }
    
    if (!position) {
      alert("Please select a position");
      return;
    }
    
    const playerInfo = availablePlayers.find(p => p.jersey_number === selectedPlayer);
    
    if (!playerInfo) {
      alert("Invalid player selection");
      return;
    }
    
    const substitution: PlayerSubstitution = {
      team_id: teamId,
      game_id: gameId,
      inning_number: parseInt(inningNumber),
      order_number: orderNumber,
      jersey_number: selectedPlayer,
      name: playerInfo.name,
      position: position
    };
    
    onSave(substitution);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Player Substitution - Inning {inningNumber}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Current Player:</div>
            <div className="p-3 bg-gray-50 rounded">
              {currentPlayer ? (
                <div className="font-medium">
                  #{currentPlayer.jersey_number} {currentPlayer.name} ({currentPlayer.position})
                </div>
              ) : (
                <div className="text-gray-500">No player in this position</div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Substitute Player:
            </label>
            {loading ? (
              <div className="text-center py-2">Loading players...</div>
            ) : (
              <select
                className="w-full p-2 border rounded"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">Select Player</option>
                {availablePlayers.map((player) => (
                  <option key={player.jersey_number} value={player.jersey_number}>
                    #{player.jersey_number} {player.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position:
            </label>
            <select
              className="w-full p-2 border rounded"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">Select Position</option>
              <PositionSelectOptions />
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
            >
              Save Substitution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ScoreGame() {
  const params = useParams();
  const teamId = params.teamId as string;
  const gameId = params.gameId as string;
  const router = useRouter();
  
  // State variables
  const [game, setGame] = useState<Game | null>(null);
  const [boxScore, setBoxScore] = useState<BoxScoreData | null>(null);
  const [selectedInning, setSelectedInning] = useState<string>('1');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('away');
  const [inningDetail, setInningDetail] = useState<InningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInningDetail, setLoadingInningDetail] = useState(false);
  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);
  const [substitutingOrderNumber, setSubstitutingOrderNumber] = useState<number | null>(null);
  const [selectedPA, setSelectedPA] = useState<ScoreBookEntry | null>(null);
  const [isPlateAppearanceModalOpen, setIsPlateAppearanceModalOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  useEffect(() => {
    if (teamId && gameId) {
      fetchGameDetails();
      fetchBoxScore();
    }
  }, [teamId, gameId]);

  // When box score is loaded, fetch the first inning details
  useEffect(() => {
    if (boxScore) {
      // Only set to 'away' on initial load, otherwise maintain the current selection
      if (!inningDetail) {
        fetchInningDetail('1', 'away');
      }
    }
  }, [boxScore]);

  const fetchGameDetails = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}`);
      if (!response.ok) throw new Error("Failed to fetch game details");
      const data = await response.json();
      
      if (data && data.game_data) {
        setGame(data.game_data);
      } else {
        throw new Error("No game details found");
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
      alert("Failed to load game details. Please try again later.");
    }
  };

  const fetchBoxScore = async () => {
    try {
      // Log the API request
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/summary`;
      console.log("Fetching box score from:", apiUrl);
      
      // Try to fetch from API
      const response = await fetch(apiUrl);
      
      // Check if response is OK
      if (!response.ok) {
        console.log(`Box score API returned status: ${response.status}`);
        // Don't throw an error, just proceed to the fallback
      } else {
        const data = await response.json();
        console.log("Box Score API Response:", data);
        
        // Ensure the data has the expected structure
        if (!data.innings) {
          console.log("API response missing innings data, using fallback");
          throw new Error("Invalid data structure");
        }
        
        setBoxScore(data);
        setLoading(false);
        return; // Exit early if successful
      }
    } catch (error) {
      // Silently catch the error without logging it
      console.log("Using fallback box score data - API unavailable");
    }
    
    // If we reach here, we need to use fallback data
    console.log("Using fallback box score data while API is being rebuilt");
    
    // Create fallback box score data with guaranteed structure matching the new format
    const fallbackData: BoxScoreData = {
      game_header: {
        user_team: game?.my_team_ha === 'home' ? game?.home_team_name : game?.away_team_name || "Your Team",
        coach: "Coach",
        opponent_name: game?.my_team_ha === 'home' ? game?.away_team_name : game?.home_team_name || "Opponent",
        event_date: game?.event_date || "2023-01-01",
        event_hour: game?.event_hour || 12,
        event_minute: game?.event_minute || 0,
        field_name: "Field",
        field_location: "Location",
        field_type: "Grass",
        field_temperature: 75,
        game_status: "In Progress",
        my_team_ha: game?.my_team_ha || "home",
        game_id: gameId
      },
      innings: {
        "1": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0
          }
        },
        "2": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          }
        },
        "3": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          }
        },
        "4": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          }
        },
        "5": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          }
        },
        "6": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          }
        },
        "7": { 
          home: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          },
          away: { 
            runs: 0, 
            hits: 0, 
            errors: 0, 
            walks: 0, 
            outs: 0, 
            strikeouts: 0,
            strike_percent: 0,
            on_base_percent: 0,
            hard_hit: 0,
            on_first_base: 0,
            on_second_base: 0,
            on_third_base: 0,
            runners_on_base: []
          }
        }
      },
      totals: {
        home: { 
          runs: 0, 
          hits: 0, 
          errors: 0, 
          walks: 0, 
          outs: 0, 
          strikeouts: 0,
          strike_percent: 0,
          on_base_percent: 0,
          hard_hit: 0,
          on_first_base: 0,
          on_second_base: 0,
          on_third_base: 0,
          runners_on_base: []
        },
        away: { 
          runs: 0, 
          hits: 0, 
          errors: 0, 
          walks: 0, 
          outs: 0, 
          strikeouts: 0,
          strike_percent: 0,
          on_base_percent: 0,
          hard_hit: 0,
          on_first_base: 0,
          on_second_base: 0,
          on_third_base: 0,
          runners_on_base: []
        }
      }
    };
    
    setBoxScore(fallbackData);
    setLoading(false);
  };

  const fetchInningDetail = async (inningNumber: string, teamChoice: 'home' | 'away') => {
    try {
      setLoadingInningDetail(true);
      setSelectedInning(inningNumber);
      setSelectedTeam(teamChoice);
      
      // Get my_team_ha from the box score game_header
      const myTeamHA = boxScore?.game_header?.my_team_ha || 'home';
      
      // Log the API request
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${inningNumber}/${teamChoice}/${myTeamHA}`;
      console.log("Fetching inning detail from:", apiUrl);
      
      const response = await fetch(apiUrl);
      
      // Handle 404 specifically as "no data" rather than an error
      if (response.status === 404) {
        setInningDetail({
          team_id: teamId,
          game_id: gameId,
          inning_number: parseInt(inningNumber),
          my_team_ha: myTeamHA,
          lineup_available: false,
          stats: {
            runs: 0,
            hits: 0,
            errors: 0,
            walks: 0,
            outs: 0,
            total_plate_appearances: 0
          },
          lineup_entries: [],
          scorebook_entries: []
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inning details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Log the scorebook data specifically when the Home tab is clicked
      if (teamChoice === 'home') {
        console.log("SCOREBOOK DATA FROM HOME TAB:", data.scorebook_entries || data.scorebook || []);
        
        // Ensure scorebook_entries is an array and has proper structure
        if (data.scorebook_entries && !Array.isArray(data.scorebook_entries)) {
          console.log("Converting scorebook_entries object to array");
          data.scorebook_entries = Object.values(data.scorebook_entries);
        } else if (data.scorebook && !Array.isArray(data.scorebook)) {
          console.log("Converting scorebook object to array");
          data.scorebook_entries = Object.values(data.scorebook);
        }
        
        // Fix empty objects in array fields
        if (Array.isArray(data.scorebook_entries)) {
          data.scorebook_entries.forEach((entry: any) => {
            if (entry.base_running_hit_around && !(entry.base_running_hit_around instanceof Array)) {
              entry.base_running_hit_around = [];
            }
            if (entry.br_error_on && !(entry.br_error_on instanceof Array)) {
              entry.br_error_on = [];
            }
            if (entry.br_stolen_bases && !(entry.br_stolen_bases instanceof Array)) {
              entry.br_stolen_bases = [];
            }
            if (entry.pa_error_on && !(entry.pa_error_on instanceof Array)) {
              entry.pa_error_on = [];
            }
          });
        }
      } else {
        console.log("SCOREBOOK DATA FROM AWAY TAB:", data.scorebook_entries || data.scorebook || []);
        
        // Ensure scorebook_entries is an array and has proper structure
        if (data.scorebook_entries && !Array.isArray(data.scorebook_entries)) {
          console.log("Converting scorebook_entries object to array");
          data.scorebook_entries = Object.values(data.scorebook_entries);
        } else if (data.scorebook && !Array.isArray(data.scorebook)) {
          console.log("Converting scorebook object to array");
          data.scorebook_entries = Object.values(data.scorebook);
        }
        
        // Fix empty objects in array fields
        if (Array.isArray(data.scorebook_entries)) {
          data.scorebook_entries.forEach((entry: any) => {
            if (entry.base_running_hit_around && !(entry.base_running_hit_around instanceof Array)) {
              entry.base_running_hit_around = [];
            }
            if (entry.br_error_on && !(entry.br_error_on instanceof Array)) {
              entry.br_error_on = [];
            }
            if (entry.br_stolen_bases && !(entry.br_stolen_bases instanceof Array)) {
              entry.br_stolen_bases = [];
            }
            if (entry.pa_error_on && !(entry.pa_error_on instanceof Array)) {
              entry.pa_error_on = [];
            }
          });
        }
      }
      
      setInningDetail(data);
    } catch (error) {
      console.error("Error fetching inning detail:", error);
      setInningDetail(null);
    } finally {
      setLoadingInningDetail(false);
    }
  };
  // Update the getPlayerPAs function to properly organize PAs by time through the order
  const getPlayerPAs = (orderNumber: number) => {
    if (!inningDetail?.scorebook_entries) return [];
    // Get all PAs for this player in this inning
    const playerPAs = inningDetail.scorebook_entries
      .filter(entry => entry.order_number === orderNumber)
      .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
    
    return playerPAs;
  };
  // Function to get the maximum number of plate appearances for any player
  const getMaxPAs = () => {
    if (!inningDetail?.scorebook_entries) return 0;
    
    const paCountsByPlayer = new Map<number, number>();
    
    inningDetail.scorebook_entries.forEach(entry => {
      const count = paCountsByPlayer.get(entry.order_number) || 0;
      paCountsByPlayer.set(entry.order_number, count + 1);
    });
    
    return Math.max(...Array.from(paCountsByPlayer.values()), 0);
  };

  // Function to get the current batter index
  const getCurrentBatterIndex = () => {
    if (!inningDetail?.scorebook_entries || inningDetail.scorebook_entries.length === 0) {
      return 0;
    }
    // Get the most recent plate appearance
    const sortedEntries = [...inningDetail.scorebook_entries].sort((a, b) => {
      // Sort by batter_seq_id (descending)
      return (b.batter_seq_id || 0) - (a.batter_seq_id || 0);
    });
    const lastPA = sortedEntries[0];
    // Find the index of this player in the lineup
    const playerIndex = inningDetail.lineup_entries.findIndex(
      player => player.order_number === lastPA.order_number
    );

    return playerIndex >= 0 ? playerIndex : 0;
  };
  // Updated function to get the next batter sequence ID using the round field
  const getNextBatterSeqId = () => {
    if (!inningDetail?.scorebook_entries || inningDetail.scorebook_entries.length === 0) {
      return 1; // First batter in the inning always gets sequence ID 1
    }
    // Get the lineup size
    const lineupSize = inningDetail.lineup_entries.length || 9;
    // Find the highest round in the current inning
    const highestRound = Math.max(...inningDetail.scorebook_entries.map(entry => entry.round || 1));
    // Find the highest order number that has batted in the highest round
    const highestOrderInRound = Math.max(
      ...inningDetail.scorebook_entries
        .filter(entry => entry.round === highestRound)
        .map(entry => entry.order_number)
    );
    // If we've completed the round, start a new round
    if (highestOrderInRound === lineupSize) {
      // Start a new round
      const newRound = highestRound + 1;
      return (newRound - 1) * lineupSize + 1;
    }
    // Otherwise, get the next batter in the current round
    const nextOrder = highestOrderInRound + 1;
    return (highestRound - 1) * lineupSize + nextOrder;
  };
  // Function to get the next batter sequence ID for a specific player
  const getNextBatterSeqIdForPlayer = (orderNumber: number): number => {
    if (!inningDetail?.scorebook_entries) return 1;
    // Get all existing PAs for this player
    const playerPAs = inningDetail.scorebook_entries
      .filter(entry => entry.order_number === orderNumber)
      .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
    // If this player has no PAs yet, we need to calculate their first batter_seq_id
    if (playerPAs.length === 0) {
      // Get the global next batter sequence ID
      return getNextBatterSeqId();
    }
    // Otherwise, this player is batting again, so increment their last batter_seq_id
    // This shouldn't normally happen as each player should only bat once per column
    const lastSeqId = playerPAs[playerPAs.length - 1].batter_seq_id || 0;
    return lastSeqId + inningDetail.lineup_entries.length; // Add lineup size to get to next time through order
  };
  // Function to determine how many PA columns to show
  const getNumberOfPAColumns = () => {
    if (!inningDetail?.scorebook_entries || !inningDetail?.lineup_entries) return 1;
    // Get the number of players in the lineup
    const lineupSize = inningDetail.lineup_entries.length;
    if (inningDetail.scorebook_entries.length === 0) return 1;
    // Find the highest order number in the lineup
    const highestOrderNumber = Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number));
    // Check if the last batter (highest order number) has any PAs
    const lastBatterPAs = inningDetail.scorebook_entries
      .filter(entry => entry.order_number === highestOrderNumber)
      .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
    // If the last batter has no PAs, show only one column
    if (lastBatterPAs.length === 0) return 1;
    // Each complete cycle means the last batter has batted
    return lastBatterPAs.length + 1;
  };
  // Update the table header to include inning groupings
  <thead className="bg-gray-50">
    {/* Add a new row for inning groupings */}
    <tr>
      <th className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30px' }} rowSpan={2}>
        #
      </th>
      <th className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }} rowSpan={2}>
        Player
      </th>
      
      {/* Create inning groupings */}
      {Array.from(new Set(Array.from({ length: getNumberOfPAColumns() }).map((_, i) => {
        // Calculate which inning this column belongs to
        // Assuming 9 batters per inning
        const lineupSize = inningDetail?.lineup_entries.length || 9;
        const inningNumber = Math.floor(i / lineupSize) + 1;
        return inningNumber;
      }))).map((inningNumber) => {
        // Count how many columns belong to this inning
        const lineupSize = inningDetail?.lineup_entries.length || 9;
        const columnsInInning = Math.min(
          lineupSize,
          getNumberOfPAColumns() - (inningNumber - 1) * lineupSize
        );
        
        return (
          <th 
            key={`inning-header-${inningNumber}`}
            className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            colSpan={columnsInInning}
          >
            Inning {inningNumber}
          </th>
        );
      })}
    </tr>
    
    <tr>
      {/* Create column headers for each PA */}
      {Array.from({ length: getNumberOfPAColumns() }).map((_, i) => (
        <th 
          key={`pa-header-${i+1}`}
          className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
          style={{ width: '60px' }}
        >
          PA {i+1}
        </th>
      ))}
    </tr>
  </thead>

  // Update the renderPACell function to remove the pa_why field
  const renderPACell = (playerPAs: ScoreBookEntry[], columnIndex: number, orderNumber: number) => {
    // Find the PA based on the batter_seq_id which corresponds to the sequence in the order
    // Calculate the expected batter_seq_id based on the columnIndex and lineup size
    const lineupSize = inningDetail?.lineup_entries.length || 9;
    const expectedSeqId = (columnIndex * lineupSize) + orderNumber;
    
    // Find the PA with the matching batter_seq_id, if any
    const pa = playerPAs.find(pa => pa.batter_seq_id === expectedSeqId);
    
    return (
      <td key={`pa-${columnIndex}`} className="border p-0 text-xs text-center h-12" style={{ verticalAlign: 'bottom' }}>
        <BaseballDiamondCell 
          pa={pa as any || null}
          onClick={() => {
            if (pa) {
              setSelectedPA(pa);
              setIsPlateAppearanceModalOpen(true);
            } else {
              // For a new PA, we'll use the round (column index + 1) to determine the sequence ID
              const round = columnIndex + 1;
              const lineupSize = inningDetail?.lineup_entries.length || 9;
              
              // The sequence ID is calculated as: (round - 1) * lineupSize + order_number
              const newSeqId = (round - 1) * lineupSize + orderNumber;
              
              // Create a new PA with the required fields
              const newPA = {
                inning_number: selectedInning,
                home_or_away: selectedTeam,
                batting_order_position: orderNumber,
                order_number: orderNumber,
                batter_seq_id: newSeqId,
                round: round,
                team_id: teamId,
                game_id: gameId,
                batter_jersey_number: '',
                batter_name: '',
                bases_reached: '',
                why_base_reached: '',
                pa_result: '',
                result_type: '',
                detailed_result: '',
                base_running: '',
                balls_before_play: 0,
                strikes_before_play: 0,
                strikes_watching: 0,
                strikes_swinging: 0,
                strikes_unsure: 0,
                fouls_after_two_strikes: 0,
                base_running_stolen_base: 0
              } as ScoreBookEntry;
              
              setSelectedPA(newPA);
              setIsPlateAppearanceModalOpen(true);
            }
          }}
          isInteractive={true}
        />
      </td>
    );
  };

  // Function to get the final base result for a player
  const getFinalBase = (playerPAs: ScoreBookEntry[]) => {
    if (!playerPAs || playerPAs.length === 0) return '-';
    
    // Look for the highest base reached
    const baseValues = {
      '4B': 4,
      'HR': 4,
      '3B': 3,
      '2B': 2,
      '1B': 1,
      'BB': 1,
      'E': 1,
      'FC': 1,
      'HBP': 1
    };
    
    let highestBase = 0;
    let highestBaseResult = '-';
    
    playerPAs.forEach(pa => {
      const baseRunning = pa.base_running;
      // Check if this is a base hit or advancement
      Object.entries(baseValues).forEach(([key, value]) => {
        if (baseRunning.includes(key) && value > highestBase) {
          highestBase = value;
          highestBaseResult = key;
        }
      });
    });
    
    return highestBaseResult;
  };

  // Update the handleDeletePA function to use the new API endpoint
  const handleDeletePA = async (paData: {
    team_id: string;
    game_id: string;
    inning_number: number | string;
    home_or_away: string;
    batter_seq_id: number;
  }) => {
    try {
      // Check if we have all required data
      if (!paData.team_id || !paData.game_id || !paData.inning_number || 
          !paData.home_or_away || !paData.batter_seq_id) {
        return;
      }
      
      // Construct the URL with the new path parameters
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance/${
        paData.team_id}/${paData.game_id}/${paData.inning_number}/${
        paData.home_or_away}/${paData.batter_seq_id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Close the modal first
      setIsPlateAppearanceModalOpen(false);
      setSelectedPA(null);
      
      // Then refresh the inning data to show updated changes
      // Use setTimeout to ensure the state updates before fetching
      setTimeout(async () => {
        await fetchInningDetail(selectedInning, selectedTeam);
      }, 100);
    } catch (error) {
      // Only show alert for errors
      alert("Failed to delete plate appearance. Please try again.");
    }
  };

  // Update the handleSavePAChanges function to call the calculate-score endpoint
  const handleSavePAChanges = async (updatedPA: ScoreBookEntry) => {
    try {
      console.log("Saving plate appearance:", updatedPA);
      
      // Store the current selected team to maintain it after refresh
      const currentTeam = selectedTeam;
      const currentInning = selectedInning;
      
      // First, save the plate appearance
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedPA),
        }
      );
      
      if (!response.ok) throw new Error("Failed to update plate appearance");
      
      // Log the parameters being sent to calculate-score endpoint
      const calculateScoreParams = {
        teamId,
        gameId,
        inningNumber: currentInning,
        teamChoice: currentTeam
      };
      console.log("Calling calculate-score with parameters:", calculateScoreParams);
      
      // After successful save, call the calculate-score endpoint
      const calculateScoreUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`;
      console.log("Calculate score URL:", calculateScoreUrl);
      
      const calculateScoreResponse = await fetch(calculateScoreUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!calculateScoreResponse.ok) {
        console.log(`Warning: Failed to recalculate score: ${calculateScoreResponse.status}`);
        console.log("Response text:", await calculateScoreResponse.text().catch(() => "Unable to get response text"));
      } else {
        console.log("Score recalculated successfully");
        try {
          const scoreData = await calculateScoreResponse.json();
          console.log("Recalculated score data:", scoreData);
        } catch (e) {
          console.log("No JSON response from calculate-score endpoint");
        }
      }
      
      // Refresh the box score data
      await fetchBoxScore();
      
      // Refresh the inning data to show updated changes - use the stored team value
      await fetchInningDetail(currentInning, currentTeam);
      
    } catch (error) {
      console.error("Error saving plate appearance:", error);
      alert("Failed to update plate appearance. Please try again.");
    }
  };

  // Update the handleSaveSubstitution function to remove the alert
  const handleSaveSubstitution = async (substitution: PlayerSubstitution) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${selectedInning}/substitute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(substitution),
        }
      );
      
      if (!response.ok) throw new Error("Failed to save substitution");
      
      // Refresh the inning data to show updated changes
      await fetchInningDetail(selectedInning, selectedTeam);
      
      // Close the modal without an alert
      setIsSubstitutionModalOpen(false);
    } catch (error) {
      // Only show alert for errors
      alert("Failed to save substitution. Please try again.");
    }
  };

  // Helper function to update legacy fields
  const updateLegacyFields = (basesReached: string, whyBaseReached: string) => {
    // This function relies on handleInputChange which is not defined in this scope
    // It should be implemented in the PlateAppearanceModal component instead
  };

  const openPlateAppearanceModal = (pa: ScoreBookEntry) => {
    setSelectedPA(pa);
    setIsPlateAppearanceModalOpen(true);
  };

  // When adding a new plate appearance, check if we've reached the end of the lineup
  const handleAddPlateAppearance = () => {
    // Get the current batter index
    const currentBatterIndex = getCurrentBatterIndex();
    
    // Get the total number of batters in the lineup
    const totalBatters = inningDetail?.lineup_entries.length || 0;
    
    // If we're at the last batter, cycle back to the first batter
    const nextBatterIndex = currentBatterIndex === totalBatters - 1 
      ? 0  // Go back to the first batter
      : currentBatterIndex + 1;  // Go to the next batter
    
    // Set the next batter as active
    const nextBatter = inningDetail?.lineup_entries[nextBatterIndex];
    
    if (nextBatter) {
      setSelectedPA(null);
      setIsPlateAppearanceModalOpen(true);
    }
  };

  // Debug function to log the current batter sequence IDs
  const logBatterSequenceIds = () => {
    if (!inningDetail?.scorebook_entries) return;
    
    const sortedEntries = [...inningDetail.scorebook_entries].sort(
      (a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0)
    );
    
    sortedEntries.forEach(entry => {
    });
  };

  // Call this in useEffect after fetching inning details
  useEffect(() => {
    if (inningDetail) {
      logBatterSequenceIds();
    }
  }, [inningDetail]);

  if (loading) return <div className="p-4">Loading game data...</div>;
  if (!boxScore) return <div className="p-4">No box score data available.</div>;

  return (
    <div className="container mx-auto px-1.5 py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Box Score</h1>
          {boxScore && (
            <div className="text-xs text-gray-500 mt-1">
              {boxScore.game_header.event_date} {boxScore.game_header.event_hour}:{boxScore.game_header.event_minute < 10 ? '0' + boxScore.game_header.event_minute : boxScore.game_header.event_minute}
              {boxScore.game_header.field_name && (
                <span className="ml-2">| {boxScore.game_header.field_name}, {boxScore.game_header.field_location}</span>
              )}
              {boxScore.game_header.field_temperature && (
                <span className="ml-2">| {boxScore.game_header.field_temperature}°F</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/score-game/${teamId}/lineup/${gameId}`)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
          >
            Back to Lineup
          </button>
          
          <button
            onClick={() => fetchBoxScore()}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Box Score Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6 w-auto" style={{ width: 'auto', maxWidth: '920px' }}>
        <div className="overflow-x-auto">
          <div style={{ width: 'fit-content', margin: '0' }}>
            <table className="border-collapse" cellSpacing="0" cellPadding="0" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ width: '120px', minWidth: '120px' }}>Team</th>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th 
                      key={`inning-header-${i}`}
                      className={`p-0 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-t border-b border-l ${i === 6 ? 'border-r' : ''} border-gray-200`}
                      style={{ width: '4.4rem' }}
                      onClick={() => fetchInningDetail((i + 1).toString(), selectedTeam)}
                    >
                      <div className="p-2">{i + 1}</div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-l-2 border-gray-300 font-bold" style={{ width: '3.5rem' }}>
                    <span className="hidden sm:inline">Runs</span>
                    <span className="inline sm:hidden">R</span>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l-2 border-gray-300 font-bold" style={{ width: '3.5rem' }}>
                    <span className="hidden sm:inline">Hits</span>
                    <span className="inline sm:hidden">H</span>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-bold" style={{ width: '3.5rem' }}>
                    <span className="hidden sm:inline">Errors</span>
                    <span className="inline sm:hidden">E</span>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-bold" style={{ width: '3.5rem' }}>
                    <span className="hidden sm:inline">Walks</span>
                    <span className="inline sm:hidden">BB</span>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-bold" style={{ width: '3.5rem' }}>
                    <span className="hidden sm:inline">K&apos;s</span>
                    <span className="inline sm:hidden">K</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Away Team Row */}
                <tr className={boxScore.totals.away.runs > boxScore.totals.home.runs ? "bg-indigo-50" : ""}>
                  <td 
                    className="px-3 py-2 whitespace-nowrap text-left text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                    onClick={() => fetchInningDetail(selectedInning, 'away')}
                    style={{ width: '120px', minWidth: '120px' }}
                  >
                    <span className="block truncate max-w-[110px] text-left">
                      {boxScore.game_header.my_team_ha === 'away' ? 'My Team' : boxScore.game_header.opponent_name}
                    </span>
                  </td>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const inningKey = (i + 1).toString();
                    const inningData = boxScore.innings && boxScore.innings[inningKey]?.away || { 
                      runs: 0, hits: 0, errors: 0, walks: 0, outs: 0, strikeouts: 0, 
                      strike_percent: 0, on_base_percent: 0, hard_hit: 0,
                      on_first_base: 0, on_second_base: 0, on_third_base: 0
                    };
                    
                    // Set runners data based on on_first_base, on_second_base, on_third_base fields
                    const runnersData = {
                      runner_on_first: inningData.on_first_base > 0,
                      runner_on_second: inningData.on_second_base > 0,
                      runner_on_third: inningData.on_third_base > 0,
                    };
                    
                    return (
                      <td 
                        key={`away-inning-${i}`}
                        className="p-0 align-top"
                        style={{ padding: 0, borderSpacing: 0, width: '4.4rem' }}
                      >
                        <BoxScoreInningCell 
                          inningData={inningData} 
                          onClick={() => fetchInningDetail(inningKey, 'away')}
                          isActive={selectedInning === inningKey && selectedTeam === 'away'}
                          inningNumber={inningKey}
                          teamType="away"
                          runnersData={runnersData}
                          isLastInning={i === 6}
                        />
                      </td>
                    );
                  })}
                  <td className={`px-2 py-4 whitespace-nowrap text-center text-sm font-medium border-l-2 border-gray-300 font-bold ${boxScore.totals.away.runs > boxScore.totals.home.runs ? 'text-indigo-600 text-lg font-extrabold' : 'text-black'}`}>
                    {boxScore.totals.away.runs > boxScore.totals.home.runs ? (
                      <div className="relative inline-flex items-center justify-center">
                        <div className="absolute w-8 h-8 rounded-full border-2 border-indigo-600 animate-[pulse_6s_ease-in-out_infinite]"></div>
                        <span>{boxScore.totals.away.runs}</span>
                      </div>
                    ) : (
                      boxScore.totals.away.runs
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm border-l-2 border-gray-300">
                    <span className={boxScore.totals.away.hits === 0 ? "text-gray-500" : "text-indigo-600"}>
                      {boxScore.totals.away.hits}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                    <span className={boxScore.totals.away.errors === 0 ? "text-gray-500" : "text-red-600"}>
                      {boxScore.totals.away.errors}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                    <span className={boxScore.totals.away.walks === 0 ? "text-gray-500" : "text-indigo-600"}>
                      {boxScore.totals.away.walks}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                    <span className={boxScore.totals.away.strikeouts === 0 ? "text-gray-500" : "text-indigo-600"}>
                      {boxScore.totals.away.strikeouts || 0}
                    </span>
                  </td>
                </tr>
                
                {/* Home Team Row */}
                <tr className={boxScore.totals.home.runs > boxScore.totals.away.runs ? "bg-indigo-50" : ""}>
                  <td 
                    className="px-3 py-4 whitespace-nowrap text-left text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                    onClick={() => fetchInningDetail(selectedInning, 'home')}
                    style={{ width: '120px', minWidth: '120px' }}
                  >
                    <span className="block truncate max-w-[110px] text-left">
                      {boxScore.game_header.my_team_ha === 'home' ? 'My Team' : boxScore.game_header.opponent_name}
                    </span>
                  </td>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const inningKey = (i + 1).toString();
                    const inningData = boxScore.innings && boxScore.innings[inningKey]?.home || { 
                      runs: 0, hits: 0, errors: 0, walks: 0, outs: 0, strikeouts: 0, 
                      strike_percent: 0, on_base_percent: 0, hard_hit: 0,
                      on_first_base: 0, on_second_base: 0, on_third_base: 0
                    };
                    
                    // Set runners data based on on_first_base, on_second_base, on_third_base fields
                    const runnersData = {
                      runner_on_first: inningData.on_first_base > 0,
                      runner_on_second: inningData.on_second_base > 0,
                      runner_on_third: inningData.on_third_base > 0,
                    };
                    
                    return (
                      <td 
                        key={`home-inning-${i}`}
                        className="p-0 align-top"
                        style={{ padding: 0, borderSpacing: 0, width: '4.4rem' }}
                      >
                        <BoxScoreInningCell 
                          inningData={inningData} 
                          onClick={() => fetchInningDetail(inningKey, 'home')}
                          isActive={selectedInning === inningKey && selectedTeam === 'home'}
                          inningNumber={inningKey}
                          teamType="home"
                          runnersData={runnersData}
                          isLastInning={i === 6}
                        />
                      </td>
                    );
                  })}
                  <td className={`px-2 py-4 whitespace-nowrap text-center text-sm font-medium border-l-2 border-gray-300 font-bold ${boxScore.totals.home.runs > boxScore.totals.away.runs ? 'text-indigo-600 text-lg font-extrabold' : 'text-black'}`}>
                    {boxScore.totals.home.runs > boxScore.totals.away.runs ? (
                      <div className="relative inline-flex items-center justify-center">
                        <div className="absolute w-8 h-8 rounded-full border-2 border-indigo-600 animate-[pulse_6s_ease-in-out_infinite]"></div>
                        <span>{boxScore.totals.home.runs}</span>
                      </div>
                    ) : (
                      boxScore.totals.home.runs
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm border-l-2 border-gray-300">
                    <span className={boxScore.totals.home.hits === 0 ? "text-gray-500" : "text-indigo-600"}>
                      {boxScore.totals.home.hits}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                    <span className={boxScore.totals.home.errors === 0 ? "text-gray-500" : "text-red-600"}>
                      {boxScore.totals.home.errors}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                    <span className={boxScore.totals.home.walks === 0 ? "text-gray-500" : "text-indigo-600"}>
                      {boxScore.totals.home.walks}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center text-sm">
                    <span className={boxScore.totals.home.strikeouts === 0 ? "text-gray-500" : "text-indigo-600"}>
                      {boxScore.totals.home.strikeouts || 0}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Inning Details Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-0 bg-gray-50 border-b flex items-center" style={{ height: '56px' }}>
          {/* Team Tabs - Styled as true tabs */}
          <div className="flex h-full">
            <button
              onClick={() => fetchInningDetail(selectedInning, 'away')}
              className={`px-8 py-4 text-sm font-medium h-full flex items-center justify-center ${
                selectedTeam === 'away'
                  ? 'bg-white text-indigo-700 border-t-2 border-indigo-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex flex-col items-center">
                <span className="text-xs font-normal text-gray-500 mb-1">Away</span>
                <span>{boxScore.game_header.my_team_ha === 'away' ? 'My Team' : boxScore.game_header.opponent_name}</span>
              </span>
            </button>
            <button
              onClick={() => fetchInningDetail(selectedInning, 'home')}
              className={`px-8 py-4 text-sm font-medium h-full flex items-center justify-center ${
                selectedTeam === 'home'
                  ? 'bg-white text-indigo-700 border-t-2 border-indigo-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex flex-col items-center">
                <span className="text-xs font-normal text-gray-500 mb-1">Home</span>
                <span>{boxScore.game_header.my_team_ha === 'home' ? 'My Team' : boxScore.game_header.opponent_name}</span>
              </span>
            </button>
          </div>
          
          {/* Inning selector - Moved to the right */}
          <div className="flex items-center ml-auto mr-4">
            <span className="text-sm font-medium text-gray-700 mr-2">Inning:</span>
            <select 
              className="border rounded px-2 py-1 text-sm"
              value={selectedInning}
              onChange={(e) => fetchInningDetail(e.target.value, selectedTeam)}
            >
              {Array.from({ length: 7 }).map((_, i) => (
                <option key={`inning-option-${i+1}`} value={(i+1).toString()}>
                  {i+1}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="p-4">
          {loadingInningDetail ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : inningDetail ? (
            <div>
              {inningDetail.lineup_entries && inningDetail.lineup_entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="border border-gray-200" style={{ width: 'auto' }}>
                    <thead className="bg-gray-50">
                      {/* Add a new row for inning groupings */}
                      <tr>
                        <th className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30px' }} rowSpan={2}>
                          #
                        </th>
                        <th className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }} rowSpan={2}>
                          Player
                        </th>
                        
                        {/* Create inning groupings */}
                        {Array.from(new Set(Array.from({ length: getNumberOfPAColumns() }).map((_, i) => {
                          // Calculate which inning this column belongs to
                          // Assuming 9 batters per inning
                          const lineupSize = inningDetail?.lineup_entries.length || 9;
                          const inningNumber = Math.floor(i / lineupSize) + 1;
                          return inningNumber;
                        }))).map((inningNumber) => {
                          // Count how many columns belong to this inning
                          const lineupSize = inningDetail?.lineup_entries.length || 9;
                          const columnsInInning = Math.min(
                            lineupSize,
                            getNumberOfPAColumns() - (inningNumber - 1) * lineupSize
                          );
                          
                          return (
                            <th 
                              key={`inning-header-${inningNumber}`}
                              className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                              colSpan={columnsInInning}
                            >
                              Inning {inningNumber}
                            </th>
                          );
                        })}
                      </tr>
                      
                      <tr>
                        {/* Create column headers for each PA */}
                        {Array.from({ length: getNumberOfPAColumns() }).map((_, i) => (
                          <th 
                            key={`pa-header-${i+1}`}
                            className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: '60px' }}
                          >
                            PA {i+1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inningDetail.lineup_entries.map((player, index) => {
                        // Get all PAs for this player, sorted by batter_seq_id
                        const playerPAs = getPlayerPAs(player.order_number);
                        const displayName = player.name.includes(player.jersey_number) 
                          ? player.name 
                          : `${player.jersey_number} ${player.name}`;
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border p-1 text-xs text-gray-500 truncate text-center">
                              {player.order_number}
                            </td>
                            <td className="border p-1 text-xs font-medium text-gray-900 truncate text-center">
                              <div className="flex justify-center items-center">
                                <span>{displayName}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubstitutingOrderNumber(player.order_number);
                                    setIsSubstitutionModalOpen(true);
                                  }}
                                  className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                                  title="Substitute Player"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            
                            {/* Render PA cells for this player by column index */}
                            {Array.from({ length: getNumberOfPAColumns() }).map((_, i) => {
                              return renderPACell(playerPAs, i, player.order_number);
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded">
                  No lineup available for this inning.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No data available for this inning.
            </div>
          )}
        </div>
      </div>
      
      {/* Substitution Modal */}
      <SubstitutionModal
        isOpen={isSubstitutionModalOpen}
        onClose={() => {
          setIsSubstitutionModalOpen(false);
          setSubstitutingOrderNumber(null);
        }}
        onSave={handleSaveSubstitution}
        inningNumber={selectedInning}
        teamId={teamId}
        gameId={gameId}
        currentLineup={inningDetail?.lineup_entries || []}
        orderNumber={substitutingOrderNumber || 0}
      />
      
      {/* Plate Appearance Modal */}
      <PlateAppearanceModal
        pa={selectedPA as any}
        isOpen={isPlateAppearanceModalOpen}
        onClose={(teamSide?: 'home' | 'away') => {
          setIsPlateAppearanceModalOpen(false);
          setSelectedPA(null);
          // If a teamSide is provided, use it to set the selectedTeam state
          if (teamSide) {
            setSelectedTeam(teamSide);
          }
        }}
        onSave={handleSavePAChanges as any}
        onDelete={handleDeletePA as any}
        teamId={teamId}
        gameId={gameId}
        inningNumber={parseInt(selectedInning)}
        homeOrAway={selectedTeam}
        nextBatterSeqId={getNextBatterSeqId()}
        myTeamHomeOrAway={boxScore?.game_header?.my_team_ha || 'home'}
        inningDetail={inningDetail as any}
      />
      
      {/* Debug Toggle Button */}
      <button 
        onClick={() => setDebugMode(!debugMode)} 
        className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-700"
      >
        {debugMode ? 'Disable Debug' : 'Enable Debug'}
      </button>
    </div>
  );
} 