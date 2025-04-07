import React from 'react';

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

interface BoxScoreInningCellProps {
  inningData: InningStats;
  onClick?: () => void;
  isActive?: boolean;
  inningNumber?: string;
  teamType?: 'home' | 'away';
  debug?: boolean;
  runnersData?: {
    runner_on_first: boolean;
    runner_on_second: boolean;
    runner_on_third: boolean;
  };
  isLastInning?: boolean;
  isVisited?: boolean;
  'data-inning'?: string;
  'data-team'?: string;
}

const BoxScoreInningCell: React.FC<BoxScoreInningCellProps> = ({ 
  inningData, 
  onClick,
  isActive = false,
  inningNumber = '',
  teamType = 'home',
  debug = false,
  runnersData,
  isLastInning = false,
  isVisited = false,
  'data-inning': dataInning,
  'data-team': dataTeam
}) => {
  // Only log data when debug is true
  if (debug) {
    console.log(`BoxScore [Inning ${inningNumber} - ${teamType}]:`, inningData);
  }

  // Track the inning state for proper pathway selection
  const isPastInning = !!inningNumber && parseInt(inningNumber) < parseInt(sessionStorage.getItem('highest_inning_viewed') || '1');
  
  let cellStyles = {};
  let bgColorClass = 'bg-white';
  let borderClass = `border-t border-b border-l ${isLastInning ? 'border-r' : ''} border-gray-200`;
  
  if (isActive) {
    // Active inning styling
    bgColorClass = 'bg-indigo-50';
    borderClass = `border-t border-b border-l ${isLastInning ? 'border-r' : ''} border-gray-200`;
    cellStyles = { 
      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.4)',
      zIndex: 10 
    };
  } else if (isVisited) {
    // Visited inning styling - add a subtle indicator
    bgColorClass = 'bg-blue-50/30';
    borderClass = `border-t border-b border-l ${isLastInning ? 'border-r' : ''} border-blue-200`;
  } else if (isPastInning) {
    // Past inning styling (previously viewed)
    bgColorClass = 'bg-gray-50';
    borderClass = `border-t border-b border-l ${isLastInning ? 'border-r' : ''} border-gray-300`;
  }
  
  // Check for runners on bases - using the integer fields or the runnersData prop
  const hasRunnerOnFirst = runnersData ? runnersData.runner_on_first : inningData.on_first_base > 0;
  const hasRunnerOnSecond = runnersData ? runnersData.runner_on_second : inningData.on_second_base > 0;
  const hasRunnerOnThird = runnersData ? runnersData.runner_on_third : inningData.on_third_base > 0;
  
  // Simple click handler
  const handleClick = () => {
    console.log(`[INNING] Clicked inning ${inningNumber} - Team ${teamType}`);
    
    if (onClick) {
      onClick();
    }
  };

  // Format percentages to show as integers
  const strikePercentFormatted = Math.round(inningData.strike_percent);
  
  // Determine strike percentage color based on value
  const getStrikePercentColor = (percent: number) => {
    if (percent > 60) return 'text-purple-700'; // Above 60% - Purple
    if (percent >= 50) return 'text-yellow-600'; // 50-60% - Yellow
    return 'text-red-600'; // 0-49% - Red
  };
  
  const strikePercentTextColor = getStrikePercentColor(strikePercentFormatted);
  const purpleColor = 'text-indigo-600'; // Standard purple color for hard hits
  
  return (
    <div 
      className={`relative w-[4.4rem] h-16 ${borderClass} ${bgColorClass} cursor-pointer hover:bg-gray-50`}
      style={{ margin: 0, boxSizing: 'border-box', flexShrink: 0, display: 'block', ...cellStyles }}
      onClick={handleClick}
      data-inning={dataInning}
      data-team={dataTeam}
    >
      {/* Middle section: Unfilled Diamond with Runs - moved to the left side */}
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-10 h-10 flex items-center justify-center">
          {/* Diamond shape - unfilled (transparent background) */}
          <div 
            className="w-7 h-7 bg-transparent border border-gray-400"
            style={{ transform: 'rotate(45deg)' }}
          ></div>
          
          {/* Runs counter in the middle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold text-gray-800">{inningData.runs}</span>
          </div>
          
          {/* Base runners with purple dots */}
          {/* First base (right) */}
          {hasRunnerOnFirst && (
            <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 border border-white"></div>
            </div>
          )}
          
          {/* Second base (top) */}
          {hasRunnerOnSecond && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 border border-white"></div>
            </div>
          )}
          
          {/* Third base (left) */}
          {hasRunnerOnThird && (
            <div className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 border border-white"></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Top Left: Strike Percentage - directly in corner */}
      <div className="absolute top-0.5 left-0.5">
        <div className="flex items-baseline">
          <span className={`text-[10px] font-bold ${strikePercentTextColor}`}>{strikePercentFormatted}</span>
          <span className="text-[8px] font-medium text-gray-500">s%</span>
        </div>
      </div>
      
      {/* Top Right: Hard Hits - directly in corner */}
      <div className="absolute top-0.5 right-0.5">
        <div className="flex items-baseline">
          <span className={`text-[10px] font-bold ${purpleColor}`}>{inningData.hard_hit}</span>
          <span className="text-[8px] font-medium text-gray-500">hh</span>
        </div>
      </div>
      
      {/* Bottom Left: Outs (0-3 circles) - directly in corner */}
      <div className="absolute bottom-0.5 left-0.5">
        <div className="flex space-x-0.5">
          {[1, 2, 3].map((num) => (
            <div
              key={`out-${num}`}
              className={`w-1.5 h-1.5 rounded-full ${
                inningData.outs >= num
                  ? 'bg-red-500'
                  : 'bg-gray-200'
              }`}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Bottom Right: Hits - directly in corner */}
      <div className="absolute bottom-0.5 right-0.5">
        <div className="flex items-baseline">
          <span className="text-[10px] font-bold text-gray-800">{inningData.hits}</span>
          <span className="text-[8px] font-medium text-gray-500">h</span>
        </div>
      </div>
    </div>
  );
};

export default BoxScoreInningCell; 