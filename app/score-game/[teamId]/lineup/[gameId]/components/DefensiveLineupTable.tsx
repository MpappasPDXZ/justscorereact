import React, { memo, useCallback } from 'react';

// Defensive Player interface
export interface DefensivePlayer {
  jersey_number: string;
  name: string;
  order_number: number; // For defensive positions, 1=Pitcher, 2=Catcher, ..., 9=Right Field, 0=Bench
  inning_number: number;
  home_or_away: string;
  position_name?: string; // Optional name of the position for display
  batter_seq_id: number; // ID tracking when player was substituted in the inning (default 1 for starters)
  batter_seq_id_to: number; // ID tracking the last batter this player faced (default 999 for end of inning)
}

// Define the defensive positions
export const DEFENSIVE_POSITIONS = [
  { id: 0, shortName: 'BENCH', fullName: 'Bench' },
  { id: 1, shortName: 'P', fullName: 'Pitcher' },
  { id: 2, shortName: 'C', fullName: 'Catcher' },
  { id: 3, shortName: '1B', fullName: 'First Base' },
  { id: 4, shortName: '2B', fullName: 'Second Base' },
  { id: 5, shortName: '3B', fullName: 'Third Base' },
  { id: 6, shortName: 'SS', fullName: 'Shortstop' },
  { id: 7, shortName: 'LF', fullName: 'Left Field' },
  { id: 8, shortName: 'CF', fullName: 'Center Field' },
  { id: 9, shortName: 'RF', fullName: 'Right Field' },
];

// Helper function to get position name from order number
export const getPositionName = (orderNumber: number): string => {
  const position = DEFENSIVE_POSITIONS.find(pos => pos.id === orderNumber);
  return position ? position.shortName : '?';
};

// Helper function to get full position name from order number
export const getFullPositionName = (orderNumber: number): string => {
  const position = DEFENSIVE_POSITIONS.find(pos => pos.id === orderNumber);
  return position ? position.fullName : 'Unknown';
};

interface DefensiveLineupTableProps {
  players: DefensivePlayer[];
  isLoading: boolean;
  showActions?: boolean;
  onRemovePlayer?: (player: DefensivePlayer) => void;
  onMovePlayer?: (player: DefensivePlayer, direction: 'up' | 'down' | 'bench') => void;
  isReadOnly?: boolean;
  emptyMessage?: string;
  inningNumber?: number | null;
  currentInning?: number | null;
  onInningClick?: (inning: number) => void;
  allPlayers?: DefensivePlayer[]; // Add all players to check previous inning positions
}

const DefensiveLineupTable: React.FC<DefensiveLineupTableProps> = memo(({
  players,
  isLoading,
  showActions = false,
  onRemovePlayer,
  onMovePlayer,
  isReadOnly = false,
  emptyMessage = "No players in defensive lineup for this inning.",
  inningNumber = null,
  currentInning = null,
  onInningClick,
  allPlayers = [] // Default to empty array
}) => {
  // Handle inning header click - define this before any conditional returns
  const handleInningHeaderClick = useCallback(() => {
    if (inningNumber !== null && onInningClick) {
      onInningClick(inningNumber);
    }
  }, [inningNumber, onInningClick]);
  
  // Function to check if player had same position in previous inning
  const hasSamePositionAsPreviousInning = (player: DefensivePlayer): boolean => {
    // Don't show checkmark for inning 1 or bench players
    if (!inningNumber || inningNumber <= 1 || player.order_number === 0) {
      return false;
    }
    
    // Find this player in the previous inning
    const previousInningPlayer = allPlayers.find(p => 
      p.jersey_number === player.jersey_number && 
      p.inning_number === (inningNumber - 1) && 
      p.home_or_away === player.home_or_away
    );
    
    // Return true if player was in same position in previous inning
    return previousInningPlayer?.order_number === player.order_number;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-start py-6 max-w-3xl">
        <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (players.length === 0) {
    return (
      <p className="text-left text-gray-500 py-6 max-w-3xl">
        {emptyMessage}
      </p>
    );
  }
  
  // Calculate the total number of columns (adding position column)
  const columnCount = showActions ? 5 : 4;
  
  // Check if this is the current inning
  const isCurrentInning = inningNumber !== null && currentInning !== null && inningNumber === currentInning;
  
  return (
    <div className="max-w-3xl overflow-x-auto">
      <table className="min-w-full border-[0.5px] border-gray-200 rounded-md">
        <thead className="bg-gray-50">
          {inningNumber !== null && (
            <tr>
              <th 
                colSpan={columnCount} 
                className={`px-3 py-2 text-left text-sm font-bold border-b-[0.5px] ${
                  isCurrentInning 
                    ? 'text-indigo-600 bg-white border-indigo-600 py-2.5' 
                    : 'text-gray-900 bg-gray-100 border-gray-200'
                } ${onInningClick ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
                onClick={handleInningHeaderClick}
              >
                <div className="flex items-center">
                  {isCurrentInning ? 'Current: ' : ''}Inning {inningNumber}
                </div>
              </th>
            </tr>
          )}
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider w-10 border-b-[0.5px] border-gray-200">
              Pos
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider w-13 border-b-[0.5px] border-gray-200">
              Jersey #
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider w-36 border-b-[0.5px] border-gray-200">
              Player Name
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider w-16 border-b-[0.5px] border-gray-200">
              Position
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider w-24 border-b-[0.5px] border-gray-200">
              <span title="Batter Sequence ID Range">Range</span>
            </th>
            {showActions && (
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider w-16 border-b-[0.5px] border-gray-200">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-y-[0.5px] divide-gray-200 bg-white">
          {players
            .sort((a, b) => {
              // Special handling for bench players (order_number = 0)
              if (a.order_number === 0 && b.order_number === 0) {
                // If both are on bench, sort alphabetically by name
                return a.name.localeCompare(b.name);
              } else if (a.order_number === 0) {
                return 1; // Bench players go last
              } else if (b.order_number === 0) {
                return -1; // Non-bench players go first
              }
              // Regular sort by position (order_number)
              return a.order_number - b.order_number;
            })
            .map((player, index) => (
              <tr key={`${player.home_or_away}-${player.jersey_number}-${index}`} className="bg-white">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-left font-medium text-gray-900">
                  {getPositionName(player.order_number)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-center">
                  <div className="flex justify-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-700 text-xs rounded-full border-[0.5px] border-gray-300">
                      {player.jersey_number}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-left text-gray-900">
                  <div className="flex items-center">
                    {player.name}
                    {hasSamePositionAsPreviousInning(player) && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-left text-gray-500">
                  {getFullPositionName(player.order_number)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-left text-gray-500">
                  {player.batter_seq_id === 1 && player.batter_seq_id_to === 999 
                    ? 'Entire Inning' 
                    : `${player.batter_seq_id} → ${player.batter_seq_id_to === 999 ? 'End' : player.batter_seq_id_to}`}
                </td>
                {showActions && (
                  <td className="px-3 py-2 whitespace-nowrap text-left text-xs font-medium">
                    <div className="flex items-center space-x-1.5">
                      <button
                        className="p-0.5 w-6 h-6 rounded-md border border-gray-300 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center disabled:bg-white disabled:text-gray-300 disabled:border-gray-200 disabled:cursor-not-allowed"
                        onClick={() => onMovePlayer && onMovePlayer(player, 'up')}
                        disabled={player.order_number === 0 || index === 0 || (index > 0 && players[index-1].order_number === 0)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        className="p-0.5 w-6 h-6 rounded-md border border-gray-300 bg-white text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center disabled:bg-white disabled:text-gray-300 disabled:border-gray-200 disabled:cursor-not-allowed"
                        onClick={() => onMovePlayer && onMovePlayer(player, 'down')}
                        disabled={player.order_number === 0 || index === players.length - 1 || (index < players.length - 1 && players[index+1].order_number === 0)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* Bench button - only shown for field players (not bench) */}
                      {player.order_number > 0 && (
                        <button
                          className="p-0.5 w-6 h-6 rounded-md border border-gray-300 bg-white text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center"
                          onClick={() => onMovePlayer && onMovePlayer(player, 'bench')}
                          title="Move to bench"
                        >
                          {/* Chair icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 13h10v4" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 13h10" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10a2 2 0 012 2v3H5v-3a2 2 0 012-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 17l-1 3" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17l1 3" />
                          </svg>
                        </button>
                      )}
                      <button
                        className="p-0.5 w-6 h-6 rounded-md border border-gray-300 bg-white text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                        onClick={() => onRemovePlayer && onRemovePlayer(player)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
});

DefensiveLineupTable.displayName = 'DefensiveLineupTable';

export default DefensiveLineupTable; 