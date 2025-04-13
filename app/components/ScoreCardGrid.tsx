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
  plate_appearances?: {
    [inningNumber: string]: {
      pa_rounds?: {
        [round: string]: {
          [batterId: string]: {
            order_number: number;
            details: PlateAppearanceDetail;
          }
        }
      };
    }
  };
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
  const [actualLineupSize, setActualLineupSize] = useState(9);

  // Calculate lineup size from scorebook entries and actual lineup size
  const lineupSize = useMemo(() => {
    const maxOrderNumber = Math.max(
      ...scorebookEntries
        .filter(entry => entry.home_or_away === teamChoice)
        .map(entry => entry.order_number || 0),
      actualLineupSize,
      9
    );
    return maxOrderNumber;
  }, [scorebookEntries, actualLineupSize, teamChoice]);

  // Handler for lineup size updates from BattingOrderTable
  const handleLineupSizeUpdate = (size: number) => {
    setActualLineupSize(size);
  };

  // Generate array of innings to show - from 1 to current inning
  const inningsToShow = propInningsToShow || Array.from(
    { length: parseInt(inningNumber) }, 
    (_, i) => i + 1
  );

  // Get PAs for a specific player and round in a specific inning
  const getPlayerPAForRound = (playerId: number, round: number, inningNum: number) => {
    const existingPA = scorebookEntries.find(
      pa => pa.batter_seq_id === playerId && 
            pa.pa_round === round && 
            pa.inning_number === inningNum
    );
    if (existingPA) {
      return {
        ...existingPA,
        pa_round: existingPA.pa_round,
        pa_why: existingPA.pa_why,
        pa_result: existingPA.pa_result,
        hit_to: existingPA.hit_to,
        out: existingPA.out,
        out_at: existingPA.out_at,
        balls_before_play: existingPA.balls_before_play,
        strikes_before_play: existingPA.strikes_before_play,
        pitch_count: existingPA.pitch_count,
        hard_hit: existingPA.hard_hit,
        late_swings: existingPA.late_swings,
        slap: existingPA.slap,
        qab: existingPA.qab,
        rbi: existingPA.rbi,
        br_result: existingPA.br_result,
        wild_pitch: existingPA.wild_pitch,
        passed_ball: existingPA.passed_ball,
        sac: existingPA.sac,
        br_stolen_bases: existingPA.br_stolen_bases,
        base_running_hit_around: existingPA.base_running_hit_around,
        pa_error_on: existingPA.pa_error_on,
        br_error_on: existingPA.br_error_on,
        fouls: existingPA.fouls,
        strikes_watching: existingPA.strikes_watching,
        strikes_swinging: existingPA.strikes_swinging,
        strikes_unsure: existingPA.strikes_unsure,
        ball_swinging: existingPA.ball_swinging,
        bunt: existingPA.bunt
      };
    }
    return null;
  };

  // Calculate max rounds for a specific inning
  const getMaxRounds = (inningNum: number) => {
    const inningEntries = scorebookEntries.filter(entry => entry.inning_number === inningNum);
    if (inningEntries.length === 0) return 1;
    const rounds: number[] = inningEntries.map(entry => entry.pa_round);
    return Math.max(1, ...rounds);
  };

  // Add helper function to get the next round for a player in an inning
  const getNextRoundForPlayer = (orderNumber: number, inningNum: number) => {
    // Get all PAs for this player in this inning
    const playerPAs = scorebookEntries.filter(entry => 
      entry.order_number === orderNumber && 
      entry.inning_number === inningNum
    );
    
    // If no PAs yet, start with round 1
    if (playerPAs.length === 0) return 1;
    
    // Find the highest round for this player
    const maxRound = Math.max(...playerPAs.map(pa => pa.pa_round));
    return maxRound + 1;
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
    console.log('canAddPlateAppearance called with:', {
      orderNumber,
      round,
      inningNum,
      teamChoice,
      isInteractive: isCellInteractive(inningNum)
    });

    // If it's not the active inning, can't add PA
    if (!isCellInteractive(inningNum)) {
      console.log('Not interactive inning, returning false');
      return false;
    }

    // Get all PAs in this inning
    const inningPAs = scorebookEntries.filter(entry => 
      entry.inning_number === inningNum && 
      entry.home_or_away === teamChoice
    );
    console.log('Found PAs in this inning:', inningPAs);

    // Check if this batter already has a PA in this round
    const hasExistingPA = inningPAs.some(pa => 
      pa.order_number === orderNumber && 
      pa.pa_round === round
    );
    console.log('Has existing PA in this round:', {
      hasExistingPA,
      orderNumber,
      round,
      inningPAs: inningPAs.map(pa => ({
        order_number: pa.order_number,
        pa_round: pa.pa_round,
        home_or_away: pa.home_or_away
      }))
    });

    // If batter already has a PA in this round, they can't add another
    if (hasExistingPA) {
      console.log('Has existing PA, returning false');
      return false;
    }

    console.log('No existing PA, returning true');
    // Allow adding PA for any order number that hasn't batted yet
    return true;
  };

  const renderPACell = (playerPAs: ScoreBookEntry[], columnIndex: number, orderNumber: number, inningNum: number) => {
    // Find the PA for this cell
    const pa = playerPAs.find(p => 
      p.order_number === orderNumber && 
      p.pa_round === columnIndex + 1 &&
      p.inning_number === inningNum
    ) || null;
    
    // Check if this order number is within the actual lineup size
    const playerExists = orderNumber <= actualLineupSize;
    
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
          pa={pa}
          onClick={() => onPlateAppearanceClick(pa, orderNumber, columnIndex)}
          isInteractive={isCellInteractive(inningNum)}
          canAddPA={canAddPlateAppearance(orderNumber, columnIndex + 1, inningNum)}
        />
      </td>
    );
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
              onLineupSizeUpdate={handleLineupSizeUpdate}
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
                    
                    return Array.from({ length: maxRounds }, (_, i) => {
                      return (
                        <th
                          key={`pa-header-${inningNum}-${i+1}`}
                          className={`border p-1 text-center text-xs font-medium normal-case tracking-wider ${
                            isActiveInning ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            PA {i + 1}
                          </div>
                        </th>
                      );
                    });
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
                          return renderPACell(scorebookEntries, roundIndex, orderNumber, inningNum);
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
                        return renderPACell(scorebookEntries, roundIndex, orderNumber, inningNum);
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