'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import PlateAppearanceModal from '@/app/components/PlateAppearanceModal';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import BoxScoreInningCell from '@/app/components/BoxScoreInningCell';
import ScoreCardGrid from '@/app/components/ScoreCardGrid';
import { ScoreBookEntry as TypedScoreBookEntry } from '@/app/types/scoreTypes';

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
  pa_result: string;         // New field - will be computed from bases_reached and why_base_reached
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
  error_on?: string | string[];
  passed_ball?: number;
  wild_pitch?: number;
  round: number; // this field maps to pa_round in the API response
  br_result?: number;         // Base running result - how far the runner advanced
  base_running_hit_around?: number[] | null;
  br_stolen_bases?: number[] | null;
  pa_error_on?: string[] | null;
  br_error_on?: string[] | null;
  fouls?: number;             // Add fouls field
  pitch_count?: number;       // Add pitch_count field
  ball_swinging?: number;     // Add ball_swinging field
  late_swings?: number;       // Add late_swings field
  rbi?: number;               // Add rbi field
  qab?: number;               // Add qab (quality at bat) field
  hard_hit?: number;          // Add hard_hit field
  slap?: number;              // Add slap field
  sac?: number;               // Add sac (sacrifice) field
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
  paEditEndpoint?: string;
}

// Add a debounce utility for tab clicks
const teamTabDebounce = {
  lastClickTime: 0,
  isProcessing: false,
  
  // Function to check if we should process this click
  shouldProcessClick() {
    const now = Date.now();
    
    // If we're already processing, block
    if (this.isProcessing) return false;
    
    // If it's been less than 500ms since the last click, block
    if (now - this.lastClickTime < 500) return false;
    
    // Otherwise allow processing
    this.lastClickTime = now;
    this.isProcessing = true;
    return true;
  },
  
  // Reset processing state when done
  finishProcessing() {
    this.isProcessing = false;
  }
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
  const [loadingInningDetail, setLoadingInningDetail] = useState(true);
  const [selectedPA, setSelectedPA] = useState<ScoreBookEntry | null>(null);
  const [isPlateAppearanceModalOpen, setIsPlateAppearanceModalOpen] = useState(false);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [isPostSaveRefresh, setIsPostSaveRefresh] = useState(false);
  
  // Add a ref to track the last inning and team we fetched
  const lastFetchedRef = useRef<{ inning: string; team: 'home' | 'away'; hasCompletedInitialFetch: boolean } | null>(null);
  
  // Add a ref to track if the initial data has been loaded
  const initialDataLoadedRef = useRef(false);
  
  // Clear all caches on component mount
  useEffect(() => {
    // Clear localStorage
    try {
      // Remove all lineup cache keys
      localStorage.removeItem('loadedLineups');
      
      // Look for any keys with lineup in the name
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('lineup') || key.includes('batting'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      // Silent error handling for localStorage clearing
    }
    
    // Clear sessionStorage
    try {
      // Clear all lineup-related items
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('lineup') || 
            key.includes('batting') || 
            key.startsWith('lineup_loaded_') || 
            key.startsWith('scorecard_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Silent error handling for sessionStorage clearing
    }
  }, []);
  
  const handleBackToLineup = () => {
    // Set sessionStorage flag to trigger player roster refresh
    sessionStorage.setItem('refreshRoster', 'true');
    router.push(`/score-game/${teamId}/lineup/${gameId}`);
  };
  
  useEffect(() => {
    if (teamId && gameId && teamId !== 'undefined' && gameId !== 'undefined') {
      // Initialize data
      const initializeData = async () => {
        // Load game details and box score
        await Promise.all([
          fetchGameDetails(),
          fetchBoxScore()
        ]);
      };
      
      initializeData();
    } else {
      console.error("Invalid teamId or gameId", { teamId, gameId });
      setLoading(false);
    }
  }, [teamId, gameId]);

  // When component mounts or when box score is loaded, fetch the first inning details
  useEffect(() => {
    if (!initialDataLoadedRef.current && boxScore && !loadingInningDetail) {
      fetchInningDetail('1', 'away');
      initialDataLoadedRef.current = true;
    }
  }, [boxScore, loadingInningDetail]);
  
  // On component mount, ensure we fetch initial data regardless of box score
  useEffect(() => {
    // Force a data load after a delay if it hasn't happened yet
    const timer = setTimeout(() => {
      if (!initialDataLoadedRef.current) {
        fetchInningDetail('1', 'away');
        initialDataLoadedRef.current = true;
      }
    }, 1000); // 1 second delay
    
    return () => clearTimeout(timer);
  }, []);

  const fetchGameDetails = async () => {
    try {
      if (!teamId || !gameId || teamId === 'undefined' || gameId === 'undefined') {
        // Skip if invalid parameters
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}/get_one_game`);
      if (!response.ok) throw new Error("Failed to fetch game details");
      const data = await response.json();
      
      if (data && data.game_data) {
        setGame(data.game_data);
      } else {
        throw new Error("No game details found");
      }
    } catch (error) {
      alert("Failed to load game details. Please try again later.");
    }
  };

  const fetchBoxScore = async () => {
    try {
      if (!teamId || !gameId || teamId === 'undefined' || gameId === 'undefined') {
        console.error("Invalid parameters for fetchBoxScore", { teamId, gameId });
        setLoading(false);
        return;
      }
      
      // Log the API request
      let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/summary`;
      
      // Add parameter to prevent lineup calls
      apiUrl += `?no_lineup=true`;
      
      // Try to fetch from API
      const response = await fetch(apiUrl);
      
      // Check if response is OK
      if (!response.ok) {
        // Don't throw an error, just proceed to the fallback
      } else {
        const data = await response.json();
        
        // Ensure the data has the expected structure
        if (!data.innings) {
          throw new Error("Invalid data structure");
        }
        
        setBoxScore(data);
        setLoading(false);
        return; // Exit early if successful
      }
    } catch (error) {
      // Silently catch the error without logging it
    }
    
    // If we reach here, we need to use fallback data
    
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
        // include the rest of the innings data
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
      if (!teamId || !gameId || teamId === 'undefined' || gameId === 'undefined') {
        // Skip if invalid parameters
        setLoadingInningDetail(false);
        return;
      }
      
      // Only skip if it's explicitly a duplicate request with the exact same parameters
      // AND it's not the first load (inningDetail is not null)
      // AND it's not a post-save refresh
      const isExactDuplicate = 
        !isPostSaveRefresh && 
        inningDetail !== null &&
        lastFetchedRef.current && 
        lastFetchedRef.current.inning === inningNumber && 
        lastFetchedRef.current.team === teamChoice;
      
      // Skip duplicate requests
      if (isExactDuplicate) {
        return;
      }
      
      // Update the lastFetchedRef
      lastFetchedRef.current = { 
        inning: inningNumber, 
        team: teamChoice,
        hasCompletedInitialFetch: true 
      };
      
      setLoadingInningDetail(true);
      setSelectedInning(inningNumber);
      setSelectedTeam(teamChoice);
      
      // Base API URL
      let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${teamChoice}/${inningNumber}/scorecardgrid_paonly_inningonly`;
      
      // Add no_lineup parameter to prevent server-side lineup calls
      apiUrl += `?no_lineup=true`;
      
      // Make the fetch request with no-cache headers
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        // Handle failed fetch silently
        setLoadingInningDetail(false);
        return;
      }
      
      // Parse the new data structure
      const data = await response.json();
      
      // Log the data showing the key parameters we're using
      console.log(`Plate Appearance Data - inning_number: ${inningNumber}, team_choice: ${teamChoice}, game_id: ${gameId}, team_id: ${teamId}`);
      
      // Log the full API response as formatted JSON
      console.log(`API Response for ${teamChoice} team, inning ${inningNumber}:`, JSON.stringify(data, null, 2));
      
      // Store the raw API data
      setRawApiData(data);
      
      // Transform plate appearances from the new nested structure to the flat structure expected by inningDetail
      const transformedEntries: ScoreBookEntry[] = [];
      
      if (data.plate_appearances) {
        // Iterate through innings
        Object.keys(data.plate_appearances).forEach(inningKey => {
          const inning = data.plate_appearances[inningKey];
          
          // Iterate through rounds for this inning
          if (inning?.rounds) {
            Object.keys(inning.rounds).forEach(orderKey => {
              const paData = inning.rounds[orderKey];
              
              if (paData?.details) {
                const details = paData.details;
                
                // Create a ScoreBookEntry from the details
                const entry: ScoreBookEntry = {
                  order_number: paData.order_number,
                  batter_jersey_number: "", // Will be filled from lineup data
                  batter_name: "", // Will be filled from lineup data
                  batter_seq_id: parseInt(details.batter_seq_id.toString()),
                  
                  // Result fields
                  bases_reached: details.pa_result.toString(),
                  why_base_reached: details.pa_why,
                  pa_result: details.pa_result.toString(),
                  result_type: "", // Will be computed from why_base_reached
                  detailed_result: details.hit_to.toString(),
                  
                  // Base running
                  base_running: "",
                  base_running_stolen_base: 0,
                  
                  // Pitch count details - ensure these are all properly parsed as numbers
                  balls_before_play: parseInt(details.balls_before_play.toString()),
                  strikes_before_play: parseInt(details.strikes_before_play.toString()),
                  strikes_watching: parseInt(details.strikes_watching?.toString() || '0'),
                  strikes_swinging: parseInt(details.strikes_swinging?.toString() || '0'),
                  strikes_unsure: parseInt(details.strikes_unsure?.toString() || '0'),
                  fouls_after_two_strikes: parseInt(details.fouls_after_two_strikes?.toString() || '0'),
                  
                  // CRITICAL: Explicitly include pitch_count and fouls
                  pitch_count: parseInt(details.pitch_count?.toString() || '0'),
                  fouls: parseInt(details.fouls?.toString() || '0'),
                  ball_swinging: parseInt(details.ball_swinging?.toString() || '0'),
                  
                  // Quality indicators and special stats
                  wild_pitch: parseInt(details.wild_pitch?.toString() || '0'),
                  passed_ball: parseInt(details.passed_ball?.toString() || '0'),
                  
                  // Additional quality indicators
                  late_swings: parseInt(details.late_swings?.toString() || '0'),
                  rbi: parseInt(details.rbi?.toString() || '0'),
                  qab: parseInt(details.qab?.toString() || '0'),
                  hard_hit: parseInt(details.hard_hit?.toString() || '0'),
                  
                  // Add explicit parsing for slap and sac fields
                  slap: parseInt(details.slap?.toString() || '0'),
                  sac: parseInt(details.sac?.toString() || '0'),
                  
                  // Error information - pass as a string or first element of array for ScoreCardGrid compatibility
                  error_on: details.pa_error_on?.length ? details.pa_error_on[0].toString() : undefined,
                  
                  // For PA round - CRITICAL: Ensure this is properly set from pa_round
                  // Explicitly parse pa_round as a number
                  round: details.pa_round !== undefined ? parseInt(details.pa_round.toString()) : 1,
                  
                  // Add br_result explicitly
                  br_result: details.br_result !== undefined ? parseInt(details.br_result.toString()) : undefined,
                  
                  // Store array fields for PlateAppearanceModal
                  // These fields aren't expected by ScoreCardGrid but are needed by PlateAppearanceModal
                  base_running_hit_around: details.base_running_hit_around || [],
                  br_stolen_bases: details.br_stolen_bases || [],
                  pa_error_on: details.pa_error_on || [],
                  br_error_on: details.br_error_on || [],
                };
                
                transformedEntries.push(entry);
              }
            });
          }
        });
      }
      
      // Create a new inningDetail object with the transformed data
      const newInningDetail: InningDetail = {
        team_id: teamId || "",
        game_id: gameId || "",
        inning_number: parseInt(inningNumber),
        my_team_ha: inningDetail?.my_team_ha || "home",
        lineup_available: inningDetail?.lineup_available ?? false,
        stats: {
          runs: inningDetail?.stats?.runs || 0,
          hits: inningDetail?.stats?.hits || 0,
          errors: inningDetail?.stats?.errors || 0,
          walks: inningDetail?.stats?.walks || 0,
          outs: inningDetail?.stats?.outs || 0,
          total_plate_appearances: inningDetail?.stats?.total_plate_appearances || 0
        },
        lineup_entries: inningDetail?.lineup_entries || [],
        scorebook_entries: transformedEntries
      };
      
      // Store plate appearance availability in component state
      const isPAAvailable = data.pa_available === "yes";
      
      setInningDetail(newInningDetail);
      setLoadingInningDetail(false);
      
      // After setting inning detail, force a refresh of BaseballField components
      if (isPostSaveRefresh) {
        // Use a slight delay to ensure state is updated first
        setTimeout(() => {
          forceBaseballFieldRefresh();
        }, 100);
      }
      
    } catch (error) {
      console.error("Error fetching inning detail:", error);
      setLoadingInningDetail(false);
    }
  };

  // Add a function to force BaseballField components to refresh
  const forceBaseballFieldRefresh = () => {
    try {
      // Find all BaseballField components and trigger a re-render
      const baseballFields = document.querySelectorAll('[data-component="BaseballField"]');
      
      if (baseballFields.length > 0) {
        // Modify a property to force React to re-render the components
        baseballFields.forEach(field => {
          // Add a temporary class then remove it to force a re-render
          field.classList.add('force-refresh');
          setTimeout(() => field.classList.remove('force-refresh'), 10);
        });
      }
    } catch (error) {
      // Silent error handling
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
    
    if (!inningDetail.lineup_entries || !Array.isArray(inningDetail.lineup_entries)) {
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
    
    // Get the lineup size dynamically - use the max order number or default to 9
    const lineupSize = inningDetail.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
      ? Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number), 0)
      : 9;
    
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
    
    // Make sure lineup_entries exists and is an array
    const lineupSize = (inningDetail.lineup_entries && Array.isArray(inningDetail.lineup_entries)) 
      ? inningDetail.lineup_entries.length 
      : 9;
      
    // If this player has no PAs yet, we need to calculate their first batter_seq_id
    if (playerPAs.length === 0) {
      // Get the global next batter sequence ID
      return getNextBatterSeqId();
    }
    // Otherwise, this player is batting again, so increment their last batter_seq_id
    // This shouldn't normally happen as each player should only bat once per column
    const lastSeqId = playerPAs[playerPAs.length - 1].batter_seq_id || 0;
    return lastSeqId + lineupSize; // Add lineup size to get to next time through order
  };

  // Function to determine how many PA columns to show
  const getNumberOfPAColumns = () => {
    if (!inningDetail?.scorebook_entries || !inningDetail?.lineup_entries) return 1;
    
    // Check that lineup_entries is actually an array
    if (!Array.isArray(inningDetail.lineup_entries)) return 1;
    
    // Get the number of players in the lineup - use max order number
    const lineupSize = Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number));
    if (inningDetail.scorebook_entries.length === 0) return 1;
    
    // Find the highest order number in the lineup
    const highestOrderNumber = lineupSize;
    
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
          key={`diamond-${selectedTeam}-${selectedInning}-${orderNumber}-${columnIndex}-${pa?.slap || 0}-${pa?.sac || 0}-${pa?.qab || 0}-${pa?.hard_hit || 0}-${Date.now()}`}
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
              const newPA: ScoreBookEntry = {
                inning_number: parseInt(selectedInning),
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
                base_running_stolen_base: 0,
                pitch_count: 0, // Add this required field
                // Initialize array fields
                base_running_hit_around: [],
                br_stolen_bases: [],
                pa_error_on: [],
                br_error_on: [],
                fouls: 0,
                ball_swinging: 0,
                slap: 0,
                sac: 0
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

  // Update the handleDeletePA function to use the new API endpoint and the same refresh mechanism as save
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
      
      // Store the current selected team to maintain it after refresh
      const currentTeam = selectedTeam;
      const currentInning = selectedInning;
      
      // Set the flag to indicate we're going to be refreshing
      setIsPostSaveRefresh(true);
      
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
      
      // Call calculate-score endpoint
      const calculateScoreUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`;
      await fetch(calculateScoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Force a clear refresh of all data
      const refreshInning = async () => {
        try {
          // Clear existing inning data to force a complete refresh
          setInningDetail(null);
          setLoadingInningDetail(true);
          
          // IMPORTANT: Preserve the selected team - do not default back to 'away'
          // Store it before any async operations
          const teamToRestore = currentTeam;
          const inningToRestore = currentInning;
          
          // Make a direct API call with cache disabled
          const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${teamToRestore}/${inningToRestore}/scorecardgrid_paonly_inningonly?no_lineup=true&t=${Date.now()}`;
          
          const response = await fetch(apiUrl, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to refresh inning data: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Reset the rawApiData
          setRawApiData(data);
          
          // Process the data as in fetchInningDetail
          const transformedEntries: ScoreBookEntry[] = [];
          
          if (data.plate_appearances) {
            Object.keys(data.plate_appearances).forEach(inningKey => {
              const inning = data.plate_appearances[inningKey];
              if (inning?.rounds) {
                Object.keys(inning.rounds).forEach(orderKey => {
                  const paData = inning.rounds[orderKey];
                  if (paData?.details) {
                    const details = paData.details;
                    const entry: ScoreBookEntry = {
                      order_number: paData.order_number,
                      batter_jersey_number: "",
                      batter_name: "",
                      batter_seq_id: parseInt(details.batter_seq_id.toString()),
                      bases_reached: details.pa_result.toString(),
                      why_base_reached: details.pa_why,
                      pa_result: details.pa_result.toString(),
                      result_type: "",
                      detailed_result: details.hit_to.toString(),
                      base_running: "",
                      base_running_stolen_base: 0,
                      balls_before_play: parseInt(details.balls_before_play.toString()),
                      strikes_before_play: parseInt(details.strikes_before_play.toString()),
                      strikes_watching: parseInt(details.strikes_watching?.toString() || '0'),
                      strikes_swinging: parseInt(details.strikes_swinging?.toString() || '0'),
                      strikes_unsure: parseInt(details.strikes_unsure?.toString() || '0'),
                      fouls_after_two_strikes: parseInt(details.fouls_after_two_strikes?.toString() || '0'),
                      pitch_count: parseInt(details.pitch_count?.toString() || '0'),
                      fouls: parseInt(details.fouls?.toString() || '0'),
                      ball_swinging: parseInt(details.ball_swinging?.toString() || '0'),
                      wild_pitch: parseInt(details.wild_pitch?.toString() || '0'),
                      passed_ball: parseInt(details.passed_ball?.toString() || '0'),
                      late_swings: parseInt(details.late_swings?.toString() || '0'),
                      rbi: parseInt(details.rbi?.toString() || '0'),
                      qab: parseInt(details.qab?.toString() || '0'),
                      hard_hit: parseInt(details.hard_hit?.toString() || '0'),
                      slap: parseInt(details.slap?.toString() || '0'),
                      sac: parseInt(details.sac?.toString() || '0'),
                      error_on: details.pa_error_on?.length ? details.pa_error_on[0].toString() : undefined,
                      round: details.pa_round ? parseInt(details.pa_round.toString()) : 1,
                      br_result: details.br_result !== undefined ? parseInt(details.br_result.toString()) : undefined,
                      base_running_hit_around: details.base_running_hit_around || [],
                      br_stolen_bases: details.br_stolen_bases || [],
                      pa_error_on: details.pa_error_on || [],
                      br_error_on: details.br_error_on || []
                    };
                    transformedEntries.push(entry);
                  }
                });
              }
            });
          }
          
          // Create new inning detail object
          const newInningDetail: InningDetail = {
            team_id: teamId || "",
            game_id: gameId || "",
            inning_number: parseInt(currentInning),
            my_team_ha: "home", // Default value that will be updated if needed
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
            scorebook_entries: transformedEntries
          };
          
          // Also refresh the box score
          await fetchBoxScore();
          
          // Update the state with the refreshed data
          setInningDetail(newInningDetail);
          setLoadingInningDetail(false);
          setIsPostSaveRefresh(false);
          
          // IMPORTANT: Explicitly set the selected team back to what it was
          setSelectedTeam(teamToRestore);
          setSelectedInning(inningToRestore);
          
          // Force a refresh of BaseballField components
          forceBaseballFieldRefresh();
          
        } catch (error) {
          console.error("Error refreshing data after delete:", error);
          setLoadingInningDetail(false);
          setIsPostSaveRefresh(false);
          
          // Fallback to standard refresh if direct refresh fails
          fetchInningDetail(selectedInning, selectedTeam);
        }
      };
      
      // Execute the refresh
      setTimeout(refreshInning, 200);
    } catch (error) {
      // Only show alert for errors
      alert("Failed to delete plate appearance. Please try again.");
      setIsPostSaveRefresh(false);
    }
  };

  // Update the handleSavePAChanges function to call the calculate-score endpoint
  const handleSavePAChanges = async (updatedPA: ScoreBookEntry) => {
    try {
      console.log(`💾 Saving plate appearance:`, updatedPA);
      
      // Store the current selected team to maintain it after refresh
      const currentTeam = selectedTeam;
      const currentInning = selectedInning;
      const currentBatterSeqId = updatedPA.batter_seq_id;
      
      // Set the flag to indicate we're going to be refreshing
      setIsPostSaveRefresh(true);
      
      // Prepare data for API call (existing code)
      const preparedData = {
        ...updatedPA,
        order_number: Number(updatedPA.order_number),
        batter_seq_id: Number(updatedPA.batter_seq_id),
        inning_number: Number((updatedPA as any).inning_number || selectedInning),
        round: Number(updatedPA.round || 1),
        pa_round: Number(updatedPA.round || 1),
        balls_before_play: Math.min(3, Math.max(0, Number(updatedPA.balls_before_play))),
        strikes_before_play: Math.min(2, Math.max(0, Number(updatedPA.strikes_before_play))),
        pitch_count: Number(updatedPA.pitch_count || 0),
        fouls: Number(updatedPA.fouls || 0),
        ball_swinging: Number(updatedPA.ball_swinging || 0),
        strikes_watching: Number(updatedPA.strikes_watching || 0),
        strikes_swinging: Number(updatedPA.strikes_swinging || 0),
        strikes_unsure: Number(updatedPA.strikes_unsure || 0),
        wild_pitch: Number(updatedPA.wild_pitch || 0),
        passed_ball: Number(updatedPA.passed_ball || 0),
        late_swings: Number(updatedPA.late_swings || 0),
        rbi: Number(updatedPA.rbi || 0),
        qab: Number(updatedPA.qab || 0),
        hard_hit: Number(updatedPA.hard_hit || 0),
        slap: Number(updatedPA.slap || 0),
        sac: Number(updatedPA.sac || 0),
        base_running_hit_around: Array.isArray(updatedPA.base_running_hit_around) ? updatedPA.base_running_hit_around : [],
        br_stolen_bases: Array.isArray(updatedPA.br_stolen_bases) ? updatedPA.br_stolen_bases : [],
        pa_error_on: Array.isArray(updatedPA.pa_error_on) ? updatedPA.pa_error_on : [],
        br_error_on: Array.isArray(updatedPA.br_error_on) ? updatedPA.br_error_on : [],
        team_id: (updatedPA as any).team_id || teamId,
        game_id: (updatedPA as any).game_id || gameId,
        teamId: (updatedPA as any).team_id || teamId,
        gameId: (updatedPA as any).game_id || gameId
      };
      
      // First, save the plate appearance
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preparedData),
        }
      );
      
      // Check if response is OK
      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Failed to update plate appearance: ${response.status} ${response.statusText} - ${responseText}`);
      }
      
      // Close the modal first to ensure a clean UI state
      setIsPlateAppearanceModalOpen(false);
      setSelectedPA(null);
      
      // Call calculate-score endpoint
      const calculateScoreUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`;
      await fetch(calculateScoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Force a clear refresh of all data
      const refreshInning = async () => {
        try {
          // First, call the pa_edit endpoint to ensure the database is updated
          if (currentBatterSeqId) {
            const paEditUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${currentTeam}/${currentInning}/scorecardgrid_paonly_inningonly/${currentBatterSeqId}/pa_edit`;
            await fetch(paEditUrl, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          }
          
          // Clear existing inning data to force a complete refresh
          setInningDetail(null);
          setLoadingInningDetail(true);
          
          // IMPORTANT: Preserve the selected team and inning - do not change them
          // Store them before any async operations
          const teamToRestore = currentTeam;
          const inningToRestore = currentInning;
          
          // Make a direct API call with cache disabled
          const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${teamToRestore}/${inningToRestore}/scorecardgrid_paonly_inningonly?no_lineup=true&t=${Date.now()}`;
          
          const response = await fetch(apiUrl, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to refresh inning data: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Reset the rawApiData
          setRawApiData(data);
          
          // Process the data as in fetchInningDetail
          const transformedEntries: ScoreBookEntry[] = [];
          
          if (data.plate_appearances) {
            Object.keys(data.plate_appearances).forEach(inningKey => {
              const inning = data.plate_appearances[inningKey];
              if (inning?.rounds) {
                Object.keys(inning.rounds).forEach(orderKey => {
                  const paData = inning.rounds[orderKey];
                  if (paData?.details) {
                    const details = paData.details;
                    const entry: ScoreBookEntry = {
                      order_number: paData.order_number,
                      batter_jersey_number: "",
                      batter_name: "",
                      batter_seq_id: parseInt(details.batter_seq_id.toString()),
                      bases_reached: details.pa_result.toString(),
                      why_base_reached: details.pa_why,
                      pa_result: details.pa_result.toString(),
                      result_type: "",
                      detailed_result: details.hit_to.toString(),
                      base_running: "",
                      base_running_stolen_base: 0,
                      balls_before_play: parseInt(details.balls_before_play.toString()),
                      strikes_before_play: parseInt(details.strikes_before_play.toString()),
                      strikes_watching: parseInt(details.strikes_watching?.toString() || '0'),
                      strikes_swinging: parseInt(details.strikes_swinging?.toString() || '0'),
                      strikes_unsure: parseInt(details.strikes_unsure?.toString() || '0'),
                      fouls_after_two_strikes: parseInt(details.fouls_after_two_strikes?.toString() || '0'),
                      pitch_count: parseInt(details.pitch_count?.toString() || '0'),
                      fouls: parseInt(details.fouls?.toString() || '0'),
                      ball_swinging: parseInt(details.ball_swinging?.toString() || '0'),
                      wild_pitch: parseInt(details.wild_pitch?.toString() || '0'),
                      passed_ball: parseInt(details.passed_ball?.toString() || '0'),
                      late_swings: parseInt(details.late_swings?.toString() || '0'),
                      rbi: parseInt(details.rbi?.toString() || '0'),
                      qab: parseInt(details.qab?.toString() || '0'),
                      hard_hit: parseInt(details.hard_hit?.toString() || '0'),
                      slap: parseInt(details.slap?.toString() || '0'),
                      sac: parseInt(details.sac?.toString() || '0'),
                      error_on: details.pa_error_on?.length ? details.pa_error_on[0].toString() : undefined,
                      round: details.pa_round ? parseInt(details.pa_round.toString()) : 1,
                      br_result: details.br_result !== undefined ? parseInt(details.br_result.toString()) : undefined,
                      base_running_hit_around: details.base_running_hit_around || [],
                      br_stolen_bases: details.br_stolen_bases || [],
                      pa_error_on: details.pa_error_on || [],
                      br_error_on: details.br_error_on || []
                    };
                    transformedEntries.push(entry);
                  }
                });
              }
            });
          }
          
          // Create new inning detail object
          const newInningDetail: InningDetail = {
            team_id: teamId || "",
            game_id: gameId || "",
            inning_number: parseInt(currentInning),
            my_team_ha: "home", // Default value that will be updated if needed
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
            scorebook_entries: transformedEntries
          };
          
          // Also refresh the box score
          await fetchBoxScore();
          
          // Update the state with the refreshed data
          setInningDetail(newInningDetail);
          setLoadingInningDetail(false);
          setIsPostSaveRefresh(false);
          
          // IMPORTANT: Explicitly set the selected team and inning back to what they were
          setSelectedTeam(teamToRestore);
          setSelectedInning(inningToRestore);
          
          // Force a refresh of BaseballField components
          forceBaseballFieldRefresh();
          
        } catch (error) {
          console.error("Error refreshing data after delete:", error);
          setLoadingInningDetail(false);
          setIsPostSaveRefresh(false);
          
          // Fallback to standard refresh if direct refresh fails
          fetchInningDetail(selectedInning, selectedTeam);
        }
      };
      
      // Execute the refresh
      setTimeout(refreshInning, 200);
    } catch (error) {
      // Only show alert for errors
      alert("Failed to delete plate appearance. Please try again.");
      setIsPostSaveRefresh(false);
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
    
    // Check if lineup_entries exists and is an array
    if (!inningDetail?.lineup_entries || !Array.isArray(inningDetail.lineup_entries)) {
      return;
    }
    
    // Get the total number of batters in the lineup
    const totalBatters = inningDetail.lineup_entries.length;
    
    // If we're at the last batter, cycle back to the first batter
    const nextBatterIndex = currentBatterIndex === totalBatters - 1 
      ? 0  // Go back to the first batter
      : currentBatterIndex + 1;  // Go to the next batter
    
    // Set the next batter as active
    const nextBatter = inningDetail.lineup_entries[nextBatterIndex];
    
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
    
    // No logging needed
  };

  // Call this in useEffect after fetching inning details
  useEffect(() => {
    if (inningDetail) {
      logBatterSequenceIds();
    }
  }, [inningDetail]);

  // Handle click on a plate appearance cell
  const handlePlateAppearanceClick = useCallback((pa: any | null, orderNumber: number, columnIndex: number) => {
    if (pa) {
      // Ensure the PA object has correct types before setting it
      const typedPA: ScoreBookEntry = {
        ...pa,
        order_number: parseInt(pa.order_number.toString()),
        batter_seq_id: parseInt(pa.batter_seq_id.toString()),
        balls_before_play: parseInt(pa.balls_before_play?.toString() || '0'),
        strikes_before_play: parseInt(pa.strikes_before_play?.toString() || '0'),
        strikes_watching: parseInt(pa.strikes_watching?.toString() || '0'),
        strikes_swinging: parseInt(pa.strikes_swinging?.toString() || '0'),
        strikes_unsure: parseInt(pa.strikes_unsure?.toString() || '0'),
        fouls_after_two_strikes: parseInt(pa.fouls_after_two_strikes?.toString() || '0'),
        base_running_stolen_base: parseInt(pa.base_running_stolen_base?.toString() || '0'),
        
        // Quality indicators - explicitly parse as integers with proper null/undefined handling
        wild_pitch: pa.wild_pitch !== undefined ? parseInt(pa.wild_pitch.toString()) : 0,
        passed_ball: pa.passed_ball !== undefined ? parseInt(pa.passed_ball.toString()) : 0,
        late_swings: pa.late_swings !== undefined ? parseInt(pa.late_swings.toString()) : 0,
        rbi: pa.rbi !== undefined ? parseInt(pa.rbi.toString()) : 0,
        qab: pa.qab !== undefined ? parseInt(pa.qab.toString()) : 0,
        hard_hit: pa.hard_hit !== undefined ? parseInt(pa.hard_hit.toString()) : 0,
        slap: pa.slap !== undefined ? parseInt(pa.slap.toString()) : 0,
        sac: pa.sac !== undefined ? parseInt(pa.sac.toString()) : 0,
        
        // CRITICAL: Ensure round is set from the correct source
        // If pa.round exists use it, otherwise check pa.pa_round, default to 1
        round: pa.round ? parseInt(pa.round.toString()) : 
               pa.pa_round ? parseInt(pa.pa_round.toString()) : 1,
        
        // CRITICAL: Explicitly ensure these fields are included
        fouls: pa.fouls !== undefined ? parseInt(pa.fouls.toString()) : 0,
        pitch_count: pa.pitch_count !== undefined ? parseInt(pa.pitch_count.toString()) : 0,
        ball_swinging: pa.ball_swinging !== undefined ? parseInt(pa.ball_swinging.toString()) : 0,
        
        // Include the array fields
        base_running_hit_around: pa.base_running_hit_around || [],
        br_stolen_bases: pa.br_stolen_bases || [],
        pa_error_on: pa.pa_error_on || [],
        br_error_on: pa.br_error_on || []
      };
      
      setSelectedPA(typedPA);
      setIsPlateAppearanceModalOpen(true);
    } else {
      // For a new PA, we'll use the round (column index + 1) to determine the sequence ID
      const round = columnIndex + 1;
      
      // Get the lineup size dynamically
      const lineupSize = inningDetail?.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
        ? Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number), 0)
        : 9;
      
      // The sequence ID is calculated as: (round - 1) * lineupSize + order_number
      const newSeqId = (round - 1) * lineupSize + orderNumber;
      
      // Create a new PA with the required fields
      const newPA: ScoreBookEntry = {
        inning_number: parseInt(selectedInning),
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
        base_running_stolen_base: 0,
        pitch_count: 0,
        fouls: 0,
        ball_swinging: 0,
        slap: 0,
        sac: 0,
        
        // Additional quality indicators - initialize all to 0 for new PAs
        wild_pitch: 0,
        passed_ball: 0,
        late_swings: 0,
        rbi: 0,
        qab: 0,
        hard_hit: 0,
        
        // Initialize array fields
        base_running_hit_around: [],
        br_stolen_bases: [],
        pa_error_on: [],
        br_error_on: []
      } as ScoreBookEntry;
      
      setSelectedPA(newPA);
      setIsPlateAppearanceModalOpen(true);
    }
  }, [teamId, gameId, selectedInning, selectedTeam, inningDetail]);

  // Memoize the handler to prevent unnecessary re-renders
  const memoizedHandleClick = useCallback(handlePlateAppearanceClick, [
    teamId, gameId, selectedInning, selectedTeam, inningDetail
  ]);

  // Modified to always render ScoreCardGrid even for empty innings
  const MemoizedScoreCardGrid = useMemo(() => {
    if (!inningDetail || !inningDetail.scorebook_entries || !Array.isArray(inningDetail.scorebook_entries)) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p>Loading data for this inning...</p>
        </div>
      );
    }
    
    // Create a version of the entries that's compatible with ScoreCardGrid's LocalScoreBookEntry type
    // by ensuring error_on is only a string, not a string array
    const adaptedEntries = inningDetail.scorebook_entries.map(entry => ({
      ...entry,
      // Only pass the first element of error_on if it's an array
      error_on: Array.isArray(entry.error_on) ? 
        (entry.error_on.length > 0 ? entry.error_on[0].toString() : undefined) : 
        entry.error_on
    }));
    
    return (
      <ScoreCardGrid
        key={`scorecardgrid-${selectedTeam}-${selectedInning}-${Date.now()}`}
        teamId={teamId}
        gameId={gameId}
        inningNumber={selectedInning}
        teamChoice={selectedTeam}
        scorebookEntries={adaptedEntries}
        onPlateAppearanceClick={memoizedHandleClick}
        plateAppearanceData={rawApiData}
      />
    );
  }, [inningDetail, teamId, gameId, selectedInning, selectedTeam, rawApiData, memoizedHandleClick]);

  if (loading) return <div className="p-4">Loading game data...</div>;
  if (!boxScore) return <div className="p-4">No box score data available.</div>;

  return (
    <div className="container mx-auto px-0.75 py-0">
      <div className="mb-0 mt-[-18px]">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-col">
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
          
          <div className="flex space-x-2">
            <button
              onClick={handleBackToLineup}
              className="flex items-center justify-center h-7 px-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Lineup
            </button>
          </div>
        </div>
      </div>
      
      {/* Box Score Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-2 mt-1 w-auto" style={{ width: 'auto', maxWidth: '920px' }}>
        <div className="overflow-x-auto" style={{ textAlign: 'left' }}>
          <div style={{ width: 'fit-content', margin: '0', marginLeft: '0' }}>
            <table className="border-collapse" cellSpacing="0" cellPadding="0" style={{ borderCollapse: 'collapse', borderSpacing: 0 }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ width: '120px', minWidth: '120px' }}>Team</th>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th 
                      key={`inning-header-${i}`}
                      className={`p-0 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-t border-b border-l ${i === 6 ? 'border-r' : ''} border-gray-200`}
                      style={{ width: '4.4rem' }}
                      onClick={() => fetchInningDetail(selectedInning, selectedTeam)}
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
                        className={`p-0 align-top ${selectedInning === inningKey && selectedTeam === 'away' ? 'bg-indigo-50' : ''}`}
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
                    onClick={() => {
                      if (!teamTabDebounce.shouldProcessClick()) return;
                      
                      console.log("HOME TAB CLICKED");
                      setSelectedTeam('home');
                      fetchInningDetail(selectedInning, 'home').finally(() => {
                        teamTabDebounce.finishProcessing();
                      });
                    }}
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
                        className={`p-0 align-top ${selectedInning === inningKey && selectedTeam === 'home' ? 'bg-indigo-50' : ''}`}
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
        <div className="p-0 bg-gray-50 border-b flex items-center">
          {/* Team Tabs - Styled as true tabs */}
          <div className="flex h-full">
            <button
              onClick={() => {
                if (!teamTabDebounce.shouldProcessClick()) return;
                
                console.log("HOME TAB CLICKED");
                setSelectedTeam('home');
                fetchInningDetail(selectedInning, 'home').finally(() => {
                  teamTabDebounce.finishProcessing();
                });
              }}
              className={`relative py-3 px-3 font-medium text-xs transition-all duration-200 focus:outline-none ${
                selectedTeam === 'home'
                  ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600 font-semibold -mb-px rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              {boxScore?.game_header?.my_team_ha === 'home' ? 'My Team (Home)' : 'Home Team'}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t transform transition-transform duration-200 ${selectedTeam === 'home' ? 'scale-x-100' : 'scale-x-0'}`}></div>
            </button>
            <button
              onClick={() => {
                if (!teamTabDebounce.shouldProcessClick()) return;
                
                console.log("AWAY TAB CLICKED");
                setSelectedTeam('away');
                fetchInningDetail(selectedInning, 'away').finally(() => {
                  teamTabDebounce.finishProcessing();
                });
              }}
              className={`relative py-3 px-3 font-medium text-xs transition-all duration-200 focus:outline-none ${
                selectedTeam === 'away'
                  ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600 font-semibold -mb-px rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              {boxScore?.game_header?.my_team_ha === 'away' ? 'My Team (Away)' : 'Away Team'}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t transform transition-transform duration-200 ${selectedTeam === 'away' ? 'scale-x-100' : 'scale-x-0'}`}></div>
            </button>
          </div>
        </div>
        
        <div className="p-3">
          {loadingInningDetail ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : inningDetail ? (
            <div>
              {MemoizedScoreCardGrid}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No data available for this inning.
            </div>
          )}
        </div>
      </div>
      
      {/* Plate Appearance Modal */}
      <PlateAppearanceModal
        pa={selectedPA as any}
        isOpen={isPlateAppearanceModalOpen}
        onClose={(teamSide?: 'home' | 'away') => {
          setIsPlateAppearanceModalOpen(false);
          setSelectedPA(null);
          // Only change team if explicitly requested AND different from current team
          // This prevents unintended tab switching after saving
          if (teamSide && teamSide !== selectedTeam) {
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
        // Ensure the paEditEndpoint is always set correctly when editing an existing PA
        paEditEndpoint={selectedPA?.batter_seq_id ? 
          `/scores/new/${teamId}/${gameId}/${selectedTeam}/${selectedInning}/scorecardgrid_paonly_inningonly/${selectedPA.batter_seq_id}/pa_edit` : 
          undefined}
      />
    </div>
  );
}
