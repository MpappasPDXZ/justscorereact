'use client';

import { useState, useEffect, useMemo } from 'react';
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
}

interface PlateAppearanceData {
  team_id: number;
  game_id: number;
  team_choice: string;
  pa_available: string;
  plate_appearances: {
    [inningNumber: string]: {
      rounds: {
        [orderNumber: string]: {
          order_number: number;
          details: PlateAppearanceDetail;
        }
      }
    }
  }
}

const ScoreCardGrid = ({ 
  teamId, 
  gameId, 
  inningNumber,
  teamChoice, 
  scorebookEntries,
  onPlateAppearanceClick,
  showPrecedingInnings = false,
  plateAppearanceData,
  lineupsPreloaded
}: ScoreCardGridProps) => {
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

  // Update active inning when inningNumber changes and fetch data for that inning
  useEffect(() => {
    const newInningNum = parseInt(inningNumber);
    
    // When active inning changes, make sure we have data for that inning
    // and all preceding innings
    const loadInningData = async () => {
      if (!loading) {
        // First, refresh all innings data to get the complete picture
        await refreshAllInningsData();
        
        // Then, if needed, fetch specific inning data for each displayed inning
        for (let i = 1; i <= newInningNum; i++) {
          // Check if we already have data for this inning
          const hasInningData = transformedEntries.some(entry => entry.inning_number === i);
          
          if (!hasInningData) {
            // If we don't have data for this inning yet, fetch it
            await fetchInningData(i);
          }
        }
      }
    };
    
    setActiveInning(newInningNum);
    loadInningData();
  }, [inningNumber, loading]);

  // Callback function to receive lineup size from BattingOrderTable
  const handleLineupSizeUpdate = (size: number) => {
    if (size > 0) {
      setActualLineupSize(size);
    }
  };

  // Function to force refresh all innings data
  const refreshAllInningsData = async () => {
    // Fetch the main scorecard data for all innings
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/${teamChoice}/scorecardgrid_paonly`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh scorecard data: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the nested structure to flat array
      const transformed = transformPlateAppearanceData(data);
      setTransformedEntries(transformed);
      
      // Initialize the inning data state with data grouped by inning
      const inningDataMap: {[inning: number]: LocalScoreBookEntry[]} = {};
      transformed.forEach(entry => {
        if (entry.inning_number) {
          if (!inningDataMap[entry.inning_number]) {
            inningDataMap[entry.inning_number] = [];
          }
          inningDataMap[entry.inning_number].push(entry);
        }
      });
      setInningData(inningDataMap);
      
      return transformed;
    } catch (error) {
      console.error("Error refreshing all innings data:", error);
      return [];
    }
  };
  
  // Calculate which innings should be displayed
  useEffect(() => {
    if (!loading && transformedEntries.length > 0) {
      // Get all innings with data
      const innings = transformedEntries
        .map(entry => entry.inning_number)
        .filter((inning): inning is number => inning !== undefined);
      
      // Find unique innings
      const uniqueInnings = Array.from(new Set(innings)).sort((a, b) => a - b);
      
      // Find the highest inning with at least one out
      let highestInningWithOut = 1;
      for (const entry of transformedEntries) {
        if (entry.pa_result === "0" && entry.inning_number && entry.inning_number > highestInningWithOut) {
          highestInningWithOut = entry.inning_number;
        }
      }
      
      // Max available inning is the highest inning with an out plus one (next inning)
      const maxInning = Math.max(highestInningWithOut + 1, parseInt(inningNumber));
      setMaxAvailableInning(maxInning);
      
      // Get the current inning number
      const currentInningNum = parseInt(inningNumber);
      
      // Create array of innings to display (all preceding innings up to current)
      const inningsToDisplay = [];
      for (let i = 1; i <= currentInningNum; i++) {
        inningsToDisplay.push(i);
      }
      
      setDisplayedInnings(inningsToDisplay);
    } else {
      // Default to just the current inning if no data available
      setDisplayedInnings([parseInt(inningNumber)]);
    }
  }, [loading, transformedEntries, inningNumber]);

  // On initial mount, fetch all data
  useEffect(() => {
    // Only run this on mount
    if (!scorebookEntries?.length && !plateAppearanceData) {
      refreshAllInningsData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to fetch scorecard data directly from the component
  useEffect(() => {
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
      setLoading(false);
      return;
    }
    
    // If plateAppearanceData is provided, use it directly instead of fetching
    if (plateAppearanceData) {
      const transformed = transformPlateAppearanceData(plateAppearanceData);
      setTransformedEntries(transformed);
      setLoading(false);
      return;
    }
    
    // This will only be used on initial mount or when props change
    refreshAllInningsData();
  }, [teamId, gameId, teamChoice, scorebookEntries, plateAppearanceData]);

  // Function to fetch data for a specific inning
  const fetchInningData = async (inningNum: number) => {
    if (!teamId || !gameId || !teamChoice) return;
    
    try {
      // Use the specific inning endpoint
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/new/${teamId}/${gameId}/${teamChoice}/${inningNum}/scorecardgrid_paonly_inningonly`;
      
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
      
      // Transform the nested structure to flat array
      const transformed = transformPlateAppearanceData(data);
      
      // Update the inning data state
      setInningData(prevData => {
        const newData = {
          ...prevData,
          [inningNum]: transformed
        };
        return newData;
      });
      
      // Also update transformed entries with this data
      setTransformedEntries(prevEntries => {
        // Remove any existing entries for this inning
        const filteredEntries = prevEntries.filter(
          entry => entry.inning_number !== inningNum
        );
        
        // Add the new entries for this inning
        const updatedEntries = [...filteredEntries, ...transformed];
        return updatedEntries;
      });
      
      return transformed;
    } catch (error) {
      console.error(`Error fetching inning ${inningNum} data:`, error);
      return [];
    }
  };

  // Function to transform the API response into ScoreBookEntry[] format
  const transformPlateAppearanceData = (apiData: PlateAppearanceData): LocalScoreBookEntry[] => {
    const entries: LocalScoreBookEntry[] = [];
    
    if (!apiData || !apiData.plate_appearances) {
      return entries;
    }
    
    // Iterate through innings
    Object.keys(apiData.plate_appearances).forEach(inningNumber => {
      const inning = apiData.plate_appearances[inningNumber];
      
      // Iterate through rounds for this inning
      if (inning?.rounds) {
        Object.keys(inning.rounds).forEach(orderNumberKey => {
          const paData = inning.rounds[orderNumberKey];
          
          if (paData?.details) {
            const details = paData.details;
            
            // Create a ScoreBookEntry from the details
            const entry: LocalScoreBookEntry = {
              team_id: apiData.team_id.toString(),
              game_id: apiData.game_id.toString(),
              inning_number: details.inning_number,
              home_or_away: apiData.team_choice,
              order_number: paData.order_number,
              batter_seq_id: details.batter_seq_id,
              batter_name: "", // Will be filled from lineup data
              batter_jersey_number: "", // Will be filled from lineup data
              
              // Result fields
              why_base_reached: details.pa_why,
              //pa_result is an int between 0 and 4
              pa_result: details.pa_result.toString(), 
              //br_result is an int between 0 and 4
              bases_reached: details.pa_result.toString(),
              result_type: "",
              detailed_result: details.hit_to.toString(),
              base_running: "",
              
              // Pitch count details
              balls_before_play: details.balls_before_play,
              strikes_before_play: details.strikes_before_play,
              strikes_watching: 0,
              strikes_swinging: 0,
              strikes_unsure: 0,
              fouls_after_two_strikes: 0,
              base_running_stolen_base: 0,
              // Explicitly parse pa_round as number to ensure correct type
              round: parseInt(details.pa_round?.toString() || '1'),
              
              // Special stats
              wild_pitch: details.wild_pitch,
              passed_ball: details.passed_ball,
              
              // Error information
              error_on: details.pa_error_on?.length ? details.pa_error_on[0].toString() : undefined,
              // Convert br_result to number if it exists, otherwise leave as undefined
              br_result: details.br_result !== undefined ? parseInt(details.br_result.toString()) : undefined,
              
              // Badge properties
              slap: details.slap,
              late_swings: details.late_swings,
              fouls: details.fouls || 0 // Use fouls field if available, otherwise default to 0
            };
            
            entries.push(entry);
          }
        });
      }
    });
    
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
    
    // Fall back to the overall transformed entries
    if (!transformedEntries) return [];
    
    return transformedEntries
      .filter(entry => 
        entry.order_number === orderNumber && 
        entry.inning_number === inningNumber
      )
      .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
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
    // Only render BattingOrderTable once we have processed entries
    if (loading) return null;
    
    // Create a stable memo key to ensure consistent rendering
    const memoKey = `${teamId}-${gameId}-${teamChoice}`;
    
    return (
      <BattingOrderTable 
        key={memoKey}
        teamId={teamId} 
        gameId={gameId} 
        teamChoice={teamChoice}
        inningNumber={inningNumber}
        onLineupSizeUpdate={handleLineupSizeUpdate}
      />
    );
  }, [teamId, gameId, teamChoice, inningNumber, loading]);

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
          // Attempt to refresh all data to ensure we have everything
          await refreshAllInningsData();
        }
      }
    };
    
    checkActiveInningData();
  }, [activeInning, loading]);

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
                                          strikes_before_play: 0
                                        };
                                        
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
};

export default ScoreCardGrid; 