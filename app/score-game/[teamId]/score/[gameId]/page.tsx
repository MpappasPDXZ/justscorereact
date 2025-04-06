'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import PlateAppearanceModal from '@/app/components/PlateAppearanceModal/index';
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
  bunt?: number;              // Add bunt field
  batting_order_position?: number; // Add batting_order_position field
  inning_number?: number;     // Add inning_number field
  team_id?: string;           // Add team_id field
  game_id?: string;           // Add game_id field
  home_or_away?: string;      // Add home_or_away field
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
    
    // If we're already processing, just log and still return true
    // This ensures clicks aren't completely blocked
    if (this.isProcessing) {
      console.log('Tab click while already processing - still allowing');
    }
    
    // If it's been less than 200ms since the last click, block
    // (shorter timeout to be less restrictive)
    if (now - this.lastClickTime < 200) {
      console.log('Tab click debounced - too soon after previous click');
      return false;
    }
    
    // Otherwise allow processing
    this.lastClickTime = now;
    this.isProcessing = true;
    console.log('Tab click allowed - processing request');
    return true;
  },
  
  // Reset processing state when done
  finishProcessing() {
    console.log('Tab click processing completed');
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
  const [loadingInningDetail, setLoadingInningDetail] = useState(false);
  const [selectedPA, setSelectedPA] = useState<ScoreBookEntry | null>(null);
  const [isPlateAppearanceModalOpen, setIsPlateAppearanceModalOpen] = useState(false);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [isPostSaveRefresh, setIsPostSaveRefresh] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  
  // Add a ref to track the last inning and team we fetched
  const lastFetchedRef = useRef<{ inning: string; team: 'home' | 'away'; hasCompletedInitialFetch: boolean } | null>(null);
  
  // Add a ref to track if the initial data has been loaded
  const initialDataLoadedRef = useRef(false);
  
  // Add this state to track API call timestamps
  const [lastApiCallTimestamp, setLastApiCallTimestamp] = useState<{[key: string]: number}>({});
  
  // Create a ref for the ScoreCardGrid component
  const scoreCardGridRef = useRef<any>(null);
  
  // Add state to track if we're loading previous innings
  const [loadingPreviousInnings, setLoadingPreviousInnings] = useState(false);
  
  // Add a state for tracking innings to show
  const [inningsToShow, setInningsToShow] = useState<number[]>([]);
  
  // Keep track of when all innings are being shown
  const showingAllInningsRef = useRef(false);
  
  // Add a state for tracking if we're showing all innings
  const [showingAllInnings, setShowingAllInnings] = useState(false);
  
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
  
  // Effect to initialize data on page load
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Don't use initialDataLoadedRef here - we need to load initial data
        // even if we've loaded it before
        
        // Set loading state to indicate we're initializing
        setLoading(true);
        
        // Reset the ref first to allow initialization
        initialDataLoadedRef.current = false;
        
        console.log('Starting initial data load');
        
        // Fetch box score data
        await fetchBoxScore();
        
        // Directly load inning 1 for away team with specific endpoint
        const inningOneUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new2/${teamId}/${gameId}/away/1/scorecardgrid_paonly_inningonly_exact`;
        console.log(`Fetching initial inning data: ${inningOneUrl}`);
        
        const response = await fetch(inningOneUrl, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Set the inningDetail state
          setInningDetail(data);
          setRawApiData(data);
          
          // Mark initial load as complete
          initialDataLoadedRef.current = true;
          
          // Update UI state for inning/team
          setSelectedInning('1');
          setSelectedTeam('away');
          
          // Update lastFetchedRef
          lastFetchedRef.current = { 
            inning: '1', 
            team: 'away',
            hasCompletedInitialFetch: true 
          };
        } else {
          console.error('Failed to fetch initial inning data');
        }
        
        // Set loading to false regardless of result
        setLoading(false);
        
      } catch (error) {
        console.error('Error initializing data:', error);
        // Reset flag to allow retry
        initialDataLoadedRef.current = false;
        setLoading(false);
      }
    };
    
    // Only run if we have valid teamId and gameId
    if (teamId && gameId) {
      console.log('Initializing page data');
      initializeData();
    }
  // We specifically don't want selectedInning and selectedTeam as dependencies here 
  // because this effect is only for the initial loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, gameId]);

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

  // Function to check if an API call should be allowed based on time since last call
  const shouldAllowApiCall = (endpoint: string, minDelay = 300): boolean => {
    const now = Date.now();
    const lastCall = lastApiCallTimestamp[endpoint] || 0;
    
    if (now - lastCall < minDelay) {
      console.log(`Debounced API call to ${endpoint}`);
      return false;
    }
    
    // Update the timestamp for this endpoint
    setLastApiCallTimestamp(prev => ({
      ...prev,
      [endpoint]: now
    }));
    
    return true;
  };

  const fetchInningDetail = async (inningNumber: string, teamChoice: 'home' | 'away') => {
    try {
      // Extra logging for home team inning 2 to debug specific issue
      const isHomeInning2 = teamChoice === 'home' && inningNumber === '2';
      if (isHomeInning2) {
        console.log('DETECTED REQUEST FOR HOME TEAM INNING 2');
      }
      
      // Check if we have data for this specific inning
      const hasDataForInning = inningDetail?.scorebook_entries?.some(
        entry => entry.inning_number === parseInt(inningNumber)
      );
      
      // If this is the same as the currently selected inning and team,
      // and we already have data loaded for this specific inning, no need to refetch
      if (
        inningDetail !== null &&
        selectedInning === inningNumber && 
        selectedTeam === teamChoice &&
        hasDataForInning &&
        !isPostSaveRefresh
      ) {
        console.log(`Already showing data for inning ${inningNumber}, team ${teamChoice} - skipping fetch`);
        return inningDetail;
      }
      
      // If this specific inning has no data yet, we must fetch it
      if (!hasDataForInning) {
        console.log(`No data found for inning ${inningNumber}, team ${teamChoice} - must fetch`);
      }
      
      if (!teamId || !gameId || teamId === 'undefined' || gameId === 'undefined') {
        // Skip if invalid parameters
        setLoadingInningDetail(false);
        return;
      }
      
      // Create a unique endpoint identifier for this API call
      const endpointKey = `inning-detail-${teamId}-${gameId}-${teamChoice}-${inningNumber}`;
      
      // Check if we should allow this API call
      if (!shouldAllowApiCall(endpointKey) && hasDataForInning) {
        console.log('Debounced API call for inning detail');
        return;
      }
      
      // Only skip if it's explicitly a duplicate request with the exact same parameters
      // AND it's not the first load (inningDetail is not null)
      // AND it's not a post-save refresh
      // AND we actually have data for this specific inning
      const isExactDuplicate = 
        !isPostSaveRefresh && 
        inningDetail !== null &&
        lastFetchedRef.current && 
        lastFetchedRef.current.inning === inningNumber && 
        lastFetchedRef.current.team === teamChoice &&
        hasDataForInning;
      
      // Skip duplicate requests
      if (isExactDuplicate) {
        console.log('Skipping duplicate request for same inning/team');
        return;
      }
      
      console.log(`Fetching inning detail for inning ${inningNumber}, team ${teamChoice}`);
      
      // Update the lastFetchedRef
      lastFetchedRef.current = { 
        inning: inningNumber, 
        team: teamChoice,
        hasCompletedInitialFetch: true 
      };
      
      // Set loading state and update selected inning/team
      setLoadingInningDetail(true);
      
      // Update selected inning and team
      setSelectedInning(inningNumber);
      setSelectedTeam(teamChoice);
      
      // CRITICAL: Keep previous innings data when advancing to higher innings
      // Only reset inningsToShow when we're not going to a higher inning number
      const selectedInningNum = parseInt(inningNumber);
      const currentInningNum = parseInt(selectedInning);
      
      const isAdvancingToHigherInning = selectedInningNum > currentInningNum;
      const isChangingTeam = teamChoice !== selectedTeam;
      
      // If advancing to a higher inning, consider showing previous innings
      if (isAdvancingToHigherInning && selectedInningNum > 1 && !isPostSaveRefresh) {
        console.log(`Advancing to inning ${selectedInningNum} - preparing to show previous innings`);
        // Don't reset inningsToShow, so we can potentially show all innings later
        
        // Set the flag to show all innings up to this new inning
        showingAllInningsRef.current = true;
        setShowingAllInnings(true);
        
        // Create array of innings to show (1 to selectedInningNum)
        const inningsArray = Array.from({ length: selectedInningNum }, (_, i) => i + 1);
        setInningsToShow(inningsArray);
      } else if (isChangingTeam || isPostSaveRefresh) {
        // For team changes or after operations, just show the current inning
        setInningsToShow([]);
        
        // Reset showingAllInnings state to false only when changing teams
        if (isChangingTeam) {
          showingAllInningsRef.current = false;
          setShowingAllInnings(false);
        }
      }
      
      // Choose the correct endpoint based on whether this is the initial load or not
      const isFirstLoad = !initialDataLoadedRef.current;
      let apiUrl;
      
      if (isFirstLoad || (selectedInningNum > 1 && isAdvancingToHigherInning)) {
        // For initial load or when advancing to higher innings, get all innings data
        // FIXED: Always include the inning number in the URL
        apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new2/${teamId}/${gameId}/${teamChoice}/${inningNumber}/scorecardgrid_paonly_inningonly_exact`;
        console.log('Using endpoint for specific inning on initial load or advancing');
      } else {
        // For other cases, just get the specific inning
        apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new2/${teamId}/${gameId}/${teamChoice}/${inningNumber}/scorecardgrid_paonly_inningonly_exact`;
        console.log('Using endpoint for specific inning');
      }
      
      console.log(`Making API request to: ${apiUrl}`);
      
      // Make the fetch request with no-cache headers
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inning detail: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set the inningDetail state
      setInningDetail(data);
      
      // Set rawApiData for debugging or other uses
      setRawApiData(data);
      
      // Update the initialDataLoadedRef to indicate we've loaded data at least once
      initialDataLoadedRef.current = true;
      
      // Set loading state to false
      setLoadingInningDetail(false);
      
      // Return the data for any additional handling
      return data;
    } catch (error) {
      console.error('Error fetching inning detail:', error);
      setLoadingInningDetail(false);
      return null;
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

  // Function to get the next batter sequence ID using the round field
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

  // Update the renderPACell function to remove the pa_why field
  const renderPACell = (playerPAs: ScoreBookEntry[], columnIndex: number, orderNumber: number) => {
    // Find the PA based on the batter_seq_id which corresponds to the sequence in the order
    // Calculate the expected batter_seq_id based on the columnIndex and lineup size
    const lineupSize = inningDetail?.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
      ? inningDetail.lineup_entries.length 
      : 9;
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
              const lineupSize = inningDetail?.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
                ? inningDetail.lineup_entries.length 
                : 9;
              
              // The sequence ID is calculated as: (round - 1) * lineupSize + order_number
              const newSeqId = (round - 1) * lineupSize + orderNumber;
              
              // Get player information from lineup entries
              let playerJerseyNumber = '';
              let playerName = '';
              
              if (inningDetail?.lineup_entries) {
                const playerInfo = inningDetail.lineup_entries.find(entry => entry.order_number === orderNumber);
                if (playerInfo) {
                  playerJerseyNumber = playerInfo.jersey_number;
                  playerName = playerInfo.name;
                }
              }
              
              // Create a new PA with the required fields
              const newPA: ScoreBookEntry = {
                inning_number: parseInt(selectedInning),
                home_or_away: selectedTeam,
                batting_order_position: orderNumber, // CRITICAL: Always set to same value as order_number
                order_number: orderNumber,
                batter_seq_id: newSeqId,
                round: round,
                team_id: teamId,
                game_id: gameId,
                batter_jersey_number: playerJerseyNumber,
                batter_name: playerName,
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
                // Initialize array fields
                base_running_hit_around: [],
                br_stolen_bases: [],
                pa_error_on: [],
                br_error_on: [],
                fouls: 0,
                ball_swinging: 0,
                slap: 0,
                sac: 0,
                bunt: 0
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
      
      // Don't allow multiple refresh operations
      if (isPostSaveRefresh) return;
      
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
      
      // Create a new refresh timestamp for keying
      const newRefreshTimestamp = Date.now();
      setRefreshTimestamp(newRefreshTimestamp);
      
      // CRITICAL: Explicitly fetch new data instead of relying on a side effect
      setTimeout(async () => {
        try {
          // Update box score first (scores, runs, etc.)
          await fetchBoxScore();
          
          // Then fetch the specific inning detail
          await fetchInningDetail(currentInning, currentTeam);
          
          // Reset the post-save refresh flag
          setIsPostSaveRefresh(false);
        } catch (error) {
          console.error("Error refreshing data after delete:", error);
          setIsPostSaveRefresh(false);
        }
      }, 300);
    } catch (error) {
      // Only show alert for errors
      alert("Failed to delete plate appearance. Please try again.");
      setIsPostSaveRefresh(false);
    }
  };

  // Update the handleSavePAChanges function to call the calculate-score endpoint
  const handleSavePAChanges = async (updatedPA: ScoreBookEntry) => {
    try {
      // Log the input
      console.log('Saving PA with order_number:', updatedPA.order_number, 
                  'batting_order_position:', updatedPA.batting_order_position || 'undefined');
                  
      // Don't allow multiple refresh operations
      if (isPostSaveRefresh) return;
      
      // Store the current selected team to maintain it after refresh
      const currentTeam = selectedTeam;
      const currentInning = selectedInning;
      const currentBatterSeqId = updatedPA.batter_seq_id;
      
      // Set the flag to indicate we're going to be refreshing
      setIsPostSaveRefresh(true);
      
      // Prepare data for API call
      const preparedData = {
        ...updatedPA,
        order_number: Number(updatedPA.order_number),
        // CRITICAL FIX: Always set batting_order_position to same value as order_number
        batting_order_position: Number(updatedPA.order_number),
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
        bunt: Number(updatedPA.bunt || 0),
        base_running_hit_around: Array.isArray(updatedPA.base_running_hit_around) ? updatedPA.base_running_hit_around : [],
        br_stolen_bases: Array.isArray(updatedPA.br_stolen_bases) ? updatedPA.br_stolen_bases : [],
        pa_error_on: Array.isArray(updatedPA.pa_error_on) ? updatedPA.pa_error_on : [],
        br_error_on: Array.isArray(updatedPA.br_error_on) ? updatedPA.br_error_on : [],
        team_id: (updatedPA as any).team_id || teamId,
        game_id: (updatedPA as any).game_id || gameId,
        teamId: (updatedPA as any).team_id || teamId,
        gameId: (updatedPA as any).game_id || gameId
      };
      
      // Log the prepared data
      console.log('Prepared data for saving:', {
        order_number: preparedData.order_number, 
        batting_order_position: preparedData.batting_order_position
      });
      
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
      
      // Create a new refresh timestamp for keying
      const newRefreshTimestamp = Date.now();
      setRefreshTimestamp(newRefreshTimestamp);
      
      // CRITICAL: Explicitly fetch new data instead of relying on a side effect
      setTimeout(async () => {
        try {
          // Update box score first (scores, runs, etc.)
          await fetchBoxScore();
          
          // Then fetch the specific inning detail
          await fetchInningDetail(currentInning, currentTeam);
          
          // Reset the post-save refresh flag
          setIsPostSaveRefresh(false);
        } catch (error) {
          console.error("Error refreshing data after save:", error);
          setIsPostSaveRefresh(false);
        }
      }, 300);
    } catch (error) {
      console.error("Failed to save plate appearance:", error);
      alert("Failed to save plate appearance. Please try again.");
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
        // CRITICAL FIX: Always set batting_order_position to same value as order_number
        batting_order_position: parseInt(pa.order_number.toString()),
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
        bunt: pa.bunt !== undefined ? parseInt(pa.bunt.toString()) : 0,
        
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
        br_error_on: pa.br_error_on || [],
      };
      
      // Log the key fields for debugging
      console.log(`Editing PA: order_number=${typedPA.order_number}, batting_order_position=${typedPA.batting_order_position}`);
      
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
        // CRITICAL FIX: Explicitly set batting_order_position to same value as order_number
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
        bunt: 0,
        
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
      
      // Log the key fields for debugging
      console.log(`Creating new PA: order_number=${newPA.order_number}, batting_order_position=${newPA.batting_order_position}`);
      
      setSelectedPA(newPA);
      setIsPlateAppearanceModalOpen(true);
    }
  }, [teamId, gameId, selectedInning, selectedTeam, inningDetail]);

  // Memoize the handler to prevent unnecessary re-renders
  const memoizedHandleClick = useCallback(handlePlateAppearanceClick, [
    teamId, gameId, selectedInning, selectedTeam, inningDetail
  ]);

  // Create the MemoizedScoreCardGrid with the new inningsToShow prop
  const MemoizedScoreCardGrid = useMemo(() => {
    if (!inningDetail) return null;
    
    // Use a stable key structure to prevent unnecessary re-renders
    // Don't include isPostSaveRefresh in the key as it changes on every save/delete
    const memoKey = `${teamId}-${gameId}-${selectedTeam}-${selectedInning}`;
    
    return (
      <ScoreCardGrid
        key={memoKey}
        ref={scoreCardGridRef}
        teamId={teamId as string}
        gameId={gameId as string}
        inningNumber={selectedInning}
        teamChoice={selectedTeam}
        scorebookEntries={inningDetail.scorebook_entries as any[]} 
        onPlateAppearanceClick={handlePlateAppearanceClick}
        showPrecedingInnings={false}
        refreshTimestamp={refreshTimestamp}
        inningsToShow={inningsToShow.length > 0 ? inningsToShow : undefined}
      />
    );
  }, [
    teamId, 
    gameId, 
    selectedTeam, 
    selectedInning, 
    inningDetail, 
    refreshTimestamp, 
    inningsToShow,
    handlePlateAppearanceClick
  ]);

  // Add a new effect to reset inningsToShow when the "Load Previous Innings" button is clicked
  useEffect(() => {
    if (loadingPreviousInnings === false && inningsToShow.length > 0) {
      // If we're not loading previous innings and we have specific innings to show,
      // check if we should reset to show all innings
      if (showingAllInningsRef.current) {
        // Reset inningsToShow to empty to fall back to the default behavior
        setInningsToShow([]);
      }
    }
  }, [loadingPreviousInnings, inningsToShow]);

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
        <div className="p-0 bg-gray-50 border-b flex items-center justify-between">
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
          
          {/* Show Load Previous Innings Button - Only when needed */}
          {parseInt(selectedInning) > 1 && !loadingInningDetail && inningDetail && !loadingPreviousInnings && (
            <div className="mr-4">
              <button
                onClick={() => {
                  // Call the grid's method to load all previous innings
                  if (scoreCardGridRef.current) {
                    setLoadingPreviousInnings(true);
                    showingAllInningsRef.current = true; // Set the ref to true when button is clicked
                    
                    scoreCardGridRef.current.loadAllPreviousInnings()
                      .then(() => {
                        console.log("All previous innings loaded successfully");
                        setLoadingPreviousInnings(false);
                      })
                      .catch((err: Error) => {
                        console.error("Error loading previous innings:", err);
                        setLoadingPreviousInnings(false);
                      });
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Load Previous Innings
              </button>
            </div>
          )}
          {/* Show loading indicator when loading previous innings */}
          {loadingPreviousInnings && (
            <div className="mr-4">
              <button
                disabled
                className="bg-emerald-600/50 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading...
              </button>
            </div>
          )}
        </div>
        
        <div className="p-3">
          {loadingInningDetail ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div>
              {MemoizedScoreCardGrid}
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
