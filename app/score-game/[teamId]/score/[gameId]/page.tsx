'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import PlateAppearanceModal from '@/app/components/PlateAppearanceModal/index';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import BoxScoreInningCell from '@/app/components/BoxScoreInningCell';
import ScoreCardGrid from '@/app/components/ScoreCardGrid';
import { ScoreBookEntry as ImportedScoreBookEntry } from '@/app/types/scoreTypes';

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
        const inningOneUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/away/1/score_card_grid_one_inning`;
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/summary`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBoxScore(data);
    } catch (error) {
      console.error('Error fetching box score:', error);
    }
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
      // UNLESS we're in a post-save refresh
      if (
        inningDetail !== null &&
        selectedInning === inningNumber && 
        selectedTeam === teamChoice &&
        !isPostSaveRefresh // Only check if we're not in a post-save refresh
      ) {
        console.log(`FU Already showing data for inning ${inningNumber}, team ${teamChoice} - skipping fetch`);
        return inningDetail;
      }
            
      // Create a unique endpoint identifier for this API call
      const endpointKey = `inning-detail-${teamId}-${gameId}-${teamChoice}-${inningNumber}`;
      
      // Check if we should allow this API call
      if (!shouldAllowApiCall(endpointKey) && hasDataForInning && !isPostSaveRefresh) {
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
        
        // Create array of innings to show (1 to selectedInningNum)
        const inningsArray = Array.from({ length: selectedInningNum }, (_, i) => i + 1);
        setInningsToShow(inningsArray);
        
        // Fetch data for all innings up to the current one
        const allInningsData = await Promise.all(
          inningsArray.map(async (inningNum) => {
            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${teamChoice}/${inningNum}/score_card_grid_one_inning`;
            console.log(`Fetching data for inning ${inningNum}`);
            const response = await fetch(url, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            if (!response.ok) {
              console.error(`Failed to fetch inning ${inningNum}`);
              return null;
            }
            return response.json();
          })
        );

        // Combine all the scorebook entries
        const combinedData = {
          ...allInningsData[allInningsData.length - 1], // Use the latest inning's metadata
          scorebook_entries: allInningsData.flatMap(data => 
            data?.scorebook_entries || []
          )
        };
        
        // Set the combined data
        setInningDetail(combinedData);
        setRawApiData(combinedData);
        setLoadingInningDetail(false);
        return combinedData;
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
        apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${teamChoice}/${inningNumber}/score_card_grid_one_inning`;
        console.log('Using endpoint for specific inning on initial load or advancing');
      } else {
        // For other cases, just get the specific inning
        apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${teamChoice}/${inningNumber}/score_card_grid_one_inning`;
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
    
    // Get the lineup size from the maximum order number in the lineup
    const lineupSize = inningDetail?.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
      ? Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number))
      : 0;
    
    if (lineupSize === 0) return 1;
    
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
    
    // Get all PAs for this inning
    const inningPAs = inningDetail.scorebook_entries;
    if (inningPAs.length === 0) return 1;
    
    // Find the highest round number in the PAs
    const maxRound = Math.max(...inningPAs.map(pa => pa.round || 1));
    
    // Always show one more column than the highest round
    return maxRound + 1;
  };

  // Update the renderPACell function to remove the pa_why field
  const renderPACell = (playerPAs: ScoreBookEntry[], columnIndex: number, orderNumber: number) => {
    // Find the PA for this cell
    const pa = playerPAs.find(p => p.round === columnIndex + 1);
    
    // Check if this order number exists in the lineup
    const playerExists = inningDetail?.lineup_entries?.some(entry => entry.order_number === orderNumber);
    
    // Always show the cell if the player exists in the lineup
    if (!playerExists) {
      return <td key={`empty-${orderNumber}-${columnIndex}`} className="border p-0"></td>;
    }
    
    return (
      <td 
        key={`pa-${orderNumber}-${columnIndex}`} 
        className="border p-0 text-xs text-center align-top"
        style={{ height: '60px', minWidth: '96px' }}
      >
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
              
              // Get the lineup size from the maximum order number in the lineup
              const lineupSize = inningDetail?.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
                ? Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number))
                : 0;
              
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
                batting_order_position: orderNumber,
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

  /**
   * Handles saving plate appearance changes and updates the UI
   * Uses a targeted refresh approach to only update the specific PA's data
   * 
   * Flow:
   * 1. Save the PA data to the server
   * 2. Call calculate-score to update game stats
   * 3. Fetch fresh data for just this PA
   * 4. Update only this PA's cell in the UI
   * 5. Fetch box score summary to update stats
   * 
   * @param updatedPA - The plate appearance data to save
   */
  const handleSavePAChanges = async (updatedPA: ImportedScoreBookEntry) => {
    try {
      if (isPostSaveRefresh) return;
      
      const currentTeam = selectedTeam;
      const currentInning = selectedInning;
      setIsPostSaveRefresh(true);
      
      // Prepare and save PA data
      const paData = {
        team_id: updatedPA.team_id || teamId,
        game_id: updatedPA.game_id || gameId,
        inning_number: updatedPA.inning_number || parseInt(selectedInning),
        home_or_away: updatedPA.home_or_away || selectedTeam,
        batter_seq_id: updatedPA.batter_seq_id,
        order_number: updatedPA.order_number,
        batting_order_position: updatedPA.batting_order_position || updatedPA.order_number,
        out: updatedPA.out || 0,
        out_at: updatedPA.out_at || 0,
        pa_why: updatedPA.pa_why || '',
        pa_result: updatedPA.pa_result || 0,
        hit_to: updatedPA.hit_to || 0,
        balls_before_play: updatedPA.balls_before_play || 0,
        strikes_before_play: updatedPA.strikes_before_play || 0,
        pitch_count: updatedPA.pitch_count || 0,
        hard_hit: updatedPA.hard_hit || 0,
        late_swings: updatedPA.late_swings || 0,
        slap: updatedPA.slap || 0,
        qab: updatedPA.qab || 0,
        rbi: updatedPA.rbi || 0,
        br_result: updatedPA.br_result || 0,
        wild_pitch: updatedPA.wild_pitch || 0,
        passed_ball: updatedPA.passed_ball || 0,
        sac: updatedPA.sac || 0,
        br_stolen_bases: updatedPA.br_stolen_bases || [],
        base_running_hit_around: updatedPA.base_running_hit_around || [],
        pa_error_on: updatedPA.pa_error_on || [],
        br_error_on: updatedPA.br_error_on || [],
        fouls: updatedPA.fouls || 0,
        strikes_watching: updatedPA.strikes_watching || 0,
        strikes_swinging: updatedPA.strikes_swinging || 0,
        strikes_unsure: updatedPA.strikes_unsure || 0,
        ball_swinging: updatedPA.ball_swinging || 0,
        bunt: updatedPA.bunt || 0,
        teamId: updatedPA.team_id || teamId,
        gameId: updatedPA.game_id || gameId,
        my_team_ha: boxScore?.game_header?.my_team_ha || 'home',
        batter_jersey_number: updatedPA.batter_jersey_number || '',
        batter_name: updatedPA.batter_name || '',
        bases_reached: updatedPA.bases_reached || '',
        why_base_reached: updatedPA.why_base_reached || '',
        result_type: updatedPA.result_type || '',
        detailed_result: updatedPA.detailed_result || '',
        base_running: updatedPA.base_running || '',
        round: updatedPA.round || 1
      };
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save plate appearance: ${response.status}`);
      }
      
      // Close modal and reset selection
      setIsPlateAppearanceModalOpen(false);
      setSelectedPA(null);
      
      // Update game stats
      const calculateScoreUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`;
      await fetch(calculateScoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Fetch fresh data for just this PA
      const paEditUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${currentTeam}/${currentInning}/scorecardgrid_paonly_inningonly/${updatedPA.batter_seq_id}/pa_edit`;
      const paResponse = await fetch(paEditUrl);
      
      if (!paResponse.ok) {
        throw new Error(`Failed to fetch updated plate appearance: ${paResponse.status}`);
      }
      
      const updatedPAData = await paResponse.json();
      
      // Update just this PA in the UI
      if (inningDetail && updatedPAData) {
        const updatedInningDetail = { ...inningDetail };
        const paIndex = updatedInningDetail.scorebook_entries.findIndex(
          (pa: any) => pa.batter_seq_id === updatedPA.batter_seq_id
        );
        
        if (paIndex !== -1) {
          // Replace existing PA data
          updatedInningDetail.scorebook_entries[paIndex] = updatedPAData;
        } else {
          // Add new PA data
          updatedInningDetail.scorebook_entries.push(updatedPAData);
        }
        
        setInningDetail(updatedInningDetail);
      }

      // Fetch box score summary to update stats
      await fetchBoxScore();
      
      setIsPostSaveRefresh(false);
    } catch (error) {
      console.error("Failed to save plate appearance:", error);
      alert("Failed to save plate appearance. Please try again.");
      setIsPostSaveRefresh(false);
    }
  };

  /**
   * Handles deleting a plate appearance and updates the UI
   * Uses a targeted approach to remove only the specific PA's data
   * 
   * Flow:
   * 1. Delete the PA from the server
   * 2. Call calculate-score to update game stats
   * 3. Remove the PA from the UI
   * 4. Fetch box score summary to update stats
   * 
   * @param paData - Data identifying the PA to delete
   */
  const handleDeletePA = async (paData: {
    team_id: string;
    game_id: string;
    inning_number: number | string;
    home_or_away: string;
    batter_seq_id: number;
  }) => {
    try {
      if (!paData.team_id || !paData.game_id || !paData.inning_number || 
          !paData.home_or_away || !paData.batter_seq_id) {
        return;
      }
      
      if (isPostSaveRefresh) return;
      
      const currentTeam = selectedTeam;
      const currentInning = selectedInning;
      setIsPostSaveRefresh(true);
      
      // Delete the PA
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance/${
        paData.team_id}/${paData.game_id}/${paData.inning_number}/${
        paData.home_or_away}/${paData.batter_seq_id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Close modal and reset selection
      setIsPlateAppearanceModalOpen(false);
      setSelectedPA(null);
      
      // Update game stats
      const calculateScoreUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`;
      await fetch(calculateScoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Remove the PA from the UI
      if (inningDetail) {
        const updatedInningDetail = { ...inningDetail };
        updatedInningDetail.scorebook_entries = updatedInningDetail.scorebook_entries.filter(
          (pa: any) => pa.batter_seq_id !== paData.batter_seq_id
        );
        setInningDetail(updatedInningDetail);
      }

      // Fetch box score summary to update stats
      await fetchBoxScore();
      
      setIsPostSaveRefresh(false);
    } catch (error) {
      console.error("Failed to delete plate appearance:", error);
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
  const handlePlateAppearanceClick = useCallback(async (pa: any | null, orderNumber: number, columnIndex: number) => {
    console.log('[handlePlateAppearanceClick] Called with:', {
      hasPA: !!pa,
      orderNumber,
      columnIndex
    });

    if (pa) {
      // For existing PAs, first try to fetch the latest data from the edit endpoint
      const editEndpoint = `/scores/new/${teamId}/${gameId}/${selectedTeam}/${selectedInning}/scorecardgrid_paonly_inningonly/${pa.batter_seq_id}/pa_edit`;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${editEndpoint}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            // If we got data from the endpoint, use that instead of the passed PA
            const typedPA: ScoreBookEntry = {
              ...data,
              order_number: parseInt(data.order_number?.toString() || pa.order_number.toString()),
              batting_order_position: parseInt(data.order_number?.toString() || pa.order_number.toString()),
              batter_seq_id: parseInt(data.batter_seq_id?.toString() || pa.batter_seq_id.toString()),
              balls_before_play: parseInt(data.balls_before_play?.toString() || '0'),
              strikes_before_play: parseInt(data.strikes_before_play?.toString() || '0'),
              strikes_watching: parseInt(data.strikes_watching?.toString() || '0'),
              strikes_swinging: parseInt(data.strikes_swinging?.toString() || '0'),
              strikes_unsure: parseInt(data.strikes_unsure?.toString() || '0'),
              fouls_after_two_strikes: parseInt(data.fouls_after_two_strikes?.toString() || '0'),
              base_running_stolen_base: parseInt(data.base_running_stolen_base?.toString() || '0'),
              wild_pitch: data.wild_pitch !== undefined ? parseInt(data.wild_pitch.toString()) : 0,
              passed_ball: data.passed_ball !== undefined ? parseInt(data.passed_ball.toString()) : 0,
              late_swings: data.late_swings !== undefined ? parseInt(data.late_swings.toString()) : 0,
              rbi: data.rbi !== undefined ? parseInt(data.rbi.toString()) : 0,
              qab: data.qab !== undefined ? parseInt(data.qab.toString()) : 0,
              hard_hit: data.hard_hit !== undefined ? parseInt(data.hard_hit.toString()) : 0,
              slap: data.slap !== undefined ? parseInt(data.slap.toString()) : 0,
              sac: data.sac !== undefined ? parseInt(data.sac.toString()) : 0,
              bunt: data.bunt !== undefined ? parseInt(data.bunt.toString()) : 0,
              round: data.round ? parseInt(data.round.toString()) : 
                     data.pa_round ? parseInt(data.pa_round.toString()) : 1,
              fouls: data.fouls !== undefined ? parseInt(data.fouls.toString()) : 0,
              pitch_count: data.pitch_count !== undefined ? parseInt(data.pitch_count.toString()) : 0,
              ball_swinging: data.ball_swinging !== undefined ? parseInt(data.ball_swinging.toString()) : 0,
              base_running_hit_around: data.base_running_hit_around || [],
              br_stolen_bases: data.br_stolen_bases || [],
              pa_error_on: data.pa_error_on || [],
              br_error_on: data.br_error_on || [],
            };
            
            console.log(`Editing PA from endpoint: order_number=${typedPA.order_number}, batting_order_position=${typedPA.batting_order_position}`);
            setSelectedPA(typedPA);
            setIsPlateAppearanceModalOpen(true);
            return;
          }
        } else {
          console.error('Failed to fetch PA data from edit endpoint:', response.status);
        }
      } catch (error) {
        console.error('Error fetching PA data from edit endpoint:', error);
      }

      // If the endpoint fetch failed, fall back to using the passed PA data
      const typedPA: ScoreBookEntry = {
        ...pa,
        // ... rest of the existing PA typing code ...
      } as ScoreBookEntry;
      
      setSelectedPA(typedPA);
      setIsPlateAppearanceModalOpen(true);
    } else {
      // For a new PA, first check if there's existing data at the edit endpoint
      const round = columnIndex + 1;
      const lineupSize = inningDetail?.lineup_entries && Array.isArray(inningDetail.lineup_entries) 
        ? Math.max(...inningDetail.lineup_entries.map(entry => entry.order_number))
        : 0;
      
      if (lineupSize === 0) {
        console.error('No lineup entries found');
        return;
      }
      
      const newSeqId = (round - 1) * lineupSize + orderNumber;
      const editEndpoint = `/scores/new/${teamId}/${gameId}/${selectedTeam}/${selectedInning}/scorecardgrid_paonly_inningonly/${newSeqId}/pa_edit`;
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${editEndpoint}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            // If we got data from the endpoint, use that
            const typedPA: ScoreBookEntry = {
              ...data,
              order_number: parseInt(data.order_number?.toString() || orderNumber.toString()),
              batting_order_position: parseInt(data.order_number?.toString() || orderNumber.toString()),
              batter_seq_id: newSeqId,
              // ... rest of the field parsing like above ...
            };
            
            setSelectedPA(typedPA);
            setIsPlateAppearanceModalOpen(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking for existing PA data:', error);
      }

      // If no existing data found or error occurred, create a new PA
      let playerJerseyNumber = '';
      let playerName = '';
      
      if (inningDetail?.lineup_entries) {
        const playerInfo = inningDetail.lineup_entries.find(entry => entry.order_number === orderNumber);
        if (playerInfo) {
          playerJerseyNumber = playerInfo.jersey_number;
          playerName = playerInfo.name;
        }
      }
      
      const newPA: ScoreBookEntry = {
        inning_number: parseInt(selectedInning),
        home_or_away: selectedTeam,
        batting_order_position: orderNumber,
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
        fouls: 0,
        ball_swinging: 0,
        slap: 0,
        sac: 0,
        bunt: 0,
        wild_pitch: 0,
        passed_ball: 0,
        late_swings: 0,
        rbi: 0,
        qab: 0,
        hard_hit: 0,
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
        showPrecedingInnings={showingAllInnings}
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
    handlePlateAppearanceClick,
    showingAllInnings  // Add showingAllInnings to dependencies
  ]);

  // Update the useEffect for inning selection
  useEffect(() => {
    if (selectedInning) {
      // Generate array of innings from 1 to selected inning
      const inningsArray = Array.from({ length: parseInt(selectedInning) }, (_, i) => i + 1);
      setInningsToShow(inningsArray);
      
      // Fetch the selected inning's details
      if (!loadingInningDetail) {
        fetchInningDetail(selectedInning, selectedTeam);
      }
    }
  }, [selectedInning, selectedTeam]);

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
                        <div data-inning={inningKey} data-team="away">
                          <BoxScoreInningCell 
                            inningData={inningData} 
                            onClick={() => fetchInningDetail(inningKey, 'away')}
                            isActive={selectedInning === inningKey && selectedTeam === 'away'}
                            inningNumber={inningKey}
                            teamType="away"
                            runnersData={runnersData}
                            isLastInning={i === 6}
                          />
                        </div>
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
                        <div data-inning={inningKey} data-team="home">
                          <BoxScoreInningCell 
                            inningData={inningData} 
                            onClick={() => fetchInningDetail(inningKey, 'home')}
                            isActive={selectedInning === inningKey && selectedTeam === 'home'}
                            inningNumber={inningKey}
                            teamType="home"
                            runnersData={runnersData}
                            isLastInning={i === 6}
                          />
                        </div>
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
            
            {/* Refresh Button - Subtle icon button */}
            <button
              onClick={async () => {
                // Set loading state
                setLoadingInningDetail(true);
                
                try {
                  // Fetch the current inning detail
                  await fetchInningDetail(selectedInning, selectedTeam);
                  
                  // Create a new refresh timestamp to force re-render
                  const newRefreshTimestamp = Date.now();
                  setRefreshTimestamp(newRefreshTimestamp);
                  
                  // Force refresh all BaseballField components
                  const fields = document.querySelectorAll('[data-component="BaseballField"]');
                  fields.forEach(field => {
                    // Add and remove a class to force re-render
                    field.classList.add('force-refresh');
                    setTimeout(() => field.classList.remove('force-refresh'), 0);
                  });
                  
                  // Fetch the box score to update totals
                  await fetchBoxScore();
                } catch (error) {
                  console.error('Error refreshing inning:', error);
                } finally {
                  setLoadingInningDetail(false);
                }
              }}
              className="ml-2 p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 rounded-lg transition-all duration-200"
              title="Refresh inning"
              disabled={loadingInningDetail}
            >
              {loadingInningDetail ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4"
                >
                  <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Show Load Previous Innings Button - Only when needed */}
          {!loadingInningDetail && inningDetail && !loadingPreviousInnings && (
            <div className="mr-4 flex space-x-2">
              {/* Add Batter Button */}
              <button
                onClick={() => {
                  // Call the handleAddOrderNumber function from the ScoreCardGrid ref
                  if (scoreCardGridRef.current) {
                    // @ts-ignore - We know this method exists
                    scoreCardGridRef.current.handleAddOrderNumber();
                  }
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md text-xs font-medium shadow-md transition-all duration-200 ease-in-out flex items-center space-x-2"
              >
                <span className="text-indigo-600 font-bold">+</span>
                <span>Add Next Plate Appearance</span>
              </button>
              
              {/* Only show this button for inning 2 and later */}
              {parseInt(selectedInning) > 1 && (
                <button
                  onClick={() => {
                    // Toggle between showing all innings or just current inning
                    if (showingAllInnings) {
                      // Switch to showing only current inning
                      console.log("Switching to current inning only");
                      setShowingAllInnings(false);
                      showingAllInningsRef.current = false;
                      setInningsToShow([parseInt(selectedInning)]);
                      // Fetch just the current inning
                      fetchInningDetail(selectedInning, selectedTeam);
                    } else {
                      // Switch to showing all innings
                      console.log("Switching to show all innings");
                      setShowingAllInnings(true);
                      showingAllInningsRef.current = true;
                      // This will trigger fetching all previous innings
                      fetchInningDetail(selectedInning, selectedTeam);
                    }
                  }}
                  className="bg-emerald-500/90 hover:bg-emerald-600/95 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-md transition-all duration-200 ease-in-out flex items-center space-x-2"
                  disabled={loadingPreviousInnings}
                >
                  {loadingPreviousInnings ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      {showingAllInnings ? (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          className="w-4 h-4 text-white"
                        >
                          <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      ) : (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          className="w-4 h-4 text-white"
                        >
                          <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                        </svg>
                      )}

                      <span>
                        {showingAllInnings ? 'Show Current Inning Only' : 'Show All Previous Innings'}
                      </span>
                    </>
                  )}
                </button>
              )}
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