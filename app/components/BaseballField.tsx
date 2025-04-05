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
  const ballsValue = pa ? Number(pa.balls_before_play || 0) : balls;
  const strikesValue = pa ? Number(pa.strikes_before_play || 0) : strikes;
  const foulsValue = pa ? Number(pa.fouls || 0) : fouls;
  
  // Define the getHitDirection function first
  const getHitDirection = () => {
    if (!pa) return null;
    // Convert hit_to to number if it's a string
    const hitTo = pa.detailed_result || pa.hit_to;
    // Return null instead of empty string for falsy values
    if (!hitTo && hitTo !== 0) return null;
    return typeof hitTo === 'string' ? parseInt(hitTo) : hitTo;
  };
  
  // Now use the function
  const hitDirection = getHitDirection();

  // Function to determine the result from the PA object
  function determineResult(pa: ScoreBookEntry): string {
    // Special cases for walks and strikeouts - check these first
    const paWhy = pa.pa_why || pa.why_base_reached;
    if (paWhy === 'BB' || paWhy === 'B') {
      return 'BB'; // Always show BB for walks
    }
    if (paWhy === 'HBP') {
      return 'HBP'; // Show HBP for hit by pitch
    }
    if (paWhy === 'K') {
      return 'K'; // Always show K for strikeouts
    }
    if (paWhy === 'KK') {
      return 'KK'; // Always show KK for strikeouts
    }

    // If pa_result is already set and not just a numeric value, use it as a string
    if (pa.pa_result !== undefined) {
      // Convert pa_result to number if possible
      const paResult = typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result;
      
      if (![0, 1, 2, 3, 4].includes(paResult)) {
        return String(pa.pa_result);
      }
    }
    
    // Otherwise, determine from pa_result and pa_why
    const pa_resultVal = pa.pa_result !== undefined 
      ? (typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result) 
      : 0;
    const pa_whyb = pa.why_base_reached || pa.pa_why || '';

    // Return BB, HBP, FC directly if that's the pa_why
    if (pa_whyb === 'BB' || pa_whyb === 'HBP' || pa_whyb === 'FC') {
      return pa_whyb;
    }
    
    // Special case for 'B' to return base number + 'B' for bunts
    if (pa_whyb === 'B') {
      if (pa_resultVal === 1) return '1B';
      if (pa_resultVal === 2) return '2B';
      if (pa_resultVal === 3) return '3B';
      if (pa_resultVal === 4) return '4B';
      return 'BB'; // Default to BB if no base specified (walk)
    }
    
    // For outs
    if (pa_resultVal === 0) {
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
      return `${pa_resultVal}E`;
    }
    
    // For hits and other ways to reach base
    if (pa_resultVal === 1) {
      if (pa_whyb === 'H') return '1B';
      if (pa_whyb === 'S') return '1B';
      return '1B';
    }
    if (pa_resultVal === 2) return '2B';
    if (pa_resultVal === 3) return '3B';
    if (pa_resultVal === 4) {
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
    if (hitDirection === null || hitDirection === undefined) return position;
    
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
        position = { top: '39%', left: '63%' };
        break;
      case '5': // Third Base
        position = { top: '65%', left: '38%' };
        break;
      case '6': // Shortstop
        position = { top: '39%', left: '38%' };
        break;
      case '7': // Left Field
        position = { top: '18%', left: '28%' };
        break;
      case '8': // Center Field
        position = { top: '10%', left: '50%' }; // Adjusted to be just below top middle
        break;
      case '9': // Right Field
        position = { top: '18%', left: '72%' };
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
  
  // Function to check if it's a walk
  const isWalk = () => {
    if (!pa) return false;
    const paWhy = pa.pa_why || pa.why_base_reached;
    return paWhy === 'BB' || paWhy === 'B' || paWhy === 'HBP';
  };

  // Function to check if it's a strikeout
  const isStrikeout = () => {
    if (!pa) return false;
    const paWhy = pa.pa_why || pa.why_base_reached;
    return paWhy === 'K' || paWhy === 'KK';
  };

  // Determine key states at the component level
  const walkStatus = pa ? isWalk() : false;
  const strikeoutStatus = pa ? isStrikeout() : false;

  // Update the getInitialBaseReached function to handle numeric values correctly
  const getInitialBaseReached = (): number => {
    if (!pa) return 0;
    
    // Special handling for walks and strikeouts - they should never return 0 
    // even if pa_result is 0
    if (walkStatus) {
      return 1; // Walks always reach first base
    }
    
    if (strikeoutStatus) {
      return 0; // Return a special value that we'll handle differently
    }
    
    // Get base from pa_result - handle numeric values
    if (pa.pa_result !== undefined) {
      // Convert pa_result to number if it's a string
      const paResult = typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result;
      
      // If pa_result is a number between 0-4, use it directly
      if ([0, 1, 2, 3, 4].includes(paResult)) {
        return paResult;
      }
      
      // Otherwise check for text descriptions in String(pa_result)
      const paResultStr = String(pa.pa_result);
      if (paResultStr.includes('1B')) return 1;
      if (paResultStr.includes('2B')) return 2;
      if (paResultStr.includes('3B')) return 3;
      if (paResultStr.includes('HR') || paResultStr.includes('4B')) return 4;
    }
    
    // Check pa_why for BB and HBP (also check why_base_reached for local ScoreBookEntry)
    const paWhy = pa.pa_why || pa.why_base_reached;
    if (paWhy === 'BB' || paWhy === 'B' || paWhy === 'HBP') {
      return 1;
    }
    
    return 0;
  };

  // Get the final base reached (br_result)
  const getFinalBaseReached = (): number => {
    if (!pa) return 0;
    
    // Check if br_result exists and isn't null/undefined
    if (pa.br_result !== undefined && pa.br_result !== null) {
      // Always convert br_result to number for comparisons
      const brResultNum = Number(pa.br_result);
      
      // If br_result is 0, special handling
      if (brResultNum === 0) {
        // If pa_result exists and isn't 0, return that instead (player must have reached at least pa_result)
        const paResult = pa.pa_result !== undefined ? 
                      (typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result) : 0;
        if (paResult > 0) {
          return paResult;
        }
        return 0;
      }
      
      // If it's a valid number (not NaN) and greater than 0, use it
      if (!isNaN(brResultNum) && brResultNum > 0) {
        return brResultNum;
      }
    }
    
    // If br_result isn't valid, use pa_result as a fallback (player must have reached at least pa_result)
    const paResult = pa.pa_result !== undefined ? 
                  (typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result) : 0;
    
    if (paResult > 0) {
      return paResult;
    }
    
    return 0;
  };

  // Update the playerReachedBase function
  const playerReachedBase = () => {
    if (!pa) return false;
    
    // Check pa_result
    if (pa.pa_result !== undefined) {
      // Convert pa_result to number if it's a string
      const paResult = typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result;
      
      // If pa_result is a number between 1-4, player reached base
      if ([1, 2, 3, 4].includes(paResult)) {
        return true;
      }
    }
    
    // Check bases_reached as a fallback
    if (pa.bases_reached) {
      const basesReached = typeof pa.bases_reached === 'string' ? parseInt(pa.bases_reached) : pa.bases_reached;
      if ([1, 2, 3, 4].includes(basesReached)) {
        return true;
      }
    }
    
    // Check pa_why for BB and HBP (also check why_base_reached for local ScoreBookEntry)
    const paWhy = pa.pa_why || pa.why_base_reached;
    if (paWhy === 'BB' || paWhy === 'B' || paWhy === 'HBP') {
      return true;
    }
    
    return false;
  };

  // Determine if the player was out
  const playerWasOut = (): boolean => {
    if (!pa) return false;
    
    // Check direct out flag
    if (pa.out !== undefined && pa.out > 0) {
      return true;
    }
    
    // Check result fields
    const paResult = pa.pa_result !== undefined 
      ? (typeof pa.pa_result === 'string' ? parseInt(pa.pa_result) : pa.pa_result) 
      : null;
    
    // If pa_result is 0, it's an out
    if (paResult === 0) {
      return true;
    }
    
    // Check for out-specific why codes
    const paWhy = pa.pa_why || pa.why_base_reached || '';
    if (['K', 'KK', 'GO', 'FO', 'LO', 'O'].includes(paWhy)) {
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
    if (pa.pa_result !== undefined) {
      const paResultStr = String(pa.pa_result);
      
      // Check for standard hit notations
      if (paResultStr.includes('1B') || paResultStr.includes('2B') || 
          paResultStr.includes('3B') || paResultStr.includes('HR') ||
          paResultStr.includes('HH') || paResultStr.includes('GS')) {
        return true;
      }
      
      // If pa_result contains 'E', it's an error, not a hit
      if (paResultStr.includes('E')) {
        return false;
      }
      
      // If pa_result is numeric, check if it's 1-4 and pa_why indicates a hit
      if ([1, 2, 3, 4].includes(pa.pa_result)) {
        // For base 1, check pa_why
        if (pa.pa_result === 1) {
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
        displayText: result,
        pathColor: '#000000',
        hitMarkerColor: 'text-black'
      };
    }

    // Check for error
    const isError = pa.pa_why === 'E' || pa.why_base_reached === 'E';
    
    // Determine the result type
    const isHit = playerGotHit();
    const isOut = playerWasOut(); // This checks if the player was out
    const isFC = pa.pa_why === 'FC';
    // Bunts are represented as a quality indicator from a field called 'bunt' in the ScoreBookEntry object
    // If the bunt field is true, then the player reached base on a bunt
    const isBunt = pa.bunt === 1; // Check if the player bunted regardless of the result

    // Get initial base reached and final base reached using the same functions
    // that control the base path visualization
    const initialBase = getInitialBaseReached();
    const finalBase = getFinalBaseReached();

    // Get the display text - align with base path logic
    let displayText = '';
    
    // Handle HBP first
    if (pa.pa_why === 'HBP') {
      displayText = 'HBP';
    }
    // Handle walks (BB) next
    else if (pa.pa_why === 'BB' || pa.why_base_reached === 'BB') {
      displayText = 'BB';
    }
    // Handle strikeouts (K) next
    else if (strikeoutStatus) {
      const paWhy = (pa.pa_why || pa.why_base_reached || 'K').toString();
      displayText = paWhy; // Will be either 'K' or 'KK'
    }
    // For errors, show the base with E
    else if (isError && initialBase > 0) {
      displayText = `${initialBase}E`;
    }
    // For bunts, show the base with B
    else if (isBunt && initialBase > 0) {
      displayText = `${initialBase}B`; // Return base number + B for bunts
    }
    // For fielder's choice
    else if (isFC) {
      displayText = 'FC';
    }
    // For standard hits based on initial base reached (same as base path)
    else if (isHit) {
      // Special case for home runs
      if (initialBase === 4) {
        if (pa.pa_why === 'GS') {
          displayText = 'GS';
        } else {
          displayText = 'HR';
        }
      } 
      // Special case for "hard hit"
      else if (pa.pa_why === 'HH') {
        displayText = 'HH';
      }
      // Regular base hits
      else if (initialBase === 1) {
        displayText = '1B';
      } else if (initialBase === 2) {
        displayText = '2B';
      } else if (initialBase === 3) {
        displayText = '3B';
      }
    } 
    // For outs
    else if (isOut || initialBase === 0) {
      const paWhy = pa.pa_why || pa.why_base_reached || '';
      
      if (paWhy === 'GO') displayText = 'GO';
      else if (paWhy === 'FO') displayText = 'FO';
      else if (paWhy === 'LO') displayText = 'LO';
      else if (paWhy === 'FB') displayText = 'FB';
      else if (paWhy === 'SF') displayText = 'SF';
      else if (paWhy === 'SB') displayText = 'SB';
      else displayText = 'OUT';
    }
    // If nothing else matched but we have pa_result
    else if (initialBase > 0) {
      // For standard hits based on initial base reached
      if (initialBase === 1) displayText = '1B';
      else if (initialBase === 2) displayText = '2B';
      else if (initialBase === 3) displayText = '3B';
      else if (initialBase === 4) displayText = 'HR';
    }
    // Fallback to empty string if no other condition matched
    else {
      displayText = result || '';
    }
    
    // Final check - never display just "0" as the result
    if (displayText === '0') {
      displayText = 'OUT';
    }

    // Determine the circle style
    let circleStyle = '';
    const outValue = pa.out !== undefined ? pa.out : 0;
    const isPlayerOut = isOut || outValue > 0;
    
    // For batter_seq_id circle: out > 0 then red, out = 0 then gray with light border
    if (isPlayerOut) {
      circleStyle = 'text-red-600 border-2 border-red-300'; // Red for outs
    } else {
      circleStyle = 'text-gray-700 border border-gray-500'; // Gray with light border for non-outs
    }

    // Determine path color - this will be used for both the text and the paths
    let pathColor = '';
    
    if (isOut || outValue > 0 || strikeoutStatus) {
      // Red for outs and strikeouts
      pathColor = '#DC2626';
    } else if (isError) {
      // Red for errors
      pathColor = '#DC2626';
    } else if (walkStatus || pa.pa_why === 'HBP' || isFC) {
      // Black for walks, HBP, fielder's choice
      pathColor = '#333333';
    } else if (isHit || isBunt) {
      // Purple for hits and bunts
      pathColor = '#9333EA';
    } else {
      // Default color
      pathColor = '#333333';
    }

    // Handle special cases for hit marker color - keep this separate
    let hitMarkerColor = '';
    if (isError) {
      hitMarkerColor = 'text-red-600'; // Red X for errors
    } else if (outValue > 0 || isOut) {
      hitMarkerColor = 'text-red-600'; // Red X for outs
    } else if (walkStatus || pa.pa_why === 'HBP') {
      hitMarkerColor = 'text-black'; // Black X for walks and HBP
    } else {
      hitMarkerColor = 'text-purple-600'; // Purple X for hits and other cases
    }

    return {
      circleStyle,
      displayText,
      pathColor,
      hitMarkerColor
    };
  };

  // Use the function to get all styling and display information
  const { circleStyle, displayText, pathColor, hitMarkerColor } = getDisplayConfig();

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
      data-component="BaseballField"
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
      
      {/* Diamond shape - always show */}
      <div className="absolute transform rotate-45 w-6 h-6 border border-gray-400 bottom-1"></div>
      
      {/* Base path visualization - smaller size */}
      {pa && (
        <svg 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-9 h-9 z-11" 
          viewBox="-1 -1 40 40" 
          style={{ marginLeft: '-1px', marginBottom: '-1px' }}
        >
          {(() => {
            // Get initial base reached (from pa_result or bases_reached)
            let initialBase = getInitialBaseReached();
            
            // Get final base reached (from br_result)
            const finalBase = getFinalBaseReached();
            
            // Convert to numbers for proper comparison
            const initialBaseNum = Number(initialBase);
            const finalBaseNum = Number(finalBase);
            
            // Only hide paths for strikeouts - walks should show a path to first base
            if (strikeoutStatus) {
              return null;
            }
            
            // Check for error
            const isError = pa.pa_why === 'E' || pa.why_base_reached === 'E';
            
            // Set colors for initial paths and advancement paths
            let initialPathColor = '#9333EA'; // Purple for initial pa_result > 0
            if (isError) {
              initialPathColor = '#DC2626'; // Red for errors
            }
            
            // Always use black for br_result (advancement paths)
            const advancementPathColor = '#333333'; // Black for base advancement (br_result)
            
            return (
              <>
                {/* Home to first - Always show for any initial base */}
                {initialBaseNum >= 1 && (
                  <path 
                    d="M20,40 L40,20" 
                    stroke={initialPathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* First to second - Only for pa_result >= 2 */}
                {initialBaseNum >= 2 && (
                  <path 
                    d="M40,20 L20,0" 
                    stroke={initialPathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Second to third - Only for pa_result >= 3 */}
                {initialBaseNum >= 3 && (
                  <path 
                    d="M20,0 L0,20" 
                    stroke={initialPathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Third to home - Only for pa_result = 4 */}
                {initialBaseNum >= 4 && (
                  <path 
                    d="M0,20 L20,40" 
                    stroke={initialPathColor} 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                )}
                
                {/* Base advancement paths - only show if finalBase > initialBase */}
                {finalBaseNum > initialBaseNum && initialBaseNum > 0 && (
                  <>
                    <path 
                      d="M40,20 L20,0" 
                      stroke={advancementPathColor} 
                      strokeWidth="2" 
                      fill="none"
                      style={{ display: initialBaseNum === 1 && finalBaseNum >= 2 ? 'block' : 'none' }}
                    />
                    
                    <path 
                      d="M20,0 L0,20" 
                      stroke={advancementPathColor} 
                      strokeWidth="2" 
                      fill="none"
                      style={{ display: initialBaseNum <= 2 && finalBaseNum >= 3 ? 'block' : 'none' }}
                    />
                    
                    <path 
                      d="M0,20 L20,40" 
                      stroke={advancementPathColor} 
                      strokeWidth="2" 
                      fill="none"
                      style={{ display: initialBaseNum <= 3 && finalBaseNum >= 4 ? 'block' : 'none' }}
                    />
                  </>
                )}
              </>
            );
          })()}
        </svg>
      )}
      
      {/* Hit marker - small X with color based on whether player reached base or if there was an error 
         Only show if we have a valid hitDirection that's not 0 */}
      {hitDirection !== null && hitDirection !== undefined && hitDirection !== 0 && 
       !walkStatus && !strikeoutStatus && (
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
        className={`absolute z-20 font-bold`}
        style={{
          top: playerReachedBase() ? '60%' : '65%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: pathColor // Use the exact same color as the base path
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
      
      {/* Add bottom left indicator for SLAP, LATE, or BUNT */}
      {pa && (
        (() => {
          let indicator = '';
          let indicatorColor = '';
          
          if (pa.slap === 1) {
            indicator = 'SLAP';
            indicatorColor = 'border-purple-600';
          } else if (pa.bunt === 1) {
            indicator = 'BUNT';
            indicatorColor = 'border-purple-600';
          } else if (pa.late_swings !== undefined && pa.late_swings > 1) {
            indicator = 'LATE';
            indicatorColor = 'border-red-600';
          }
          
          if (indicator) {
            return (
              <div 
                className={`absolute text-gray-700 font-bold text-opacity-90 border ${indicatorColor} rounded-full flex items-center justify-center`}
                style={{ 
                  fontSize: '0.5rem', // Slightly smaller than before
                  bottom: '1px',
                  left: '1px',
                  padding: '1px 2px',
                  lineHeight: '1',
                  borderWidth: '1px'
                }}
              >
                {indicator}
              </div>
            );
          }
          
          return null;
        })()
      )}
      
      {/* Add plate appearance indicator (only shown when interactive and empty) - adjusted position */}
      {isInteractive && !result && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '11px' }}>
          <div className="text-red-500 text-[10px] font-bold">NEW</div>
        </div>
      )}
    </div>
  );
};

export default BaseballField; 