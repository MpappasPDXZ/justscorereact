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
    
    // Check all possible fields that might contain hit direction
    return pa.hit_to || pa.detailed_result || pa.hit_direction || '';
  };
  
  // Now use the function
  const hitDirection = getHitDirection();

  // Function to determine the result from the PA object
  function determineResult(pa: ScoreBookEntry): string {
    // If pa_result is already set, use it
    if (pa.pa_result && pa.pa_result !== '0') {
      return pa.pa_result;
    }
    
    // Otherwise, determine from bases_reached and why_base_reached
    const basesReached = pa.bases_reached || '0';
    const whyBaseReached = pa.why_base_reached || '';
    
    // For outs
    if (basesReached === '0') {
      return whyBaseReached || 'OUT';
    }
    
    // For hits
    if (basesReached === '1') {
      if (['H', 'HH', 'S', 'B'].includes(whyBaseReached)) return '1B';
      if (whyBaseReached === 'BB') return 'BB';
      if (whyBaseReached === 'HBP') return 'HBP';
      if (whyBaseReached === 'E') return 'E';
      if (whyBaseReached === 'C') return 'FC';
      return '1B';
    }
    if (basesReached === '2') return '2B';
    if (basesReached === '3') return '3B';
    if (basesReached === '4') return 'HR';
    
    return '';
  }

  // Determine the color based on the result
  const getResultColor = () => {
    const resultText = result.toUpperCase();
    
    if (['1B', 'H', 'HH', 'S', 'B'].includes(resultText)) return 'text-green-600';
    if (['2B'].includes(resultText)) return 'text-blue-600';
    if (['3B'].includes(resultText)) return 'text-purple-600';
    if (['HR', '4B'].includes(resultText)) return 'text-red-600';
    if (['BB', 'HBP'].includes(resultText)) return 'text-yellow-600';
    if (['K', 'KK'].includes(resultText)) return 'text-gray-600';
    if (['E'].includes(resultText)) return 'text-orange-600';
    if (['FC', 'FO', 'GO', 'LO'].includes(resultText)) return 'text-gray-600';
    
    return 'text-gray-600';
  };

  // Determine the display text
  const getDisplayText = () => {
    // If we have a why_base_reached value from the PA, use that
    if (pa && pa.why_base_reached) {
      return pa.why_base_reached;
    }
    
    // Otherwise use the result
    return result;
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
        position = { top: '50%', left: '50%' };
        break;
      case '2': // Catcher
        position = { top: '85%', left: '50%' };
        break;
      case '3': // First Base
        position = { top: '65%', left: '65%' };
        break;
      case '4': // Second Base
        position = { top: '40%', left: '60%' };
        break;
      case '5': // Third Base
        position = { top: '65%', left: '35%' };
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
    
    console.log("Hit marker position for direction:", direction, position);
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
    
    // Check why_base_reached for BB and HBP
    if (pa.why_base_reached === 'BB' || pa.why_base_reached === 'HBP') {
      return 1;
    }
    
    // Get base from bases_reached
    if (pa.bases_reached) {
      return parseInt(pa.bases_reached);
    }
    
    return 0;
  };

  // Get the final base reached (br_result)
  const getFinalBaseReached = (): number => {
    if (!pa) return 0;
    return pa.br_result !== undefined ? pa.br_result : 0;
  };

  // Add a more comprehensive debug function
  const debugBaseReached = () => {
    if (!pa) return;
    
    console.log("DEBUG - PA Object:", pa);
    console.log("DEBUG - PA Result:", pa.pa_result);
    console.log("DEBUG - Bases Reached:", pa.bases_reached);
    console.log("DEBUG - BR Result:", pa.br_result);
    
    // Try to determine base reached from pa_result
    let baseFromPaResult = 0;
    if (pa.pa_result) {
      if (pa.pa_result.includes('1') || pa.pa_result === 'BB' || pa.pa_result === 'HBP') {
        baseFromPaResult = 1;
      } else if (pa.pa_result.includes('2B')) {
        baseFromPaResult = 2;
      } else if (pa.pa_result.includes('3B')) {
        baseFromPaResult = 3;
      } else if (pa.pa_result.includes('HR')) {
        baseFromPaResult = 4;
      }
    }
    console.log("DEBUG - Base from PA Result:", baseFromPaResult);
    
    // Try to determine base reached from bases_reached
    let baseFromBasesReached = 0;
    if (pa.bases_reached) {
      try {
        baseFromBasesReached = parseInt(pa.bases_reached);
      } catch (e) {
        console.error("DEBUG - Error parsing bases_reached:", e);
      }
    }
    console.log("DEBUG - Base from bases_reached:", baseFromBasesReached);
    
    // Final calculated base
    const finalBase = Math.max(baseFromPaResult, baseFromBasesReached);
    console.log("DEBUG - Final calculated base:", finalBase);
  };

  // Call this function in useEffect
  useEffect(() => {
    debugBaseReached();
  }, [pa]);

  // Inside the BaseballField component, add a console log to debug
  useEffect(() => {
    if (pa) {
      console.log("PA data in BaseballField:", pa);
      console.log("Batter seq ID:", pa.batter_seq_id);
    }
  }, [pa]);

  // Add this inside the component, before the return statement
  useEffect(() => {
    if (pa) {
      console.log("BaseballField - PA data:", pa);
      console.log("BaseballField - PA result:", pa.pa_result);
      console.log("BaseballField - Bases reached:", pa.bases_reached);
      
      // Calculate bases reached for debugging
      let basesReached = 0;
      if (pa.pa_result) {
        if (pa.pa_result.includes('1B') || pa.pa_result === 'BB' || pa.pa_result === 'HBP') {
          basesReached = 1;
        } else if (pa.pa_result.includes('2B')) {
          basesReached = 2;
        } else if (pa.pa_result.includes('3B')) {
          basesReached = 3;
        } else if (pa.pa_result.includes('HR')) {
          basesReached = 4;
        }
      }
      if (basesReached === 0 && pa.bases_reached) {
        basesReached = parseInt(pa.bases_reached);
      }
      console.log("BaseballField - Calculated bases reached:", basesReached);
    }
  }, [pa]);

  // Update the playerReachedBase function
  const playerReachedBase = () => {
    if (!pa) return false;
    
    // Check pa_result
    if (pa.pa_result) {
      // If pa_result is a number between 1-4, player reached base
      if (['1', '2', '3', '4'].includes(pa.pa_result)) {
        return true;
      }
      
      // Otherwise check for text descriptions
      if (pa.pa_result.includes('1B') || pa.pa_result.includes('2B') || 
          pa.pa_result.includes('3B') || pa.pa_result.includes('HR')) {
        return true;
      }
    }
    
    // Check why_base_reached for BB and HBP
    if (pa.why_base_reached === 'BB' || pa.why_base_reached === 'HBP') {
      return true;
    }
    
    // Check bases_reached
    if (pa.bases_reached && parseInt(pa.bases_reached) > 0) {
      return true;
    }
    
    // Check br_result
    if (pa.br_result !== undefined && pa.br_result > 0) {
      return true;
    }
    
    return false;
  };

  // Add a debug log to check the hit direction value
  useEffect(() => {
    if (pa) {
      console.log("Hit Direction Debug:", {
        hit_to: pa.hit_to,
        detailed_result: pa.detailed_result,
        hit_direction: pa.hit_direction,
        finalHitDirection: hitDirection,
        hitMarkerPosition: hitMarkerPosition
      });
    }
  }, [pa, hitDirection, hitMarkerPosition]);

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
          className={`absolute top-0.5 left-0.5 rounded-full z-30 flex items-center justify-center bg-gray-100 ${
            !playerReachedBase() 
              ? 'text-red-600 border-2 border-red-300' 
              : 'text-gray-700 border border-gray-500'
          }`}
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
                    stroke="#9333EA" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* First to second */}
                {initialBase >= 2 && (
                  <path 
                    d="M40,20 L20,0" 
                    stroke="#9333EA" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Second to third */}
                {initialBase >= 3 && (
                  <path 
                    d="M20,0 L0,20" 
                    stroke="#9333EA" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Third to home */}
                {initialBase >= 4 && (
                  <path 
                    d="M0,20 L20,40" 
                    stroke="#9333EA" 
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
      
      {/* Hit marker - small X with color based on whether player reached base */}
      {hitDirection && (
        <div 
          className={`absolute z-40 font-bold text-[10px] ${
            playerReachedBase() ? 'text-gray-600' : 'text-red-600'
          } flex items-center justify-center`}
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
        className={`absolute z-20 font-bold ${playerReachedBase() ? getResultColor() : 'text-red-600'}`}
        style={{
          top: playerReachedBase() ? '60%' : '65%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Use the same font size for all results */}
        <span className="text-xs">{getDisplayText()}</span>
      </div>
      
      {/* Balls and strikes indicators at the top edge - moved in slightly */}
      <div className="absolute right-1 top-0.5">
        {renderBallsAndStrikes()}
      </div>
      
      {/* Fouls indicator in bottom right (even smaller) */}
      {foulsValue > 0 && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-white border border-yellow-400 flex items-center justify-center">
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