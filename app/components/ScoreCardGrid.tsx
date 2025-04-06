'use client';

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import BattingOrderTable from '@/app/components/BattingOrderTable';
import { ScoreBookEntry as TypedScoreBookEntry } from '@/app/types/scoreTypes';

// Local version of ScoreBookEntry to match what's passed from page.tsx
interface LocalScoreBookEntry {
  order_number: number;
  batter_jersey_number: string;
  batter_name: string;
  batter_seq_id: number;
  bases_reached: string;
  why_base_reached: string;
  pa_result: string;
  result_type: string;
  detailed_result: string;
  base_running: string;
  balls_before_play: number;
  strikes_before_play: number;
  strikes_watching: number;
  strikes_swinging: number;
  strikes_unsure: number;
  fouls_after_two_strikes: number;
  base_running_stolen_base: number;
  error_on?: string;
  wild_pitch?: number;
  passed_ball?: number;
  round: number;
  team_id?: string;
  game_id?: string;
  inning_number?: number;
  home_or_away?: string;
  br_result?: number;
  slap?: number;
  late_swings?: number;
  fouls?: number;
  pitch_count?: number;
  batting_order_position?: number;
  out?: number;
  out_at?: number;
  my_team_ha?: string;
  sac?: number;
  bunt?: number;
  qab?: number;
}

interface ScoreCardGridProps {
  teamId: string;
  gameId: string;
  inningNumber: string;
  teamChoice: 'home' | 'away';
  scorebookEntries: LocalScoreBookEntry[];
  onPlateAppearanceClick: (pa: LocalScoreBookEntry | null, orderNumber: number, columnIndex: number) => void;
  showPrecedingInnings?: boolean;
  plateAppearanceData?: PlateAppearanceData;
  lineupsPreloaded?: {
    awayLineupLoaded: boolean;
    homeLineupLoaded: boolean;
  };
  refreshTimestamp?: number;
  inningsToShow?: number[];
}

interface PlateAppearanceDetail {
  inning_number: number;
  order_number: number;
  pa_round: number;
  batter_seq_id: number;
  pa_why: string;
  pa_result: number;
  hit_to: number;
  out: number;
  out_at: number;
  balls_before_play: number;
  strikes_before_play: number;
  pitch_count: number;
  hard_hit: number;
  late_swings: number;
  slap: number;
  qab: number;
  rbi: number;
  br_result: number;
  wild_pitch: number;
  passed_ball: number;
  sac: number;
  br_stolen_bases: number[];
  base_running_hit_around: number[];
  pa_error_on: number[];
  br_error_on: number[];
  fouls?: number;
  strikes_watching?: number;
  strikes_swinging?: number;
  strikes_unsure?: number;
  ball_swinging?: number;
  bunt?: number;
}

interface PlateAppearanceData {
  team_id: number;
  game_id: number;
  team_choice: string;
  pa_available: string;
  // Support both old and new formats
  plate_appearances?: {
    [inningNumber: string]: {
      // New format with pa_rounds
      pa_rounds?: {
        [round: string]: {
          [batterId: string]: {
            order_number: number;
            details: PlateAppearanceDetail;
          }
        }
      };
      // Old format with rounds
      rounds?: {
        [orderNumber: string]: {
          order_number: number;
          details: PlateAppearanceDetail;
        }
      }
    }
  };
  // Legacy format
  pa_rounds?: {
    [round: string]: {
      [batterId: string]: {
        order_number: number;
        details: PlateAppearanceDetail;
      }
    }
  }
}

const ScoreCardGrid = forwardRef<
  { loadAllPreviousInnings: () => Promise<void> },
  ScoreCardGridProps
>(function ScoreCardGrid({ 
  teamId, 
  gameId, 
  inningNumber,
  teamChoice, 
  scorebookEntries,
  onPlateAppearanceClick,
  showPrecedingInnings = false,
  plateAppearanceData,
  lineupsPreloaded,
  refreshTimestamp,
  inningsToShow
}, ref) {
  const [numberOfPAColumns, setNumberOfPAColumns] = useState(1);
  const [visiblePAColumns, setVisiblePAColumns] = useState(1); // Start with only 1 PA column visible
  const [transformedEntries, setTransformedEntries] = useState<LocalScoreBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualLineupSize, setActualLineupSize] = useState<number>(9); // Default to 9, will be updated
  const [displayedInnings, setDisplayedInnings] = useState<number[]>([]);
  const [maxAvailableInning, setMaxAvailableInning] = useState<number>(1);
  const [activeInning, setActiveInning] = useState<number>(parseInt(inningNumber));
  const [inningData, setInningData] = useState<{[inning: number]: LocalScoreBookEntry[]}>({});
  const [forceAdditionalColumns, setForceAdditionalColumns] = useState<number>(0); // New state to force additional columns
  const [lastApiCallTimestamp, setLastApiCallTimestamp] = useState<{[key: string]: number}>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showingAllInnings, setShowingAllInnings] = useState<boolean>(false);
  const [highestViewedInning, setHighestViewedInning] = useState<number>(parseInt(inningNumber));

  // Callback function to receive lineup size from BattingOrderTable
  const handleLineupSizeUpdate = (size: number) => {
    if (size > 0) {
      setActualLineupSize(size);
    }
  };

  // Expose the loadAllPreviousInnings method via ref
  useImperativeHandle(ref, () => ({
    loadAllPreviousInnings: async () => {
      await loadAllPreviousInnings();
    }
  }));

  // Simplify the shouldAllowApiCall logging
  const shouldAllowApiCall = (endpoint: string, minDelay = 2000): boolean => {
    const now = Date.now();
    const lastCall = lastApiCallTimestamp[endpoint] || 0;
    
    // Allow more frequent calls when it's a refresh operation (shorter delay)
    if (endpoint.includes('refresh-timestamp') && now - lastCall < 500) {
      return false;
    }
    
    // For regular calls use the standard delay
    if (!endpoint.includes('refresh-timestamp') && now - lastCall < minDelay) {
      return false;
    }
    
    // Update the timestamp for this endpoint
    setLastApiCallTimestamp(prev => ({
      ...prev,
      [endpoint]: now
    }));
    
    return true;
  };

  // Update highestViewedInning when inning number changes
  useEffect(() => {
    const currentInningNum = parseInt(inningNumber);
    // Update the highest viewed inning if the current inning is higher
    if (currentInningNum > highestViewedInning) {
      setHighestViewedInning(currentInningNum);
    }

    // ADDED: Automatically show all innings when navigating to inning > 1
    if (currentInningNum > 1 && !showingAllInnings) {
      setShowingAllInnings(true);
    }
  }, [inningNumber, highestViewedInning, showingAllInnings]);

  // Modified useEffect to handle inning navigation properly
  useEffect(() => {
    const newInningNum = parseInt(inningNumber);
    
    // When active inning changes, only load the newly selected inning if we don't have it already
    const loadInningData = async () => {
      if (!loading) {
        // Check if we already have data for this inning in either inningData or transformedEntries
        const hasInningDataInState = Object.keys(inningData).includes(newInningNum.toString());
        const hasInningDataInEntries = transformedEntries.some(entry => entry.inning_number === newInningNum);
        
        // Only fetch if we don't have the data anywhere
        if (!hasInningDataInState && !hasInningDataInEntries) {
          const apiKey = `inning-${teamId}-${gameId}-${teamChoice}-${newInningNum}`;
          if (shouldAllowApiCall(apiKey, 1000)) {
            await fetchInningData(newInningNum);
          }
        } else {
          // If we have data in transformedEntries but not in inningData, update inningData
          if (!hasInningDataInState && hasInningDataInEntries) {
            const inningEntries = transformedEntries.filter(entry => entry.inning_number === newInningNum);
            
            // Update inningData with the entries we already have
            setInningData(prevData => ({
              ...prevData,
              [newInningNum]: inningEntries
            }));
          }
        }
      }
    };
    
    setActiveInning(newInningNum);
    loadInningData();
  }, [inningNumber, loading]);

  // Clean up logging in useEffect for displayedInnings
  useEffect(() => {
    if (loading) return;
    
    // If inningsToShow is provided, use it directly to override normal behavior
    if (inningsToShow && inningsToShow.length > 0) {
      setDisplayedInnings(inningsToShow);
      return;
    }
    
    // Get the current inning number
    const currentInningNum = parseInt(inningNumber);
    
    // Set displayed innings based on showingAllInnings state
    if (showingAllInnings) {
      // If showing all innings, we need to determine the highest inning to show
      // Get all inning numbers we have data for
      const loadedInningNumbers = Object.keys(inningData).map(num => parseInt(num));
      
      // Calculate the highest inning to display
      const maxInningToShow = loadedInningNumbers.length > 0 
        ? Math.max(currentInningNum, ...loadedInningNumbers)
        : currentInningNum;
      
      // Create array of all innings to show (1 through maxInningToShow)
      const allInningsToShow = Array.from({ length: maxInningToShow }, (_, i) => i + 1);
      
      setDisplayedInnings(allInningsToShow);
    } else {
      // When not showing all innings, only show the current inning
      // This is the default behavior after save/delete operations or clicking on a box score inning
      setDisplayedInnings([currentInningNum]);
    }
  }, [loading, showingAllInnings, inningNumber, inningData, inningsToShow]);
  
  // Update the initial useEffect to only load the current inning by default
  useEffect(() => {
    // Only run this if:
    // 1. We don't already have data from props
    // 2. We have valid teamId and gameId
    // 3. We haven't already loaded data
    const shouldFetchData = 
      !scorebookEntries?.length && 
      !plateAppearanceData && 
      teamId && 
      gameId && 
      teamChoice && 
      inningNumber;
    
    if (shouldFetchData && shouldAllowApiCall('initial-fetch')) {
      // On initial load, only fetch the current inning
      const currentInningNum = parseInt(inningNumber);
      
      const loadInitialData = async () => {
        setLoading(true);
        
        // Only load the current inning by default
        await fetchInningData(currentInningNum);
        
        setInitialLoadComplete(true);
        setLoading(false);
      };
      
      loadInitialData();
    } else if (scorebookEntries || plateAppearanceData) {
      // If we have data already passed as props, we don't need to load
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, gameId, teamChoice, inningNumber]);
  
  // Improved useEffect for data processing
  useEffect(() => {
    // If we're waiting for data, don't do anything yet
    if (loading) {
      return;
    }
    
    // If scorebookEntries are provided, use them directly
    if (scorebookEntries && scorebookEntries.length > 0) {
      // Ensure all numeric properties are parsed as numbers
      const parsedEntries = scorebookEntries.map(entry => ({
        ...entry,
        order_number: typeof entry.order_number === 'string' ? parseInt(entry.order_number) : entry.order_number,
        batter_seq_id: typeof entry.batter_seq_id === 'string' ? parseInt(entry.batter_seq_id) : entry.batter_seq_id,
        balls_before_play: typeof entry.balls_before_play === 'string' ? parseInt(entry.balls_before_play) : entry.balls_before_play,
        strikes_before_play: typeof entry.strikes_before_play === 'string' ? parseInt(entry.strikes_before_play) : entry.strikes_before_play,
        strikes_watching: typeof entry.strikes_watching === 'string' ? parseInt(entry.strikes_watching) : entry.strikes_watching,
        strikes_swinging: typeof entry.strikes_swinging === 'string' ? parseInt(entry.strikes_swinging) : entry.strikes_swinging,
        strikes_unsure: typeof entry.strikes_unsure === 'string' ? parseInt(entry.strikes_unsure) : entry.strikes_unsure,
        fouls_after_two_strikes: typeof entry.fouls_after_two_strikes === 'string' ? parseInt(entry.fouls_after_two_strikes) : entry.fouls_after_two_strikes,
        base_running_stolen_base: typeof entry.base_running_stolen_base === 'string' ? parseInt(entry.base_running_stolen_base) : entry.base_running_stolen_base,
        round: typeof entry.round === 'string' ? parseInt(entry.round) : entry.round
      }));
      
      setTransformedEntries(parsedEntries);
      
      // Make sure we also put this in the inningData state
      const currentInningNum = parseInt(inningNumber);
      
      // Update the inning data state with these entries
      setInningData(prevData => {
        const newData = {
          ...prevData,
          [currentInningNum]: parsedEntries.filter(entry => 
            entry.inning_number === currentInningNum
          )
        };
        return newData;
      });
      
      setInitialLoadComplete(true);
      setLoading(false);
      return;
    }
    
    // If plateAppearanceData is provided, use it directly instead of fetching
    if (plateAppearanceData) {
      const transformed = transformPlateAppearanceData(plateAppearanceData);
      setTransformedEntries(transformed);
      
      // Also put this in the inningData map
      const currentInningNum = parseInt(inningNumber);
      setInningData(prevData => {
        const newData = {
          ...prevData,
          [currentInningNum]: transformed.filter(entry => 
            entry.inning_number === currentInningNum
          )
        };
        return newData;
      });
      
      setInitialLoadComplete(true);
      setLoading(false);
      return;
    }
    
    // Handle the case of empty scorebookEntries (first load or empty inning)
    if (scorebookEntries && scorebookEntries.length === 0) {
      setTransformedEntries([]);
      setInitialLoadComplete(true);
      setLoading(false);
      return;
    }
    
    // Check if we have already loaded data but need to refresh
    if (initialLoadComplete && refreshTimestamp) {
      // On refresh, we should reload the current inning
      const currentInningNum = parseInt(inningNumber);
      const refreshKey = `refresh-timestamp-${refreshTimestamp}-${teamId}-${gameId}-${teamChoice}-${currentInningNum}`;
      
      // Force a refresh regardless of the timestamp if refreshTimestamp changes
      if (shouldAllowApiCall(refreshKey, 500)) {
        fetchInningData(currentInningNum);
      }
    }
  }, [teamId, gameId, teamChoice, scorebookEntries, plateAppearanceData, refreshTimestamp, loading, initialLoadComplete, inningNumber]);

  // Add a separate useEffect to specifically handle refreshTimestamp changes
  useEffect(() => {
    if (refreshTimestamp && !loading) {
      // Refresh the current inning when refreshTimestamp changes
      const currentInningNum = parseInt(inningNumber);
      
      // If we're passed scorebookEntries directly as props, use them instead of fetching
      if (scorebookEntries && scorebookEntries.length > 0) {
        // Just clear the cache
        playerPAsCache.clear();
        
        // Parse the entries quickly
        const parsedEntries = scorebookEntries.map(entry => ({
          ...entry,
          order_number: typeof entry.order_number === 'string' ? parseInt(entry.order_number) : entry.order_number,
          batter_seq_id: typeof entry.batter_seq_id === 'string' ? parseInt(entry.batter_seq_id) : entry.batter_seq_id,
          balls_before_play: typeof entry.balls_before_play === 'string' ? parseInt(entry.balls_before_play) : entry.balls_before_play,
          strikes_before_play: typeof entry.strikes_before_play === 'string' ? parseInt(entry.strikes_before_play) : entry.strikes_before_play,
          round: typeof entry.round === 'string' ? parseInt(entry.round) : entry.round
        }));
        
        // Update inningData directly
        setInningData(prevData => ({
          ...prevData,
          [currentInningNum]: parsedEntries.filter(entry => 
            entry.inning_number === currentInningNum
          )
        }));
        
        // Update transformedEntries by replacing just the entries for this inning
        setTransformedEntries(prevEntries => {
          // Filter out entries for the current inning
          const filteredEntries = prevEntries.filter(
            entry => entry.inning_number !== currentInningNum
          );
          
          // Add the new entries for this inning
          return [...filteredEntries, ...parsedEntries.filter(entry => 
            entry.inning_number === currentInningNum
          )];
        });
        
        // No need to set loading state at all
        return;
      }
      
      // Set a flag to track fetch status
      let fetchAborted = false;
      
      // Clear cache for current inning only
      playerPAsCache.clear();
      
      // Set loading to true briefly to show loading state
      setLoading(true);
      
      // Only clear data for the current inning, preserving other innings
      setInningData(prevData => {
        const newData = { ...prevData };
        // Only remove data for the current inning
        delete newData[currentInningNum];
        return newData;
      });
      
      // Update transformedEntries to remove only entries for the current inning
      setTransformedEntries(prevEntries => 
        prevEntries.filter(entry => entry.inning_number !== currentInningNum)
      );
      
      // Trigger a fetch of the current inning data with a shorter delay
      setTimeout(() => {
        if (fetchAborted) return;
        
        fetchInningData(currentInningNum)
          .then(entries => {
            if (entries.length === 0) {
              // If no entries, set empty data for this inning
              setInningData(prevData => ({
                ...prevData,
                [currentInningNum]: []
              }));
            }
          })
          .finally(() => {
            if (!fetchAborted) {
              setLoading(false);
            }
          });
        
        // Set loading to false faster to prevent long spinner
        setTimeout(() => {
          if (!fetchAborted) {
            setLoading(false);
          }
        }, 300); // Force loading to false after 300ms
      }, 10); // Reduced delay for faster response
      
      // Clean up
      return () => {
        fetchAborted = true;
      };
    }
  }, [refreshTimestamp, scorebookEntries]);

  // Optimize the fetchInningData function
  const fetchInningData = async (inningNum: number) => {
    if (!teamId || !gameId || !teamChoice) {
      console.error('Missing required data for fetching inning:', { teamId, gameId, teamChoice, inningNum });
      return [];
    }
    
    // Check if we already have data for this inning
    if (inningData[inningNum] && inningData[inningNum].length > 0) {
      // If we're not forcing a refresh, just use the cached data
      if (!refreshTimestamp) {
        return inningData[inningNum];
      }
    }
    
    // Create a unique key for this API call
    const apiKey = `inning-${teamId}-${gameId}-${teamChoice}-${inningNum}`;
    
    // Skip if this exact call was made very recently (except after save/delete)
    const minDelay = refreshTimestamp ? 200 : 1000; // shorter delay after save/delete
    if (!shouldAllowApiCall(apiKey, minDelay)) {
      return inningData[inningNum] || [];
    }
    
    try {
      // Use the inning-specific endpoint
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new2/${teamId}/${gameId}/${teamChoice}/${inningNum}/scorecardgrid_paonly_inningonly_exact?no_lineup=true&t=${Date.now()}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inning data: ${response.status}`);
      }
      
      const data = await response.json();
      
      // If there's no data or an empty response, handle gracefully
      if (!data) {
        // Return empty array but don't trigger a loading spinner
        return [];
      }
      
      // Transform the data
      const transformed = transformPlateAppearanceData(data);
      
      // Filter the transformed data to only include entries for the requested inning
      const inningEntries = transformed.filter(entry => entry.inning_number === inningNum);
      
      // Update the inning data state - only if we have entries
      if (inningEntries.length > 0) {
        setInningData(prevData => {
          const newData = {
            ...prevData,
            [inningNum]: inningEntries
          };
          return newData;
        });
        
        // Update transformed entries with this data
        setTransformedEntries(prevEntries => {
          // Remove any existing entries for this inning to avoid duplicates
          const filteredEntries = prevEntries.filter(
            entry => entry.inning_number !== inningNum
          );
          
          // Add the new entries for this inning
          const updatedEntries = [...filteredEntries, ...inningEntries];
          return updatedEntries;
        });
      }
      
      return inningEntries;
    } catch (error) {
      console.error(`Error fetching inning ${inningNum} data:`, error);
      // Return empty array but don't trigger a loading spinner
      return [];
    }
  };

  // Clean up transformPlateAppearanceData logging
  const transformPlateAppearanceData = (apiData: any): LocalScoreBookEntry[] => {
    const entries: LocalScoreBookEntry[] = [];
    
    if (!apiData) {
      return entries;
    }
    
    // Handle the original format with scorebook_entries array (backward compatibility)
    if (apiData.scorebook_entries && Array.isArray(apiData.scorebook_entries)) {
      return apiData.scorebook_entries.map((entry: any) => {
        // Convert the scorebook entry to our LocalScoreBookEntry format
        return {
          team_id: entry.team_id?.toString() || apiData.team_id?.toString() || '',
          game_id: entry.game_id?.toString() || apiData.game_id?.toString() || '',
          inning_number: entry.inning_number || parseInt(apiData.inning_number) || 0,
          home_or_away: entry.home_or_away || apiData.team_choice || '',
          order_number: entry.order_number || 0,
          batter_seq_id: entry.batter_seq_id || 0,
          batter_name: entry.batter_name || '',
          batter_jersey_number: entry.batter_jersey_number || '',
          
          // Result fields
          why_base_reached: entry.why_base_reached || entry.pa_why || '',
          pa_result: entry.pa_result?.toString() || entry.bases_reached || '0',
          bases_reached: entry.bases_reached?.toString() || entry.pa_result?.toString() || '0',
          result_type: entry.result_type || '',
          detailed_result: entry.detailed_result?.toString() || entry.hit_to?.toString() || '0',
          base_running: entry.base_running || '',
          
          // Pitch count details
          balls_before_play: Number(entry.balls_before_play || 0),
          strikes_before_play: Number(entry.strikes_before_play || 0),
          strikes_watching: Number(entry.strikes_watching || 0),
          strikes_swinging: Number(entry.strikes_swinging || 0),
          strikes_unsure: Number(entry.strikes_unsure || 0),
          fouls_after_two_strikes: Number(entry.fouls_after_two_strikes || 0),
          base_running_stolen_base: Number(entry.base_running_stolen_base || 0),
          round: Number(entry.round || 1),
          
          // CRITICAL: Include out field for proper display
          out: entry.out !== undefined ? Number(entry.out) : 0,
          out_at: entry.out_at !== undefined ? Number(entry.out_at) : 0,
          my_team_ha: entry.my_team_ha || apiData.my_team_ha || '',
          
          // Special stats
          wild_pitch: entry.wild_pitch,
          passed_ball: entry.passed_ball,
          error_on: entry.error_on,
          br_result: entry.br_result !== undefined ? Number(entry.br_result) : undefined,
          
          // Badge properties
          slap: Number(entry.slap || 0),
          late_swings: Number(entry.late_swings || 0),
          fouls: Number(entry.fouls || 0),
          pitch_count: Number(entry.pitch_count || 0),
          sac: Number(entry.sac || 0),
          bunt: Number(entry.bunt || 0),
          qab: Number(entry.qab || 0)
        };
      });
    }
    
    // Direct pa_rounds array structure
    if (apiData.pa_rounds && typeof apiData.pa_rounds === 'object') {
      // Loop through each round (e.g., "1", "2", etc.)
      Object.keys(apiData.pa_rounds).forEach(roundKey => {
        const roundData = apiData.pa_rounds[roundKey];
        
        // Check if the round data is an array
        if (Array.isArray(roundData)) {
          // Process each PA in the array
          roundData.forEach(paData => {
            if (!paData) return;
            
            // Create a ScoreBookEntry from the direct PA data
            const entry: LocalScoreBookEntry = {
              team_id: apiData.team_id?.toString() || paData.team_id?.toString() || '',
              game_id: apiData.game_id?.toString() || paData.game_id?.toString() || '',
              inning_number: parseInt(apiData.inning_number?.toString() || paData.inning_number?.toString() || '0'),
              home_or_away: apiData.team_choice || paData.team_choice || '',
              order_number: parseInt(paData.order_number?.toString() || '0'),
              batter_seq_id: parseInt(paData.batter_seq_id?.toString() || '0'),
              batter_name: "", // Will be filled from lineup data
              batter_jersey_number: "", // Will be filled from lineup data
              
              // Result fields
              why_base_reached: paData.pa_why || '',
              pa_result: paData.pa_result?.toString() || '0',
              bases_reached: paData.pa_result?.toString() || '0',
              result_type: "",
              detailed_result: paData.hit_to?.toString() || '0',
              base_running: "",
              
              // Pitch count details
              balls_before_play: parseInt(paData.balls_before_play?.toString() || '0'),
              strikes_before_play: parseInt(paData.strikes_before_play?.toString() || '0'),
              strikes_watching: parseInt(paData.strikes_watching?.toString() || '0'),
              strikes_swinging: parseInt(paData.strikes_swinging?.toString() || '0'),
              strikes_unsure: parseInt(paData.strikes_unsure?.toString() || '0'),
              fouls_after_two_strikes: parseInt(paData.fouls_after_two_strikes?.toString() || '0'),
              base_running_stolen_base: 0,
              round: parseInt(paData.pa_round?.toString() || roundKey || '1'),
              
              // CRITICAL: Include out field for proper display
              out: paData.out !== undefined ? Number(paData.out) : 0,
              out_at: paData.out_at !== undefined ? Number(paData.out_at) : 0,
              my_team_ha: paData.my_team_ha || apiData.my_team_ha || '',
              
              // Special stats
              wild_pitch: parseInt(paData.wild_pitch?.toString() || '0'),
              passed_ball: parseInt(paData.passed_ball?.toString() || '0'),
              
              // Error information
              error_on: paData.pa_error_on?.length ? paData.pa_error_on[0].toString() : undefined,
              br_result: paData.br_result !== undefined ? parseInt(paData.br_result.toString()) : undefined,
              
              // Quality indicators
              slap: parseInt(paData.slap?.toString() || '0'),
              late_swings: parseInt(paData.late_swings?.toString() || '0'),
              fouls: parseInt(paData.fouls?.toString() || '0'),
              pitch_count: parseInt(paData.pitch_count?.toString() || '0'),
              sac: parseInt(paData.sac?.toString() || '0'),
              bunt: parseInt(paData.bunt?.toString() || '0'),
              qab: parseInt(paData.qab?.toString() || '0')
            };
            
            entries.push(entry);
          });
        }
      });
    }
    
    return entries;
  };

  // Memoize the transformed entries to prevent unnecessary re-renders
  useEffect(() => {
    // Calculate number of columns based on scorebook entries and displayed innings
    if (transformedEntries && transformedEntries.length > 0) {
      const lineupSize = getLineupSize();
      
      // Calculate total number of PAs needed for all displayed innings
      const totalPAsNeeded = displayedInnings.reduce((total, inningNum) => {
        // Count how many PAs we actually have for this inning
        const inningEntries = transformedEntries.filter(entry => entry.inning_number === inningNum);
        
        if (inningEntries.length === 0) {
          // If there are no entries for this inning, only show 1 PA column
          return total + 1;
        }
        
        // Find the highest batter_seq_id for this inning to determine how many columns we need
        const maxSeqForInning = Math.max(
          ...inningEntries.map(entry => entry.batter_seq_id || 0)
        );
        
        // Calculate how many columns this inning needs
        const columnsForInning = Math.min(
          Math.ceil(maxSeqForInning / lineupSize),
          lineupSize
        );
        
        // Ensure we show at least one column per inning
        return total + Math.max(columnsForInning, 1);
      }, 0);
      
      setVisiblePAColumns(totalPAsNeeded);
      setNumberOfPAColumns(totalPAsNeeded);
    } else {
      setNumberOfPAColumns(1);
      setVisiblePAColumns(1);
    }
  }, [transformedEntries, displayedInnings]);

  // Count how many PA columns to display for a specific inning
  const getPAColumnsForInning = (inningNum: number) => {
    // If this inning has no entries, only show 1 column for PA 1
    const inningEntries = transformedEntries.filter(entry => entry.inning_number === inningNum);
    if (inningEntries.length === 0) {
      // For the active inning, check if we're forcing additional columns
      if (inningNum === activeInning && forceAdditionalColumns > 0) {
        return forceAdditionalColumns;
      }
      return 1; // Otherwise show 1 column for empty innings
    }
    
    const lineupSize = getLineupSize();
    
    // Find the maximum round (PA position) for this inning
    const maxRoundInInning = Math.max(
      ...inningEntries.map(entry => entry.round || 1)
    );
    
    // For the active inning, always show at least 1 column
    if (inningNum === activeInning) {
      // If we're forcing additional columns, use that value
      if (forceAdditionalColumns > 0) {
        return Math.max(maxRoundInInning, forceAdditionalColumns);
      }
      return Math.max(maxRoundInInning, 1);
    }
    
    // For preceding innings, show exactly how many PAs there are
    return Math.max(maxRoundInInning, 1);
  };

  // Memoize the getPlayerPAs function to avoid recalculations
  const playerPAsCache = new Map<number, LocalScoreBookEntry[]>();
  
  // Group scorebook entries by order number with caching
  const getPlayerPAs = (orderNumber: number) => {
    // Check if we already have this in the cache
    if (playerPAsCache.has(orderNumber)) {
      return playerPAsCache.get(orderNumber) || [];
    }
    
    if (!transformedEntries) return [];
    
    const result = transformedEntries
      .filter(entry => entry.order_number === orderNumber)
      .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
    
    // Store in cache for future use
    playerPAsCache.set(orderNumber, result);
    
    return result;
  };
  
  // Clear the cache when transformedEntries changes
  useEffect(() => {
    playerPAsCache.clear();
  }, [transformedEntries]);

  // Get the lineup size considering both the scorecard entries and the lineup data
  const getLineupSize = () => {
    // If we have actual lineup data from BattingOrderTable, use that first
    if (actualLineupSize > 9) {
      return actualLineupSize;
    }
    
    // Otherwise fall back to calculating from transformed entries
    if (transformedEntries.length === 0) return 9; // Default to 9 if no entries
    
    // Find the highest order_number in the transformed entries
    return Math.max(...transformedEntries.map(entry => entry.order_number || 0), 9);
  };

  // Function to calculate the next batter_seq_id
  const getNextBatterSeqId = () => {
    // Calculate next batter_seq_id for the active inning only
    const activeInningEntries = transformedEntries.filter(entry => 
      entry.inning_number === activeInning
    );
    
    // If no entries exist for this inning yet, start with 1
    if (!activeInningEntries || activeInningEntries.length === 0) {
      return 1;
    }
    
    // For the first PA round in an inning, always start with batter_seq_id = 1
    const firstRoundEntries = activeInningEntries.filter(entry => entry.round === 1);
    if (firstRoundEntries.length === 0) {
      // No entries for round 1 (first PA column), so start with 1
      return 1;
    }
    
    // Get the highest batter_seq_id within this round
    const maxSeqId = Math.max(...firstRoundEntries.map(entry => entry.batter_seq_id || 0));
    
    // If we haven't reached the end of the lineup yet, continue incrementing
    if (maxSeqId < getLineupSize()) {
      return maxSeqId + 1;
    }
    
    // If we've gone through all players in the lineup for PA round 1, reset to 1 for next round
    return 1;
  };

  // Calculate the round (inning) for a given columnIndex
  const calculateRound = (columnIndex: number) => {
    // Round is typically 1-based (first inning = 1)
    return columnIndex + 1;
  };

  // Filter plate appearances by inning
  const getPlayerPAsByInning = (orderNumber: number, inningNumber: number) => {
    // First check if we have specific data for this inning in our inningData state
    if (inningData && inningData[inningNumber] && inningData[inningNumber].length > 0) {
      // Filter the inning-specific data for this player
      return inningData[inningNumber]
        .filter(entry => entry.order_number === orderNumber)
        .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
    }
    
    // If we don't have inning-specific data, look in the overall transformedEntries
    // This is important for preserving data during inning navigation
    if (transformedEntries && transformedEntries.length > 0) {
      const entriesForInning = transformedEntries.filter(
        entry => entry.inning_number === inningNumber && entry.order_number === orderNumber
      ).sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
      
      if (entriesForInning.length > 0) {
        // This means we have data but it's not in inningData, so let's add it there for future use
        setInningData(prevData => ({
          ...prevData,
          [inningNumber]: transformedEntries.filter(entry => entry.inning_number === inningNumber)
        }));
        
        return entriesForInning;
      }
    }
    
    // No data found for this inning and player
    return [];
  };

  // Calculate column index for a specific inning and PA position
  const getColumnIndexForInningAndPosition = (inning: number, position: number) => {
    const lineupSize = getLineupSize();
    let columnIndex = 0;
    
    // Add columns for all previous innings
    for (let i = 0; i < inning; i++) {
      columnIndex += lineupSize;
    }
    
    // Add position within current inning (0-based)
    columnIndex += position - 1;
    
    return columnIndex;
  };

  // This function helps us find the right PA for a specific position
  const findPAForPosition = (playerPAs: LocalScoreBookEntry[], paPosition: number) => {
    // First try to find a PA that exactly matches the round
    const exactMatch = playerPAs.find(entry => entry.round === paPosition);
    if (exactMatch) return exactMatch;
    
    // If no match, return null - we'll show an empty diamond with + button
    return null;
  };

  // Calculate the highest batter_seq_id for each inning
  const calculateHighestBatterSeqId = () => {
    const highestSeqByInning: Map<number, {seqId: number, orderNumber: number, position: number}> = new Map();
    
    displayedInnings.forEach(inningNum => {
      const inningEntries = transformedEntries.filter(entry => entry.inning_number === inningNum);
      
      if (inningEntries.length === 0) return;
      
      // Find the entry with the highest batter_seq_id
      const highestEntry = inningEntries.reduce((highest, current) => {
        return (current.batter_seq_id || 0) > (highest.batter_seq_id || 0) ? current : highest;
      }, inningEntries[0]);
      
      if (highestEntry && highestEntry.batter_seq_id) {
        highestSeqByInning.set(inningNum, {
          seqId: highestEntry.batter_seq_id,
          orderNumber: highestEntry.order_number,
          position: highestEntry.round || 1
        });
      }
    });
    
    return highestSeqByInning;
  };
  
  // Memoize the highest batter_seq_id calculations
  const highestBatterSeqByInning = useMemo(() => calculateHighestBatterSeqId(), [transformedEntries, displayedInnings]);

  // Add a new PA column
  const handleAddPAColumn = () => {
    setVisiblePAColumns(prev => Math.min(prev + 1, numberOfPAColumns + 1));
  };

  // Add a new PA round to the active inning
  const handleAddPARound = () => {
    // Get the current data for the active inning
    const activeInningData = transformedEntries.filter(entry => 
      entry.inning_number === activeInning
    );
    
    // Get the maximum PA round currently in this inning
    let maxCurrentRound = 1;
    if (activeInningData.length > 0) {
      maxCurrentRound = Math.max(...activeInningData.map(entry => entry.round || 1));
    }
    
    // Force show 2 columns for the active inning
    setForceAdditionalColumns(2);
    
    // Force a re-render of the component
    setTransformedEntries([...transformedEntries]);
  };

  // Memoize the BattingOrderTable component to ensure it only makes one API call
  const memoizedBattingOrderTable = useMemo(() => {
    // Create a stable memo key to ensure consistent rendering
    const memoKey = `${teamId}-${gameId}-${teamChoice}-${refreshTimestamp || Date.now()}`;
    
    // If we have preloaded lineups and they are already loaded for this team, pass that info
    const isPreloaded = lineupsPreloaded && (
      (teamChoice === 'home' && lineupsPreloaded.homeLineupLoaded) ||
      (teamChoice === 'away' && lineupsPreloaded.awayLineupLoaded)
    );
    
    return (
      <BattingOrderTable 
        key={memoKey}
        teamId={teamId} 
        gameId={gameId} 
        teamChoice={teamChoice}
        inningNumber={inningNumber}
        lineupsPreloaded={lineupsPreloaded}
        onLineupSizeUpdate={handleLineupSizeUpdate}
      />
    );
  }, [teamId, gameId, teamChoice, inningNumber, refreshTimestamp, lineupsPreloaded]);

  // Determine if a cell should be interactive based on the inning
  const isCellInteractive = (inningNum: number) => {
    return inningNum === activeInning;
  };

  // Check if we have any entries for the active inning
  useEffect(() => {
    const checkActiveInningData = async () => {
      if (!loading) {
        const activeInningEntries = transformedEntries.filter(
          entry => entry.inning_number === activeInning
        );
        
        // If we don't have any entries for the active inning, check if we need to fetch data
        if (activeInningEntries.length === 0) {
          // Create a unique key for this check to avoid duplicate calls
          const checkKey = `check-active-inning-${teamId}-${gameId}-${teamChoice}-${activeInning}`;
          
          if (shouldAllowApiCall(checkKey, 2000)) {
            await fetchInningData(activeInning);
          }
        }
      }
    };
    
    checkActiveInningData();
  }, [activeInning, loading]);

  // Clean up logging in the loadAllPreviousInnings function
  const loadAllPreviousInnings = async () => {
    const currentInningNum = parseInt(inningNumber);
    
    if (currentInningNum <= 1) {
      return false;
    }
    
    setLoading(true);
    
    try {
      // Create an array of innings to load
      const inningsToLoad = Array.from({ length: currentInningNum - 1 }, (_, i) => i + 1);
      
      // Get the list of innings we've already loaded
      const loadedInningNumbers = Object.keys(inningData).map(num => parseInt(num));
      
      // Only load innings we haven't loaded yet
      const inningsToFetch = inningsToLoad.filter(inningNum => !loadedInningNumbers.includes(inningNum));
      
      console.log(`Loading previous innings: ${inningsToFetch.join(', ')}`);
      
      if (inningsToFetch.length === 0) {
        console.log('All previous innings already loaded, just updating display state');
        // Even if we don't need to fetch, update the state to show all innings
        setShowingAllInnings(true);
        
        // Set displayed innings to include all innings 1 through current
        setDisplayedInnings(Array.from({ length: currentInningNum }, (_, i) => i + 1));
        
        setLoading(false);
        return true;
      }
      
      // Load each inning sequentially using the proper endpoint
      for (const inningNum of inningsToFetch) {
        console.log(`Loading previous inning ${inningNum} for ${teamChoice}`);
        await fetchInningData(inningNum);
      }
      
      // Now show all innings including the current one
      setShowingAllInnings(true);
      
      // Calculate the max inning to show (current inning)
      const maxInningToShow = currentInningNum;
      
      // Create array for all innings 1 through maxInningToShow
      const allInningsToShow = Array.from({ length: maxInningToShow }, (_, i) => i + 1);
      
      // Update displayed innings to show all innings up to the current one
      setDisplayedInnings(allInningsToShow);
      
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error loading previous innings:', error);
      setLoading(false);
      return false;
    }
  };

  // Add a function to track rendered innings
  const getRenderedInnings = (): number[] => {
    // Get all innings that we have data for
    const renderedInnings = Object.keys(inningData).map(num => parseInt(num));
    
    // Always include the active inning
    if (!renderedInnings.includes(activeInning)) {
      renderedInnings.push(activeInning);
    }
    
    // Sort the innings
    return renderedInnings.sort((a, b) => a - b);
  };

  if (loading) {
    return <div className="p-4">Loading scorecard data...</div>;
  }
  
  // Render all cells for the scorecard grid
  return (
    <div className="overflow-y-auto">
      <div className="relative">
        <div className="flex">
          {/* Batting Order Table with lineup preloaded flag */}
          <div className="flex-none" style={{ width: '168px' }}>
            {memoizedBattingOrderTable}
          </div>
          
          {/* Right side: BaseballDiamondCell Grid */}
          <div className="overflow-x-auto border-l-0">
            <table className="border-collapse border border-gray-200 border-l-0 min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  {/* Display headers for each displayed inning */}
                  {displayedInnings.map((inningNum) => {
                    const columnsForInning = getPAColumnsForInning(inningNum);
                    const isActiveInning = inningNum === activeInning;
                    const isLastInning = inningNum === displayedInnings[displayedInnings.length - 1];
                    
                    // Special border class for active inning
                    const borderClass = isActiveInning 
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-indigo-500' 
                      : 'text-gray-500';
                    
                    return (
                      <th 
                        key={`inning-header-${inningNum}`}
                        className={`border p-1 text-center text-xs font-medium normal-case tracking-wider ${borderClass}`}
                        colSpan={columnsForInning}
                        style={{ 
                          height: '25px',
                          verticalAlign: 'bottom',
                          position: 'relative'
                        }}
                      >
                        <div className="flex items-center justify-center px-1">
                          <span>Inning {inningNum}</span>
                        </div>
                        {isActiveInning && (
                          <div className="absolute" style={{ right: '-30px', top: '-12px', zIndex: 50 }}>
                            <button
                              onClick={handleAddPARound}
                              className="bg-blue-700/80 hover:bg-blue-800/90 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transform transition-transform hover:scale-105 flex items-center justify-start pl-1 pr-5"
                              title="Add another PA round"
                              style={{ 
                                height: '60px', 
                                width: '45px',
                                border: 'none',
                                position: 'relative'
                              }}
                            >
                              <span 
                                className="text-white font-bold text-xs" 
                                style={{ 
                                  position: 'absolute',
                                  top: '45%',
                                  left: '5px'
                                }}
                              >&gt;</span>
                            </button>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
                
                <tr>
                  {/* PA headers for all columns across all displayed innings */}
                  {displayedInnings.flatMap(inningNum => {
                    const columnsForInning = getPAColumnsForInning(inningNum);
                    const isActiveInning = inningNum === activeInning;
                    
                    // Generate headers only for the number of columns needed for this inning
                    return Array.from({ length: columnsForInning }).map((_, i) => {
                      const isLastColumn = i === columnsForInning - 1;
                      
                      // Calculate PA number within this inning - always start with PA 1
                      const paNumber = i + 1;
                      
                      return (
                        <th 
                          key={`pa-header-${inningNum}-${i+1}`}
                          className={`border p-1 text-center text-xs font-medium normal-case tracking-wider ${isActiveInning ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
                          style={{ 
                            width: '81px',
                            minWidth: '81px', 
                            maxWidth: '81px',
                            height: '26px',
                            verticalAlign: 'bottom'
                          }}
                        >
                          <div className="flex items-center justify-center">
                            PA {paNumber}
                          </div>
                        </th>
                      );
                    });
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Use the lineup size from getLineupSize function */}
                {Array.from({ length: getLineupSize() }).map((_, index) => {
                  const orderNumber = index + 1;
                  
                  return (
                    <tr 
                      key={index} 
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      style={{ height: '61px' }}
                    >
                      {/* Render PA cells for this player by inning */}
                      {displayedInnings.flatMap(inningNum => {
                        const columnsForInning = getPAColumnsForInning(inningNum);
                        const playerPAsInInning = getPlayerPAsByInning(orderNumber, inningNum);
                        const isActiveInning = inningNum === activeInning;
                        
                        // Generate cells only for the number of columns needed for this inning
                        return Array.from({ length: columnsForInning }).map((_, positionInInning) => {
                          // Get the actual plate appearance for this position, if any
                          const paPosition = positionInInning + 1;
                          
                          // Find the PA for this position in the inning
                          const pa = findPAForPosition(playerPAsInInning, paPosition);
                          
                          // For column index, we need to calculate the overall position
                          // by summing up columns from previous innings
                          let columnIndex = 0;
                          for (let i = 0; i < displayedInnings.indexOf(inningNum); i++) {
                            const prevInningNum = displayedInnings[i];
                            columnIndex += getPAColumnsForInning(prevInningNum);
                          }
                          
                          // Add the position within the current inning
                          columnIndex += positionInInning;
                          
                          return (
                            <td 
                              key={`pa-${inningNum}-${positionInInning}`} 
                              className={`border p-0 text-xs text-center align-top ${isActiveInning ? 'bg-blue-50' : ''}`} 
                              style={{ 
                                height: '60px',
                                ...(highestBatterSeqByInning.get(inningNum)?.orderNumber === orderNumber && 
                                   highestBatterSeqByInning.get(inningNum)?.position === paPosition ? 
                                   { borderBottom: '3px solid #4B5563' } : {})
                              }}
                            >
                              {pa ? (
                                // Existing plate appearance - display it
                                <BaseballDiamondCell 
                                  pa={pa as any || null}
                                  onClick={() => isActiveInning && onPlateAppearanceClick(pa || null, orderNumber, columnIndex)}
                                  isInteractive={isActiveInning}
                                />
                              ) : (
                                <div className="h-full flex items-center justify-center" style={{ width: '100%' }}>
                                  {isActiveInning ? (
                                    // Active inning with no PA - show add button
                                    <button
                                      onClick={() => {
                                        // Get the next available batter_seq_id
                                        const nextSeqId = getNextBatterSeqId();
                                        
                                        // Create a minimal PA object with essential data for new plate appearance
                                        const newPa: Partial<LocalScoreBookEntry> = {
                                          order_number: orderNumber,
                                          batting_order_position: orderNumber,
                                          batter_seq_id: nextSeqId,
                                          round: paPosition,
                                          inning_number: inningNum,
                                          team_id: teamId,
                                          game_id: gameId,
                                          home_or_away: teamChoice,
                                          // Initialize badge properties with default values
                                          slap: 0,
                                          late_swings: 0,
                                          fouls: 0, // Explicitly set fouls to 0 to prevent incorrect values
                                          fouls_after_two_strikes: 0,
                                          pitch_count: 0, // Ensure pitch count starts at 0
                                          bases_reached: "",
                                          why_base_reached: "",
                                          pa_result: "",
                                          balls_before_play: 0,
                                          strikes_before_play: 0,
                                          sac: 0, // Initialize sac field to 0
                                          bunt: 0, // Initialize bunt field to 0
                                          qab: 0, // Initialize qab field to 0
                                        };
                                        
                                        console.log('Creating new PA with order_number:', orderNumber, 'and batting_order_position:', orderNumber);
                                        
                                        // Pass the partial PA object for creating a new plate appearance
                                        onPlateAppearanceClick(newPa as LocalScoreBookEntry, orderNumber, columnIndex);
                                      }}
                                      className="relative h-10 w-20 flex items-center justify-center transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400"
                                      title="Add plate appearance"
                                    >
                                      {/* Diamond shape - exactly like in BaseballField */}
                                      <div className="absolute transform rotate-45 w-6 h-6 border border-gray-400 bottom-1"></div>
                                      
                                      {/* Green plus inside diamond with circle background */}
                                      <div 
                                        className="absolute bg-white rounded-full flex items-center justify-center"
                                        style={{
                                          top: '61%',
                                          left: '50%',
                                          transform: 'translate(-50%, -50%)',
                                          width: '16px',
                                          height: '16px',
                                          zIndex: 10,
                                          border: '1.0px solid #22c55e'
                                        }}
                                      >
                                        <span className="text-green-500 font-bold" style={{ fontSize: '12px', lineHeight: 1 }}>+</span>
                                      </div>
                                    </button>
                                  ) : (
                                    // Not active inning, and no PA - show empty diamond
                                    <div className="relative h-10 w-10 flex items-center justify-center cursor-not-allowed opacity-50">
                                      <div className="absolute transform rotate-45 w-6 h-6 border border-gray-300 bottom-1"></div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        });
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ScoreCardGrid; 