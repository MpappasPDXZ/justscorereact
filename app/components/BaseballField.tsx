'use client';

import { ScoreBookEntry } from '@/app/types/scoreTypes';
import { useEffect } from 'react';

interface BaseballFieldProps {
  paResult?: string;
  baseRunning?: string;
  balls?: number;
  strikes?: number;
  fouls?: number;
  pa?: ScoreBookEntry; // Add the full PA object as an optional prop
  onClick?: () => void; // Add onClick handler prop
  isInteractive?: boolean; // Flag to indicate if the field is clickable
}

const BaseballField = ({ 
  paResult, 
  baseRunning, 
  balls = 0, 
  strikes = 0, 
  fouls = 0, 
  pa,
  onClick,
  isInteractive = false
}: BaseballFieldProps) => {
  // If we have the full PA object, use it to determine the result
  const result = pa ? determineResult(pa) : paResult || '';
  const baseRunningValue = pa ? pa.base_running : baseRunning || '';
  const ballsValue = pa ? Number(pa.balls_before_play) : balls;
  const strikesValue = pa ? Number(pa.strikes_before_play) : strikes;
  const foulsValue = pa ? Number(pa.fouls) : fouls;
  
  // Define the getHitDirection function first
  const getHitDirection = () => {
    if (!pa) return '';
    return pa.hit_to || '';
  };
  
  // Now use the function
  const hitDirection = getHitDirection();

  // Function to determine the result from the PA object
  function determineResult(pa: ScoreBookEntry): string {
    // If pa_result is already set and not just a numeric value, use it
    if (pa.pa_result && !['0', '1', '2', '3', '4'].includes(pa.pa_result)) {
      return pa.pa_result;
    }
    
    // Otherwise, determine from pa_result and pa_why
    const pa_resultb = pa.pa_result || '0';
    const pa_whyb = pa.pa_why || '';
    
    // Return BB, HBP, FC directly if that's the pa_why
    if (pa_whyb === 'BB' || pa_whyb === 'HBP' || pa_whyb === 'FC') {
      return pa_whyb;
    }
    
    // Special case for 'B' to return base number + 'B' for bunts
    if (pa_whyb === 'B') {
      if (pa_resultb === '1') return '1B';
      if (pa_resultb === '2') return '2B';
      if (pa_resultb === '3') return '3B';
      if (pa_resultb === '4') return '4B';
      return 'BB'; // Default to BB if no base specified (walk)
    }
    
    // For outs
    if (pa_resultb === '0') {
      if (pa_whyb === 'K') return 'K';
      if (pa_whyb === 'KK') return 'KK';
      if (pa_whyb === 'GO') return 'GO';
      if (pa_whyb === 'FO') return 'FO';
      if (pa_whyb === 'LO') return 'LO';
      if (pa_whyb === 'FB') return 'FB';
      if (pa_whyb === 'SF') return 'SF';
      if (pa_whyb === 'SB') return 'SB';
      return 'OUT';
    }
    
    // For errors, show the base number with E
    if (pa_whyb === 'E') {
      return `${pa_resultb}E`;
    }
    
    // For hits and other ways to reach base
    if (pa_resultb === '1') {
      if (pa_whyb === 'H') return '1B';
      if (pa_whyb === 'S') return '1B';
      return '1B';
    }
    if (pa_resultb === '2') return '2B';
    if (pa_resultb === '3') return '3B';
    if (pa_resultb === '4') {
      if (pa_whyb === 'GS') return 'GS';
      return 'HR';
    }
    return '';
  }
  // Determine the color based on the result
  const getResultColor = () => {
    const resultText = result.toUpperCase();
    // Hits - all hits should be purple
    if (['1B', '2B', '3B', '4B', 'HR','GS','H', 'S', 'B'].includes(resultText)) {
      return 'text-purple-600';
    }
    // Outs - should be red
    if (['K', 'KK', 'OUT', 'FO', 'GO', 'LO', 'FB','E'].includes(resultText)) {
      return 'text-red-600';
    }
    if (['BB', 'HBP','SF', 'SB','FC'].includes(resultText)) {
      return 'text-black';
    }   
    return 'text-black';
  };

  // Render balls and strikes indicators in a single column with smaller size
  const renderBallsAndStrikes = () => {
    // Create an array of indicators: first 3 for balls, last 2 for strikes
    return (
      <div className="flex flex-col space-y-0.5">
        {/* Balls (3) - smaller size */}
        {[0, 1, 2].map((i) => (
          <div 
            key={`ball-${i}`}
            className={`w-1.5 h-1.5 rounded-full ${i < ballsValue ? 'bg-purple-600' : 'bg-gray-200'}`}
          />
        ))}
        
        {/* Smaller divider */}
        <div className="h-0.5"></div>
        
        {/* Strikes (2) - smaller size */}
        {[0, 1].map((i) => (
          <div 
            key={`strike-${i}`}
            className={`w-1.5 h-1.5 rounded-full ${i < strikesValue ? 'bg-red-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  // Calculate the position of the hit marker based on the detailed_result field
  const getHitMarkerPosition = () => {
    // Default position
    let position = { top: '40%', left: '50%' };
    
    // If no hit direction, return default
    if (!hitDirection) return position;
    
    // Try to parse the hit direction
    const direction = hitDirection.toString().trim();
    
    // Position based on fielder position numbers
    switch (direction) {
      case '1': // Pitcher
        position = { top: '77%', left: '50%' };
        break;
      case '2': // Catcher
        position = { top: '85%', left: '50%' };
        break;
      case '3': // First Base
        position = { top: '65%', left: '62%' };
        break;
      case '4': // Second Base
        position = { top: '40%', left: '60%' };
        break;
      case '5': // Third Base
        position = { top: '65%', left: '38%' };
        break;
      case '6': // Shortstop
        position = { top: '40%', left: '40%' };
        break;
      case '7': // Left Field
        position = { top: '22%', left: '28%' };
        break;
      case '8': // Center Field
        position = { top: '14%', left: '50%' }; // Adjusted to be just below top middle
        break;
      case '9': // Right Field
        position = { top: '22%', left: '72%' };
        break;
      default:
        // Try to handle other formats
        if (direction.includes('P') || direction.includes('1')) position = { top: '50%', left: '50%' };
        else if (direction.includes('C') || direction.includes('2')) position = { top: '85%', left: '50%' };
        else if (direction.includes('1B') || direction.includes('3')) position = { top: '55%', left: '75%' };
        else if (direction.includes('2B') || direction.includes('4')) position = { top: '40%', left: '60%' };
        else if (direction.includes('3B') || direction.includes('5')) position = { top: '55%', left: '25%' };
        else if (direction.includes('SS') || direction.includes('6')) position = { top: '40%', left: '40%' };
        else if (direction.includes('LF') || direction.includes('7')) position = { top: '25%', left: '25%' };
        else if (direction.includes('CF') || direction.includes('8')) position = { top: '20%', left: '50%' };
        else if (direction.includes('RF') || direction.includes('9')) position = { top: '25%', left: '75%' };
        break;
    }
    
    return position;
  };

  const hitMarkerPosition = getHitMarkerPosition();

  // Update the getInitialBaseReached function to handle numeric values correctly
  const getInitialBaseReached = (): number => {
    if (!pa) return 0;
    
    // Get base from pa_result - handle numeric values
    if (pa.pa_result) {
      // If pa_result is a number between 0-4, use it directly
      if (['0', '1', '2', '3', '4'].includes(pa.pa_result)) {
        return parseInt(pa.pa_result);
      }
      
      // Otherwise check for text descriptions
      if (pa.pa_result.includes('1B')) return 1;
      if (pa.pa_result.includes('2B')) return 2;
      if (pa.pa_result.includes('3B')) return 3;
      if (pa.pa_result.includes('HR') || pa.pa_result.includes('4B')) return 4;
    }
    
    // Check pa_why for BB and HBP
    if (pa.pa_why === 'BB' || pa.pa_why === 'B' || pa.pa_why === 'HBP') {
      return 1;
    }
    
    return 0;
  };

  // Get the final base reached (br_result)
  const getFinalBaseReached = (): number => {
    if (!pa) return 0;
    return pa.br_result !== undefined ? pa.br_result : 0;
  };

  // Update the playerReachedBase function
  const playerReachedBase = () => {
    if (!pa) return false;
    // Check pa_result
    if (pa.pa_result) {
      // If pa_result is a number between 1-4, player reached base
      if (['1', '2', '3', '4'].includes(pa.pa_result)) {
        return true;
      }
    }
    // Check pa_why for BB and HBP
    if (pa.pa_why === 'BB' || pa.pa_why === 'B' || pa.pa_why === 'HBP') {
      return true;
    }   
    return false;
  };

  // Add a new function to check if player was out
  const playerWasOut = () => {
    if (!pa) return false;
    // Check if player was out at a base
    if (pa.out_at && pa.out_at > 0) {
      return true;
    }
    
    // Check if player didn't reach base at all
    if (!playerReachedBase()) {
      return true;
    }
    
    return false;
  };

  // Add a new function to check if player got a hit
  const playerGotHit = () => {
    if (!pa) return false;
    
    // Check pa_why for hit-related values
    const hitValues = ['H', 'HH', 'S', 'HR', 'GS'];
    if (pa.pa_why && hitValues.includes(pa.pa_why)) {
      return true;
    }
    
    // Check pa_result for hit-related values
    if (pa.pa_result) {
      // Check for standard hit notations
      if (pa.pa_result.includes('1B') || pa.pa_result.includes('2B') || 
          pa.pa_result.includes('3B') || pa.pa_result.includes('HR') ||
          pa.pa_result.includes('HH') || pa.pa_result.includes('GS')) {
        return true;
      }
      
      // If pa_result contains 'E', it's an error, not a hit
      if (pa.pa_result.includes('E')) {
        return false;
      }
      
      // If pa_result is numeric, check if it's 1-4 and pa_why indicates a hit
      if (['1', '2', '3', '4'].includes(pa.pa_result)) {
        // For base 1, check pa_why
        if (pa.pa_result === '1') {
          // Not a hit if it's a walk, error, or fielder's choice
          if (pa.pa_why === 'BB' || pa.pa_why === 'B' || pa.pa_why === 'HBP' ||
              pa.pa_why === 'E' || pa.pa_why === 'FC') {
            return false;
          }
          // Otherwise it's a hit
          return true;
        }
        // Bases 2-4 are hits unless pa_why indicates otherwise
        if (pa.pa_why === 'E' || pa.pa_why === 'FC') {
          return false;
        }
        return true;
      }
    }
    
    return false;
  };

  // Create a comprehensive function to handle all styling and text display logic
  const getDisplayConfig = () => {
    if (!pa) {
      return {
        circleStyle: 'text-gray-700 border border-gray-500',
        textColor: 'text-black',
        displayText: result,
        pathColor: '#000000',
        hitMarkerColor: 'text-black'
      };
    }

    // Special case for walks with pa_why = 'B'
    const isWalkWithB = pa.pa_why === 'B' && pa.pa_result === '1';
    
    // Determine the result type
    const isHit = playerGotHit();
    const isOut = playerWasOut();
    const isError = pa.pa_why === 'E';
    const isWalk = ['BB', 'HBP'].includes(pa.pa_why || '') || isWalkWithB;
    const isFC = pa.pa_why === 'FC';
    const isBunt = pa.pa_why === 'B' && ['1', '2', '3', '4'].includes(pa.pa_result || '');

    // Get the display text
    let displayText = '';
    
    // Special case for bunts with pa_why = 'B'
    if (isBunt) {
      displayText = `${pa.pa_result}B`; // Return base number + B for bunts
    }
    // Special case for walks with pa_why = 'B'
    else if (isWalkWithB) {
      displayText = 'BB';
    }
    // For errors, show the base number with E
    else if (isError) {
      const pa_resultb = pa.pa_result || '1'; // Default to 1 if not specified
      displayText = `${pa_resultb}E`;
    }
    // For hits, show the base number
    else if (isHit) {
      const pa_resultb = pa.pa_result || '1'; // Default to 1 if not specified
      
      // Special cases
      if (pa.pa_why === 'HR' || pa.pa_why === 'GS') {
        displayText = pa.pa_why; // Keep HR and GS as is
      } else if (pa.pa_why === 'HH') {
        displayText = 'HH'; // Keep HH as is
      } else {
        // For other hits, show the base number
        if (pa_resultb === '1') displayText = '1B';
        else if (pa_resultb === '2') displayText = '2B';
        else if (pa_resultb === '3') displayText = '3B';
        else if (pa_resultb === '4') displayText = 'HR';
      }
    }
    // For walks and other results, use pa_why
    else if (pa.pa_why) {
      // Special case for pa_why = 'B'
      if (pa.pa_why === 'B') {
        displayText = 'BB';
      } else {
        displayText = pa.pa_why;
      }
    }
    // If we have a pa_result, convert it to a more descriptive text
    else if (pa.pa_result) {
      // Handle numeric pa_result values
      if (pa.pa_result === '0') displayText = 'OUT';
      else if (pa.pa_result === '1') {
        // For base 1, check pa_why to determine if it's a hit, walk, etc.
        const pa_whyb = pa.pa_why || '';
        if (pa_whyb === 'BB' || pa_whyb === 'B') displayText = 'BB';
        else if (pa_whyb === 'HBP') displayText = 'HBP';
        else if (pa_whyb === 'E') displayText = '1E';
        else if (pa_whyb === 'FC') displayText = 'FC';
        else if (pa_whyb === 'HH') displayText = 'HH';
        else displayText = '1B'; // Default to 1B for base 1
      }
      else if (pa.pa_result === '2') {
        // Check if it was an error
        const pa_whyb = pa.pa_why || '';
        if (pa_whyb === 'E') displayText = '2E';
        else displayText = '2B';
      }
      else if (pa.pa_result === '3') {
        // Check if it was an error
        const pa_whyb = pa.pa_why || '';
        if (pa_whyb === 'E') displayText = '3E';
        else displayText = '3B';
      }
      else if (pa.pa_result === '4') {
        // Check if it was an error
        const pa_whyb = pa.pa_why || '';
        if (pa_whyb === 'E') displayText = '4E';
        else displayText = 'HR';
      }
      // Handle non-numeric pa_result values
      else if (pa.pa_result.includes('1B') || pa.pa_result.includes('2B') || 
               pa.pa_result.includes('3B') || pa.pa_result.includes('HR') ||
               pa.pa_result.includes('BB') || pa.pa_result.includes('HBP') ||
               pa.pa_result.includes('K') || pa.pa_result.includes('OUT') ||
               pa.pa_result.includes('FC') || pa.pa_result.includes('E')) {
        // Use the pa_result directly if it's already a descriptive value
        displayText = pa.pa_result;
      }
      else {
        displayText = pa.pa_result;
      }
    }
    else {
      displayText = result;
    }

    // Determine the circle style
    let circleStyle = '';
    if (isOut) {
      circleStyle = 'text-red-600 border-2 border-red-300';
    } else if (isError) {
      circleStyle = 'text-gray-700 border-2 border-gray-300'; // Changed to gray for errors
    } else if (isHit || isBunt) {
      circleStyle = 'text-purple-600 border-2 border-purple-500';
    } else if (isWalk || isFC) {
      circleStyle = 'text-gray-700 border-2 border-gray-300';
    } else {
      circleStyle = 'text-gray-700 border border-gray-500';
    }

    // Determine the text color
    let textColor = '';
    if (isHit || isBunt || isWalk) {
      textColor = 'text-purple-600';
    } else if (isOut || isError) {
      textColor = 'text-red-600';
    } else if (isFC) {
      textColor = 'text-black';
    } else {
      textColor = 'text-black';
    }

    // Determine the path color
    const pathColor = (isHit || isBunt || isWalk) ? '#9333EA' : '#000000';

    // Handle special cases for hit marker color
    let hitMarkerColor = textColor;
    if (isError) {
      hitMarkerColor = 'text-red-600';
    } else if (!playerReachedBase()) {
      hitMarkerColor = 'text-red-600';
    }

    return {
      circleStyle,
      textColor,
      displayText,
      pathColor,
      hitMarkerColor
    };
  };

  // Use the function to get all styling and display information
  const { circleStyle, textColor, displayText, pathColor, hitMarkerColor } = getDisplayConfig();

  return (
    <div 
      className={`relative w-24 h-12 flex items-center justify-center ${isInteractive ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}`}
      onClick={(e) => {
        if (isInteractive && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Batter Sequence ID in top left - with conditional styling based on outcome */}
      {pa && (
        <div 
          className={`absolute top-0.5 left-0.5 rounded-full z-30 flex items-center justify-center ${circleStyle}`}
          style={{ 
            paddingLeft: '2px', 
            paddingRight: '2px',
            height: '12px',
            minWidth: '12px',
            fontSize: '0.6rem'
          }}
        >
          {pa.batter_seq_id || '?'}
        </div>
      )}
      
      {/* Diamond shape - only show if player did not reach base */}
      {(!pa || !playerReachedBase()) && (
        <div className="absolute transform rotate-45 w-6 h-6 border border-gray-400 bottom-1"></div>
      )}
      
      {/* Base path visualization - smaller size */}
      {pa && (
        <svg 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-9 h-9 z-10" 
          viewBox="0 0 40 40" 
          style={{ marginLeft: '-1px' }}
        >
          {(() => {
            // Get initial base reached (from pa_result or bases_reached)
            let initialBase = getInitialBaseReached();
            
            // Get final base reached (from br_result)
            const finalBase = getFinalBaseReached();
            
            return (
              <>
                {/* Initial base paths in purple - on the perimeter */}
                {/* Home to first */}
                {initialBase >= 1 && (
                  <path 
                    d="M20,40 L40,20" 
                    stroke={pathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* First to second */}
                {initialBase >= 2 && (
                  <path 
                    d="M40,20 L20,0" 
                    stroke={pathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Second to third */}
                {initialBase >= 3 && (
                  <path 
                    d="M20,0 L0,20" 
                    stroke={pathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Third to home */}
                {initialBase >= 4 && (
                  <path 
                    d="M0,20 L20,40" 
                    stroke={pathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Additional advancement paths in black - on the perimeter */}
                {/* First to second (if advanced) */}
                {initialBase === 1 && finalBase >= 2 && (
                  <path 
                    d="M40,20 L20,0" 
                    stroke="#000000" 
                    strokeWidth="1.5" 
                    fill="none"
                  />
                )}
                
                {/* Second to third (if advanced) */}
                {initialBase <= 2 && finalBase >= 3 && finalBase > initialBase && (
                  <path 
                    d="M20,0 L0,20" 
                    stroke="#000000" 
                    strokeWidth="1.5" 
                    fill="none"
                  />
                )}
                
                {/* Third to home (if advanced) */}
                {initialBase <= 3 && finalBase >= 4 && finalBase > initialBase && (
                  <path 
                    d="M0,20 L20,40" 
                    stroke="#000000" 
                    strokeWidth="1.5" 
                    fill="none"
                  />
                )}
              </>
            );
          })()}
        </svg>
      )}
      
      {/* Hit marker - small X with color based on whether player reached base or if there was an error */}
      {hitDirection && hitDirection !== "0" && (
        <div 
          className={`absolute z-40 font-bold text-[10px] ${hitMarkerColor} flex items-center justify-center`}
          style={{ 
            top: hitMarkerPosition.top, 
            left: hitMarkerPosition.left,
            transform: 'translate(-50%, -50%)'
          }}
        >
          X
        </div>
      )}
      
      {/* Result text - positioned based on whether player reached base */}
      <div 
        className={`absolute z-20 font-bold ${textColor}`}
        style={{
          top: playerReachedBase() ? '60%' : '65%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Use a smaller font size for all results (15% smaller) */}
        <span className="text-[0.68rem]">{displayText}</span>
      </div>
      
      {/* Balls and strikes indicators at the top edge - moved in slightly */}
      <div className="absolute right-1 top-0.5">
        {renderBallsAndStrikes()}
      </div>
      
      {/* Fouls indicator in bottom right, moved to the left */}
      {foulsValue > 0 && (
        <div className="absolute bottom-0.5 right-4 w-3 h-3 rounded-full bg-white border border-yellow-400 flex items-center justify-center">
          <span className="text-yellow-500 text-[8px] font-semibold">{foulsValue}</span>
        </div>
      )}
      
      {/* Add plate appearance indicator (only shown when interactive and empty) - adjusted position */}
      {isInteractive && !result && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '11px' }}>
          <div className="text-green-400 text-2xl">+</div>
        </div>
      )}
    </div>
  );
};

export default BaseballField; 