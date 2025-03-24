import React from 'react';

// Player interface
export interface Player {
  jersey_number: string;
  name: string;
  order_number: number;
  inning_number: number;
  home_or_away: string;
}

interface LineupTableProps {
  players: Player[];
  isLoading: boolean;
  showActions?: boolean;
  onRemovePlayer?: (player: Player) => void;
  onMovePlayer?: (player: Player, direction: 'up' | 'down') => void;
  isReadOnly?: boolean;
  emptyMessage?: string;
  inningNumber?: number | null;
  currentInning?: number | null;
  onInningClick?: (inning: number) => void;
}

const LineupTable: React.FC<LineupTableProps> = ({
  players,
  isLoading,
  showActions = false,
  onRemovePlayer,
  onMovePlayer,
  isReadOnly = false,
  emptyMessage = "No players in lineup for this inning.",
  inningNumber = null,
  currentInning = null,
  onInningClick
}) => {
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
  
  // Calculate the total number of columns
  const columnCount = showActions ? 4 : 3;
  
  // Check if this is the current inning
  const isCurrentInning = inningNumber !== null && currentInning !== null && inningNumber === currentInning;
  
  // Handle inning header click
  const handleInningHeaderClick = () => {
    if (inningNumber !== null && onInningClick) {
      onInningClick(inningNumber);
    }
  };
  
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
                    ? 'text-indigo-600 bg-indigo-100 border-indigo-200 py-2.5' 
                    : 'text-gray-900 bg-gray-100 border-gray-200'
                } ${onInningClick ? 'cursor-pointer hover:bg-opacity-80' : ''}`}
                onClick={handleInningHeaderClick}
                title={onInningClick ? "Click to select this inning" : undefined}
              >
                <div className="flex items-center">
                  {isCurrentInning ? 'Current: ' : ''}Inning {inningNumber}
                  {onInningClick && !isCurrentInning && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  )}
                </div>
              </th>
            </tr>
          )}
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-5 border-b-[0.5px] border-gray-200" title="Order Number">
              O
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-13 border-b-[0.5px] border-gray-200">
              Jersey #
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 border-b-[0.5px] border-gray-200">
              Player Name
            </th>
            {showActions && (
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 border-b-[0.5px] border-gray-200">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-y-[0.5px] divide-gray-200 bg-white">
          {players
            .sort((a, b) => a.order_number - b.order_number)
            .map((player, index) => (
              <tr key={`${player.home_or_away}-${player.jersey_number}-${index}`} className="bg-white">
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-left font-medium text-gray-900">
                  {player.order_number}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-center">
                  <div className="flex justify-center">
                    <span className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-700 text-sm rounded-full border-[0.5px] border-gray-300">
                      {player.jersey_number}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-left text-gray-900">
                  {player.name}
                </td>
                {showActions && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-left text-sm font-medium">
                    <div className="flex items-center space-x-1.5">
                      <button
                        className="p-0.5 w-7 h-7 rounded-md border border-gray-300 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center disabled:bg-white disabled:text-gray-300 disabled:border-gray-200 disabled:cursor-not-allowed"
                        title="Move Up"
                        onClick={() => onMovePlayer && onMovePlayer(player, 'up')}
                        disabled={index === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        className="p-0.5 w-7 h-7 rounded-md border border-gray-300 bg-white text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center disabled:bg-white disabled:text-gray-300 disabled:border-gray-200 disabled:cursor-not-allowed"
                        title="Move Down"
                        onClick={() => onMovePlayer && onMovePlayer(player, 'down')}
                        disabled={index === players.length - 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        className="p-0.5 w-7 h-7 rounded-md border border-gray-300 bg-white text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                        title="Remove Player"
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
};

export default LineupTable; 