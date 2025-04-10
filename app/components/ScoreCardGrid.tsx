'use client';

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import BaseballDiamondCell from './BaseballDiamondCell';
import BattingOrderTable from './BattingOrderTable';
import { ScoreBookEntry } from '@/app/types/scoreTypes';

type LocalScoreBookEntry = ScoreBookEntry;

interface ScoreCardGridProps {
  scorebookEntries: LocalScoreBookEntry[];
  inningNumber: string;
  teamId: string;
  gameId: string;
  teamChoice: 'home' | 'away';
  onPlateAppearanceClick: (pa: any | null, orderNumber: number, columnIndex: number) => void;
  showPrecedingInnings?: boolean;
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
  scorebook_entries: any[];
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

// Define interface for ref methods
export interface ScoreCardGridRef {
  refreshInnings: (innings: number[], preLoadedData?: { [key: string]: any }) => void;
  loadAllPreviousInnings: () => Promise<any[]>;
  handleAddOrderNumber: () => void;
}

const ScoreCardGrid = forwardRef<ScoreCardGridRef, ScoreCardGridProps>((props, ref) => {
  const { 
    scorebookEntries, 
    inningNumber, 
    teamId, 
    gameId, 
    teamChoice, 
    onPlateAppearanceClick,
    inningsToShow: propInningsToShow,
    refreshTimestamp
  } = props;
  

  const [activeInning, setActiveInning] = useState<number>(parseInt(inningNumber));
  const [visibleInnings, setVisibleInnings] = useState<number[]>([]);

  // Calculate lineup size from scorebook entries
  const lineupSize = useMemo(() => {
    const maxOrderNumber = Math.max(...scorebookEntries.map(entry => entry.order_number || 0), 0);
    // Always ensure lineup size is at least 9
    return Math.max(maxOrderNumber, 9);
  }, [scorebookEntries]);

  // Generate array of innings to show - from 1 to current inning
  const inningsToShow = propInningsToShow || Array.from(
    { length: parseInt(inningNumber) }, 
    (_, i) => i + 1
  );

  // Get PAs for a specific player and round in a specific inning
  const getPlayerPAForRound = (orderNumber: number, round: number, inningNum: number) => {
    const pa = scorebookEntries.find(entry => 
      entry.order_number === orderNumber && 
      entry.pa_round === round &&  // Changed from round to pa_round to match API
      entry.inning_number === inningNum
    );
    
    if (pa) {
      // Transform the PA data into the format expected by BaseballField
      const enrichedPa = {
        ...pa,
        team_id: pa.team_id || teamId,
        game_id: pa.game_id || gameId,
        inning_number: pa.inning_number || inningNum,
        home_or_away: pa.home_or_away || teamChoice,
        // Add the fields expected by BaseballField
        paResult: pa.pa_why || pa.pa_result?.toString() || '',  // Use pa_why as primary source
        baseRunning: pa.br_result?.toString() || '',  // Use br_result for base running
        balls: pa.balls_before_play || 0,
        strikes: pa.strikes_before_play || 0,
        fouls: pa.fouls || 0,
        // Add additional fields that might be needed
        base_running_hit_around: pa.base_running_hit_around || [],
        br_stolen_bases: pa.br_stolen_bases || [],
        pa_error_on: pa.pa_error_on || [],
        br_error_on: pa.br_error_on || []
      };
      return enrichedPa;
    }
    
    return null;
  };

  // Calculate max rounds for a specific inning
  const getMaxRounds = (inningNum: number) => {
    const inningEntries = scorebookEntries.filter(entry => entry.inning_number === inningNum);
    if (!inningEntries.length) return 1; // Always show PA 1
    
    // Find the highest PA round that has data
    const maxRound = Math.max(...inningEntries.map(entry => entry.pa_round || 1));
    return maxRound; // Only show rounds that have data
  };

  // Add state to track manually added rounds
  const [additionalRounds, setAdditionalRounds] = useState<{[key: number]: number}>({});

  // Function to handle adding a new round
  const handleAddRound = (inningNum: number) => {
    const currentMaxRounds = getMaxRounds(inningNum);
    setAdditionalRounds(prev => ({
      ...prev,
      [inningNum]: (prev[inningNum] || currentMaxRounds) + 1
    }));
  };

  // Get the number of rounds to display for an inning, considering both data and manually added rounds
  const getDisplayedRounds = (inningNum: number) => {
    const dataRounds = getMaxRounds(inningNum);
    const manualRounds = additionalRounds[inningNum] || 0;
    return Math.max(dataRounds, manualRounds);
  };

  // Update active inning when inningNumber changes
  useEffect(() => {
    setActiveInning(parseInt(inningNumber));
  }, [inningNumber]);

  // Add effect to refresh active inning when refreshTimestamp changes
  useEffect(() => {
    if (refreshTimestamp) {
      // Force a refresh of the active inning by setting it to the current inning number
      setActiveInning(parseInt(inningNumber));
      
      // Log the current state for debugging
      console.log(`[REFRESH] Current inning number: ${inningNumber}, Active inning: ${activeInning}`);
    }
  }, [refreshTimestamp, inningNumber]);

  // Determine if a cell should be interactive
  const isCellInteractive = (inningNum: number) => {
    return inningNum === activeInning;
  };

  const [showingAllInnings, setShowingAllInnings] = useState(false);
  // Add state to track manually added order numbers
  const [additionalOrderNumbers, setAdditionalOrderNumbers] = useState<number[]>([]);

  // Function to handle adding a new order number
  const handleAddOrderNumber = () => {
    // Find the next available order number
    const existingOrderNumbers = new Set([
      ...scorebookEntries.map(entry => entry.order_number),
      ...additionalOrderNumbers
    ]);
    
    let nextOrderNumber = 1;
    while (existingOrderNumbers.has(nextOrderNumber)) {
      nextOrderNumber++;
    }
    
    setAdditionalOrderNumbers(prev => [...prev, nextOrderNumber]);
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    refreshInnings: (innings: number[], preLoadedData?: { [key: string]: any }) => {
      // Implementation
    },
    loadAllPreviousInnings: async () => {
      // Implementation
      return [];
    },
    handleAddOrderNumber
  }));

  // Add helper function to check if a plate appearance can be added
  const canAddPlateAppearance = (orderNumber: number, round: number, inningNum: number) => {
    // If it's not the active inning, can't add PA
    if (!isCellInteractive(inningNum)) {
      return false;
    }

    // Get all PAs in this inning
    const inningPAs = scorebookEntries.filter(entry => entry.inning_number === inningNum);

    // Check if this batter already has a PA in this round
    const hasExistingPA = inningPAs.some(pa => 
      pa.order_number === orderNumber && 
      pa.pa_round === round
    );

    // If batter already has a PA in this round, they can't add another
    if (hasExistingPA) {
      return false;
    }

    // Allow adding PA for any order number that hasn't batted yet
    return true;
  };

  return (
    <div className="overflow-y-auto">
      <div className="relative">
        <div className="flex">
          {/* Batting Order Table */}
          <div className="flex-none" style={{ width: '168px' }}>
            <BattingOrderTable
              teamId={teamId}
              gameId={gameId}
              teamChoice={teamChoice}
              inningNumber={inningNumber}
            />
          </div>
          
          {/* Right side: BaseballDiamondCell Grid */}
          <div className="overflow-x-auto border-l-0">
            <table className="border-collapse border border-gray-200 border-l-0 min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  {inningsToShow.map((inningNum) => {
                    if (!props.showPrecedingInnings && inningNum !== activeInning) {
                      return null;
                    }
                    const maxRounds = getDisplayedRounds(inningNum);
                    const isActiveInning = inningNum === activeInning;
                    
                    return (
                      <th
                        key={`inning-header-${inningNum}`}
                        className={`border p-1 text-center text-xs font-medium normal-case tracking-wider ${
                          isActiveInning ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'
                        }`}
                        colSpan={maxRounds}
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
                          <div 
                            className="absolute" 
                            style={{ 
                              right: '-40px',
                              top: '0px',
                              height: '51px',
                              width: '50px',
                              zIndex: 10 
                            }}
                          >
                            <button
                              onClick={() => handleAddRound(inningNum)}
                              className="bg-indigo-600/80 hover:bg-indigo-700/90 h-full w-full rounded-r-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transform transition-transform hover:scale-105 flex items-center"
                              title="Add another PA round"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="currentColor" 
                                className="w-5 h-4 text-white -ml-[3.2px]"
                              >
                                <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
                
                <tr>
                  {inningsToShow.map((inningNum) => {
                    if (!props.showPrecedingInnings && inningNum !== activeInning) {
                      return null;
                    }
                    const maxRounds = getDisplayedRounds(inningNum);
                    const isActiveInning = inningNum === activeInning;
                    
                    return Array.from({ length: maxRounds }, (_, i) => (
                      <th
                        key={`pa-header-${inningNum}-${i+1}`}
                        className={`border p-1 text-center text-xs font-medium normal-case tracking-wider ${
                          isActiveInning ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'
                        }`}
                        style={{ 
                          width: '81px',
                          minWidth: '81px', 
                          maxWidth: '81px',
                          height: '26px',
                          verticalAlign: 'bottom'
                        }}
                      >
                        <div className="flex items-center justify-center">
                          PA {i + 1}
                        </div>
                      </th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: lineupSize }, (_, index) => {
                  const orderNumber = index + 1;
                  return (
                    <tr 
                      key={orderNumber}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      style={{ height: '61px' }}
                    >
                      {inningsToShow.map((inningNum) => {
                        if (!props.showPrecedingInnings && inningNum !== activeInning) {
                          return null;
                        }
                        const maxRounds = getDisplayedRounds(inningNum);
                        const isActiveInning = isCellInteractive(inningNum);
                        
                        return Array.from({ length: maxRounds }, (_, roundIndex) => {
                          const round = roundIndex + 1;
                          const pa = getPlayerPAForRound(orderNumber, round, inningNum);
                          
                          return (
                            <td 
                              key={`${orderNumber}-${inningNum}-${round}`}
                              className="border p-0 text-xs text-center align-top"
                              style={{ height: '60px' }}
                            >
                              {pa ? (
                                <BaseballDiamondCell
                                  pa={pa}
                                  isInteractive={isActiveInning}
                                  onClick={() => {
                                    if (isActiveInning) {
                                      onPlateAppearanceClick(pa, orderNumber, roundIndex);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="h-full flex items-center justify-center" style={{ width: '100%' }}>
                                  {canAddPlateAppearance(orderNumber, round, inningNum) ? (
                                    <button
                                      onClick={() => {
                                        const nextSeqId = Math.max(...scorebookEntries.map(e => e.batter_seq_id || 0), 0) + 1;
                                        const newPa = {
                                          order_number: orderNumber,
                                          batting_order_position: orderNumber,
                                          batter_seq_id: nextSeqId,
                                          pa_round: round,
                                          inning_number: inningNum,
                                          team_id: parseInt(teamId),
                                          game_id: parseInt(gameId),
                                          home_or_away: teamChoice,
                                          slap: 0,
                                          late_swings: 0,
                                          fouls: 0,
                                          fouls_after_two_strikes: 0,
                                          pitch_count: 0,
                                          bases_reached: "",
                                          why_base_reached: "",
                                          pa_result: "",
                                          balls_before_play: 0,
                                          strikes_before_play: 0,
                                          sac: 0,
                                          bunt: 0,
                                          qab: 0,
                                        };
                                        onPlateAppearanceClick(newPa, orderNumber, roundIndex);
                                      }}
                                      className="relative"
                                    >
                                      {/* Diamond outline */}
                                      <div className="absolute transform rotate-45 w-6 h-6 border border-gray-300"></div>
                                      
                                      {/* Simple plus sign */}
                                      <div className="relative flex items-center justify-center w-6 h-6">
                                        <span 
                                          className="text-emerald-500 font-medium" 
                                          style={{ 
                                            fontSize: 'calc(0.68rem * 2.2)',
                                            lineHeight: 1,
                                            transform: 'translateY(-2px)'
                                          }}
                                        >
                                          +
                                        </span>
                                      </div>
                                    </button>
                                  ) : (
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
                
                {/* Render additional order numbers */}
                {additionalOrderNumbers.map(orderNumber => (
                  <tr 
                    key={`additional-${orderNumber}`}
                    className="bg-yellow-50"
                    style={{ height: '61px' }}
                  >
                    {inningsToShow.map((inningNum) => {
                      if (!props.showPrecedingInnings && inningNum !== activeInning) {
                        return null;
                      }
                      const maxRounds = getDisplayedRounds(inningNum);
                      const isActiveInning = isCellInteractive(inningNum);
                      
                      return Array.from({ length: maxRounds }, (_, roundIndex) => {
                        const round = roundIndex + 1;
                        const pa = getPlayerPAForRound(orderNumber, round, inningNum);
                        
                        return (
                          <td 
                            key={`${orderNumber}-${inningNum}-${round}`}
                            className="border p-0 text-xs text-center align-top"
                            style={{ height: '60px' }}
                          >
                            {pa ? (
                              <BaseballDiamondCell
                                pa={pa}
                                isInteractive={isActiveInning}
                                onClick={() => {
                                  if (isActiveInning) {
                                    onPlateAppearanceClick(pa, orderNumber, roundIndex);
                                  }
                                }}
                              />
                            ) : (
                              <div className="h-full flex items-center justify-center" style={{ width: '100%' }}>
                                {canAddPlateAppearance(orderNumber, round, inningNum) ? (
                                  <button
                                    onClick={() => {
                                      const nextSeqId = Math.max(...scorebookEntries.map(e => e.batter_seq_id || 0), 0) + 1;
                                      const newPa = {
                                        order_number: orderNumber,
                                        batting_order_position: orderNumber,
                                        batter_seq_id: nextSeqId,
                                        pa_round: round,
                                        inning_number: inningNum,
                                        team_id: parseInt(teamId),
                                        game_id: parseInt(gameId),
                                        home_or_away: teamChoice,
                                        slap: 0,
                                        late_swings: 0,
                                        fouls: 0,
                                        fouls_after_two_strikes: 0,
                                        pitch_count: 0,
                                        bases_reached: "",
                                        why_base_reached: "",
                                        pa_result: "",
                                        balls_before_play: 0,
                                        strikes_before_play: 0,
                                        sac: 0,
                                        bunt: 0,
                                        qab: 0,
                                      };
                                      onPlateAppearanceClick(newPa, orderNumber, roundIndex);
                                    }}
                                    className="relative"
                                  >
                                    {/* Diamond outline */}
                                    <div className="absolute transform rotate-45 w-6 h-6 border border-gray-300"></div>
                                    
                                    {/* Simple plus sign */}
                                    <div className="relative flex items-center justify-center w-6 h-6">
                                      <span 
                                        className="text-emerald-500 font-medium" 
                                        style={{ 
                                          fontSize: 'calc(0.68rem * 2.2)',
                                          lineHeight: 1,
                                          transform: 'translateY(-2px)'
                                        }}
                                      >
                                        +
                                      </span>
                                    </div>
                                  </button>
                                ) : (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

ScoreCardGrid.displayName = 'ScoreCardGrid';

export default ScoreCardGrid;