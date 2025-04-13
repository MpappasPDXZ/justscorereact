'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import PlateAppearanceModal from '@/app/components/PlateAppearanceModal/index';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import BoxScoreInningCell from '@/app/components/BoxScoreInningCell';
import ScoreCardGrid from '@/app/components/ScoreCardGrid';
import { ScoreBookEntry as ImportedScoreBookEntry } from '@/app/types/scoreTypes';
import { PlateAppearance } from '@/types/plateAppearance';

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
  pa_round?: number;          // Add pa_round field
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
  pa_data?: PlateAppearance[];
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
  
  shouldProcessClick() {
    const now = Date.now();
    
    if (this.isProcessing || now - this.lastClickTime < 200) {
      return false;
    }
    
    this.lastClickTime = now;
    this.isProcessing = true;
    return true;
  },
  
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
        setLoading(true);
        initialDataLoadedRef.current = false;
        
        await fetchBoxScore();
        
        const inningOneUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/away/1/score_card_grid_one_inning`;
        
        const response = await fetch(inningOneUrl, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setInningDetail(data);
          setRawApiData(data);
          initialDataLoadedRef.current = true;
          setSelectedInning('1');
          setSelectedTeam('away');
          lastFetchedRef.current = { 
            inning: '1', 
            team: 'away',
            hasCompletedInitialFetch: true 
          };
        } else {
          console.error('Failed to fetch initial inning data');
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error('Error initializing data:', error);
        initialDataLoadedRef.current = false;
        setLoading(false);
      }
    };
    
    // Only run if we have valid teamId and gameId
    if (teamId && gameId) {
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
      const hasDataForInning = inningDetail?.scorebook_entries?.some(
        entry => entry.inning_number === parseInt(inningNumber)
      );
      
      if (
        inningDetail !== null &&
        selectedInning === inningNumber && 
        selectedTeam === teamChoice &&
        !isPostSaveRefresh
      ) {
        return inningDetail;
      }
      
      const endpointKey = `inning-detail-${teamId}-${gameId}-${teamChoice}-${inningNumber}`;
      
      if (!shouldAllowApiCall(endpointKey) && hasDataForInning && !isPostSaveRefresh) {
        return;
      }
      
      const isExactDuplicate = 
        !isPostSaveRefresh && 
        inningDetail !== null &&
        lastFetchedRef.current && 
        lastFetchedRef.current.inning === inningNumber && 
        lastFetchedRef.current.team === teamChoice &&
        hasDataForInning;
      
      if (isExactDuplicate) {
        return;
      }
      
      lastFetchedRef.current = { 
        inning: inningNumber, 
        team: teamChoice,
        hasCompletedInitialFetch: true 
      };
      
      setLoadingInningDetail(true);
      setSelectedInning(inningNumber);
      setSelectedTeam(teamChoice);
      
      const selectedInningNum = parseInt(inningNumber);
      const currentInningNum = parseInt(selectedInning);
      const isChangingTeam = teamChoice !== selectedTeam;
      
      // Determine if we should show all innings
      const shouldShowAllInnings = showingAllInningsRef.current || 
        (selectedInningNum > 1 && !isPostSaveRefresh && !isChangingTeam);
      
      // If changing teams, maintain the current showAllInnings state
      if (isChangingTeam) {
        if (!showingAllInningsRef.current) {
          setInningsToShow([selectedInningNum]);
        } else {
          const inningsArray = Array.from({ length: selectedInningNum }, (_, i) => i + 1);
          setInningsToShow(inningsArray);
        }
      } else if (shouldShowAllInnings) {
        const inningsArray = Array.from({ length: selectedInningNum }, (_, i) => i + 1);
        setInningsToShow(inningsArray);
        
        // Fetch all innings data
        const allInningsData = await Promise.all(
          inningsArray.map(async (inningNum) => {
            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${teamChoice}/${inningNum}/score_card_grid_one_inning`;
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

        // Combine all innings data
        const validData = allInningsData.filter(data => data !== null);
        if (validData.length > 0) {
          const combinedData = {
            ...validData[validData.length - 1],
            scorebook_entries: validData.flatMap(data => 
              data?.scorebook_entries || []
            )
          };
          
          console.log('[SCORECARD DATA] Combined innings:', {
            totalInnings: validData.length,
            totalEntries: combinedData.scorebook_entries.length,
            innings: inningsArray
          });
          
          setInningDetail(combinedData);
          setRawApiData(combinedData);
          setLoadingInningDetail(false);
          return combinedData;
        }
      }
      
      // Fetch single inning if not showing all or if previous fetches failed
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${teamChoice}/${inningNumber}/score_card_grid_one_inning`;
      
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
      console.log('[SCORECARD DATA] Single inning:', {
        inning: inningNumber,
        entries: data.scorebook_entries.length
      });
      
      setInningDetail(data);
      setRawApiData(data);
      initialDataLoadedRef.current = true;
      setLoadingInningDetail(false);
      
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
      // Get the next batter sequence ID from the server
      return 1; // Default to 1, will be updated by server
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

  // Add helper function to check if a cell is interactive
  const isCellInteractive = (inningNum: number) => {
    return inningNum === parseInt(selectedInning);
  };

  const renderPACell = (playerPAs: ScoreBookEntry[], columnIndex: number, orderNumber: number) => {
    const pa = playerPAs.find(p => p.round === columnIndex + 1);
    const playerExists = inningDetail?.lineup_entries?.some(entry => entry.order_number === orderNumber);
    
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
          onClick={() => handlePlateAppearanceClick(pa || null, orderNumber, columnIndex)}
          isInteractive={isCellInteractive(parseInt(selectedInning))}
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
      
      // 1. Save PA data
      const paData = {
        team_id: updatedPA.team_id || teamId,
        game_id: updatedPA.game_id || gameId,
        inning_number: updatedPA.inning_number || parseInt(selectedInning),
        home_or_away: updatedPA.home_or_away || selectedTeam,
        batter_seq_id: updatedPA.batter_seq_id,
        order_number: updatedPA.order_number,
        batting_order_position: updatedPA.batting_order_position || updatedPA.order_number,
        jersey_number: updatedPA.jersey_number,
        // Ensure out is 1 if out_at has a value
        out: (typeof updatedPA.out_at === 'number' && updatedPA.out_at > 0) ? 1 : (typeof updatedPA.out === 'number' ? updatedPA.out : 0),
        out_at: typeof updatedPA.out_at === 'number' ? updatedPA.out_at : 0,
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
      
      // Log the PA data for debugging
      console.log('PA Out Fields:', {
        updatedPA_out: updatedPA.out,
        updatedPA_out_type: typeof updatedPA.out,
        updatedPA_out_at: updatedPA.out_at,
        updatedPA_out_at_type: typeof updatedPA.out_at,
        paData_out: typeof updatedPA.out === 'number' ? updatedPA.out : 0,
        paData_out_at: typeof updatedPA.out_at === 'number' ? updatedPA.out_at : 0
      });

      // Log the complete PA data being sent
      console.log('Complete PA data being sent to API:', JSON.stringify(paData, null, 2));
      
      const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paData),
      });
      
      if (!saveResponse.ok) {
        throw new Error(`Failed to save plate appearance: ${saveResponse.status}`);
      }
      
      const saveResult = await saveResponse.json();
      console.log('Plate Appearance Save Response:', {
        status: saveResult.status,
        round_from_pa_save: saveResult.round_from_pa_save,
        team_choice: saveResult.team_choice,
        my_team_ha: saveResult.my_team_ha,
        message: saveResult.message
      });
      
      const roundFromPASave = saveResult.round_from_pa_save || 1;
      
      setIsPlateAppearanceModalOpen(false);
      setSelectedPA(null);
      
      // Calculate score first
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Fetch fresh box score data
      await fetchBoxScore();
      
      // If showing all innings, fetch all innings up to current
      const shouldFetchAllInnings = showingAllInningsRef.current || inningsToShow.length > 1;
      
      if (shouldFetchAllInnings) {
        // Fetch all innings data up to current inning
        const inningsArray = Array.from({ length: parseInt(currentInning) }, (_, i) => i + 1);
        const allInningsData = await Promise.all(
          inningsArray.map(async (inningNum) => {
            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${currentTeam}/${inningNum}/score_card_grid_one_inning`;
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

        // Filter out any failed fetches and combine the data
        const validData = allInningsData.filter(data => data !== null);
        if (validData.length > 0) {
          const combinedData = {
            ...validData[validData.length - 1],
            scorebook_entries: validData.flatMap(data => 
              data?.scorebook_entries || []
            ).sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0))
          };
          
          console.log('[SCORECARD DATA] Combined innings after PA save:', {
            totalInnings: validData.length,
            totalEntries: combinedData.scorebook_entries.length,
            innings: inningsArray
          });
          
          // Update state with combined data
          setInningDetail(combinedData);
          setRawApiData(combinedData);
          setRefreshTimestamp(Date.now());
          setIsPostSaveRefresh(false);
          return;
        }
      }
      
      // If not showing all innings or if fetching all innings failed, 
      // fetch just the current inning data
      const inningResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${currentTeam}/${currentInning}/score_card_grid_one_inning`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      if (!inningResponse.ok) {
        throw new Error(`Failed to fetch inning data: ${inningResponse.status}`);
      }
      
      const inningData = await inningResponse.json();
      
      // Then fetch the specific round data
      console.log('Fetching updated round data:', {
        round: roundFromPASave,
        url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${currentTeam}/${currentInning}/score_card_grid_one_inning/${roundFromPASave}`
      });
      
      const roundResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/fast/${teamId}/${gameId}/${currentTeam}/${currentInning}/score_card_grid_one_inning/${roundFromPASave}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      if (!roundResponse.ok) {
        throw new Error(`Failed to fetch round data: ${roundResponse.status}`);
      }
      
      const roundData = await roundResponse.json();
      console.log('Received round data:', {
        roundFromPASave,
        entriesCount: roundData.scorebook_entries?.length || 0
      });
      
      // Update the inning detail with the new data
      if (inningData && roundData) {
        // Get all entries except those from the updated round
        const otherEntries = inningData.scorebook_entries.filter(
          (entry: ScoreBookEntry) => entry.round !== roundFromPASave
        );
        
        // Create updated inning detail with merged data
        const updatedInningDetail = {
          ...inningData,
          scorebook_entries: [
            ...otherEntries,
            ...(roundData.scorebook_entries || [])
          ].sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0))
        };
        
        console.log('Updated inning detail:', {
          totalEntries: updatedInningDetail.scorebook_entries.length,
          otherEntries: otherEntries.length,
          newRoundEntries: roundData.scorebook_entries?.length || 0
        });
        
        setInningDetail(updatedInningDetail);
        setRefreshTimestamp(Date.now());
      }
      
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
      
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/api/plate-appearance/${
        paData.team_id}/${paData.game_id}/${paData.inning_number}/${
        paData.home_or_away}/${paData.batter_seq_id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setIsPlateAppearanceModalOpen(false);
      setSelectedPA(null);
      
      const calculateScoreUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${currentInning}/${currentTeam}/calculate-score`;
      await fetch(calculateScoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (inningDetail) {
        const updatedInningDetail = { 
          ...inningDetail,
          scorebook_entries: inningDetail.scorebook_entries.filter(
            (pa: any) => !(pa.batter_seq_id === paData.batter_seq_id && 
                          pa.inning_number === paData.inning_number)
          ),
          lineup_entries: inningDetail.lineup_entries ? [...inningDetail.lineup_entries] : []
        };
        
        setInningDetail(updatedInningDetail);
      }

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
  const handleAddPlateAppearance = async () => {
    try {
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
        // Get the next batter sequence ID from the server
        const nextBatterSeqId = await getNextBatterSeqId();
        console.log('Next batter sequence ID:', nextBatterSeqId);

        // Calculate the round based on the sequence ID
        const lineupSize = inningDetail.lineup_entries.length;
        const round = Math.floor((nextBatterSeqId - 1) / lineupSize) + 1;

        // Create a new PA with the required fields
        const newPA: ScoreBookEntry = {
          inning_number: parseInt(selectedInning),
          home_or_away: selectedTeam,
          batting_order_position: nextBatter.order_number,
          order_number: nextBatter.order_number,
          batter_seq_id: nextBatterSeqId,  // Use the fetched nextBatterSeqId
          round: round,
          pa_round: round,
          team_id: teamId,
          game_id: gameId,
          batter_jersey_number: nextBatter.jersey_number,
          batter_name: nextBatter.name,
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
          br_result: 0,
          pitch_count: 0,
          fouls: 0,
          ball_swinging: 0,
          late_swings: 0,
          rbi: 0,
          qab: 0,
          hard_hit: 0,
          slap: 0,
          sac: 0,
          bunt: 0
        };
        
        setSelectedPA(newPA);
        setIsPlateAppearanceModalOpen(true);
      }
    } catch (error) {
      console.error('Error in handleAddPlateAppearance:', error);
      alert('Failed to add plate appearance. Please try again.');
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

  // Function to calculate the round for a new PA based on previous PAs for this player
  const calculatePARound = (orderNumber: number) => {
    if (!inningDetail?.scorebook_entries) return 1;
    
    // Filter PAs for this specific player in current inning and team
    const playerPAsInInning = inningDetail.scorebook_entries.filter(
      entry => 
        entry.order_number === orderNumber && 
        entry.inning_number === parseInt(selectedInning) &&
        entry.home_or_away === selectedTeam
    );
    
    // Round is number of previous PAs plus 1
    return playerPAsInInning.length + 1;
  };

  // Update the function to get the next batter sequence ID from the server
  const getNextBatterSeqIdFromServer = async (inningNumber: number, team: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${team}/${inningNumber}/next_batter_seq_id`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.next_batter_seq_id;
      }
      return 1; // fallback if request fails
    } catch (error) {
      console.error('Error fetching next batter sequence ID:', error);
      return 1; // fallback if request fails
    }
  };

  // Get the next batter sequence ID from the server
  const getNextBatterSeqId = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${selectedTeam}/${selectedInning}/next_batter_seq_id`);
      if (!response.ok) {
        throw new Error(`Failed to fetch next batter sequence ID: ${response.status}`);
      }
      const data = await response.json();
      return data.next_batter_seq_id;
    } catch (error) {
      throw error;
    }
  }, [teamId, gameId, selectedTeam, selectedInning]);

  const handlePlateAppearanceClick = async (pa: ScoreBookEntry | null, orderNumber: number, columnIndex: number) => {
    try {
      if (pa?.batter_seq_id) {
        // For existing PAs, try to fetch from edit endpoint
        const editEndpoint = `/scores/new/${teamId}/${gameId}/${selectedTeam}/${selectedInning}/scorecardgrid_paonly_inningonly/${pa.batter_seq_id}/pa_edit`;
        const editResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${editEndpoint}`);
        
        if (!editResponse.ok) {
          throw new Error(`Failed to fetch PA data: ${editResponse.status}`);
        }
        
        const editData = await editResponse.json();

        if (!editData) {
          throw new Error('No data returned from edit endpoint');
        }

        setSelectedPA(editData);
        setIsPlateAppearanceModalOpen(true);
      } else {
        // For a new PA, get the next batter sequence ID from the server
        const nextBatterSeqId = await getNextBatterSeqId();

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
          batter_seq_id: nextBatterSeqId,  // Use the server-provided ID
          round: columnIndex + 1,
          pa_round: columnIndex + 1,
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
          br_result: 0,
          pitch_count: 0,
          fouls: 0,
          ball_swinging: 0,
          late_swings: 0,
          rbi: 0,
          qab: 0,
          hard_hit: 0,
          slap: 0,
          sac: 0,
          bunt: 0
        };
        
        setSelectedPA(newPA);
        setIsPlateAppearanceModalOpen(true);
      }
    } catch (error) {
      alert('Failed to handle plate appearance. Please try again.');
    }
  };

  // Memoize the handler to prevent unnecessary re-renders
  const memoizedHandleClick = useCallback(handlePlateAppearanceClick, [
    teamId, gameId, selectedInning, selectedTeam, inningDetail
  ]);

  // Create the MemoizedScoreCardGrid with the new inningsToShow prop
  const MemoizedScoreCardGrid = useMemo(() => {
    if (!inningDetail) return null;
    
    // Include scorebook entries length in the key for better update tracking
    const entriesKey = `${inningDetail.scorebook_entries.length}-${refreshTimestamp}`;
    const memoKey = `${teamId}-${gameId}-${selectedTeam}-${selectedInning}-${entriesKey}`;
    
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
    inningDetail?.scorebook_entries.length, // Track length changes
    refreshTimestamp,
    inningsToShow,
    handlePlateAppearanceClick,
    showingAllInnings
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
                  // Get all innings up to current one
                  const currentInningNum = parseInt(selectedInning);
                  const inningsToFetch = Array.from({ length: currentInningNum }, (_, i) => (i + 1).toString());
                  
                  // Fetch data for all innings up to current one
                  const inningPromises = inningsToFetch.map(inningNum => 
                    fetchInningDetail(inningNum, selectedTeam)
                  );
                  
                  // Wait for all inning data to be fetched
                  await Promise.all(inningPromises);
                  
                  // Create a new refresh timestamp to force re-render
                  const newRefreshTimestamp = Date.now();
                  setRefreshTimestamp(newRefreshTimestamp);
                  
                  // Force refresh all BaseballField components
                  const fields = document.querySelectorAll('[data-component="BaseballField"]');
                  fields.forEach(field => {
                    field.classList.add('force-refresh');
                    setTimeout(() => field.classList.remove('force-refresh'), 0);
                  });
                  
                  // Fetch the box score to update totals
                  await fetchBoxScore();
                } catch (error) {
                  console.error('Error refreshing innings:', error);
                } finally {
                  setLoadingInningDetail(false);
                }
              }}
              className="ml-2 p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 rounded-lg transition-all duration-200"
              title="Refresh all innings up to current"
              disabled={loadingInningDetail}
            >
              {loadingInningDetail ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      {/* I would like to add a new prop here that is the next batter sequence id */}
      
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
        nextBatterSeqId={1} // Default value, will be updated by the modal if needed
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