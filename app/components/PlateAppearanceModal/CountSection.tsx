import { ScoreBookEntry } from '@/app/types/scoreTypes';
import { useState } from 'react';

interface CountSectionProps {
  editedPA: ScoreBookEntry;
  incrementCounter: (field: string, value?: number) => void;
  decrementCounter: (field: string, value?: number) => void;
  handleInputChange?: (field: string, value: any, fromFoul?: boolean) => void;
}

const CountSection = ({ editedPA, incrementCounter, decrementCounter, handleInputChange }: CountSectionProps) => {
  // Calculate current count
  const balls = editedPA.balls_before_play || 0;
  const strikes = editedPA.strikes_before_play || 0;
  
  // State for collapsible sections
  const [strikeBreakdownOpen, setStrikeBreakdownOpen] = useState(true);
  const [pitcherCatcherStatsOpen, setPitcherCatcherStatsOpen] = useState(false);
  const [qualityIndicatorsOpen, setQualityIndicatorsOpen] = useState(false);
  const [battingStatsOpen, setBattingStatsOpen] = useState(false);
  
  // Handle ball increment with max of 3
  const handleBallIncrement = () => {
    if (balls < 3) {
      incrementCounter('balls_before_play');
    }
  };
  
  // Handle foul increment with special logic for two-strike situations
  const handleFoulIncrement = () => {
    // Always increment the fouls counter for total pitch count
    incrementCounter('fouls');
    
    const currentStrikes = editedPA.strikes_before_play || 0;
    
    // If we have fewer than 2 strikes, increment strikes_before_play
    if (currentStrikes < 2) {
      // Use a special handler to prevent strikes_unsure from being incremented
      // by setting a fromFoul flag to true
      handleInputChange?.('strikes_before_play', currentStrikes + 1, true);
    }
    // If already at 2 strikes, increment fouls_after_two_strikes but don't add to strikes_before_play
    else if (currentStrikes >= 2) {
      incrementCounter('fouls_after_two_strikes');
    }
  };

  // Handle foul decrement with special logic for two-strike situations
  const handleFoulDecrement = () => {
    // Only proceed if there are fouls to decrement
    if ((editedPA.fouls || 0) <= 0) return;
    
    // Decrement the fouls counter
    decrementCounter('fouls');
    
    const currentStrikes = editedPA.strikes_before_play || 0;
    const foulsAfterTwoStrikes = editedPA.fouls_after_two_strikes || 0;
    
    // If we have fouls after two strikes, decrement that too
    if (foulsAfterTwoStrikes > 0) {
      decrementCounter('fouls_after_two_strikes');
    }
    // If current strikes is 1 or 2 and no fouls_after_two_strikes, decrement strikes_before_play
    else if (currentStrikes > 0 && currentStrikes <= 2) {
      // Use special handler with fromFoul flag to prevent auto-adjusting strikes_unsure
      handleInputChange?.('strikes_before_play', currentStrikes - 1, true);
    }
  };

  // Handle strike increment with special logic for unsure strikes
  const handleStrikeIncrement = () => {
    // Get current strikes
    const strikes = editedPA.strikes_before_play || 0;
    
    // Only proceed if we have fewer than 2 strikes
    if (strikes < 2) {
      // Increment strikes_before_play directly - this impacts pitch count
      handleInputChange?.('strikes_before_play', strikes + 1);
      
      // Increment strikes_unsure - represents generic strikes that aren't watching, swinging, ball_swinging, or fouls
      // This is the default strike type when incrementing from the main strike counter
      handleInputChange?.('strikes_unsure', (editedPA.strikes_unsure || 0) + 1);
    }
  };

  // Handle strike decrement that also decreases unsure strikes
  const handleStrikeDecrement = () => {
    // Get current strikes
    const strikes = editedPA.strikes_before_play || 0;
    
    // Only proceed if we have strikes to decrement
    if (strikes > 0) {
      // Decrement strikes_before_play directly - this impacts pitch count
      handleInputChange?.('strikes_before_play', strikes - 1);
      
      // Prioritize decrementing in this order: unsure, swinging, watching
      // This ensures we properly track which type of strike is being removed
      if ((editedPA.strikes_unsure || 0) > 0) {
        handleInputChange?.('strikes_unsure', (editedPA.strikes_unsure || 0) - 1);
      } 
      else if ((editedPA.strikes_swinging || 0) > 0) {
        handleInputChange?.('strikes_swinging', (editedPA.strikes_swinging || 0) - 1);
      }
      else if ((editedPA.strikes_watching || 0) > 0) {
        handleInputChange?.('strikes_watching', (editedPA.strikes_watching || 0) - 1);
      }
    }
  };

  // Calculate the sum of all strike types for baseball foul logic
  const calculateTotalStrikes = () => {
    return (
      (editedPA.strikes_unsure || 0) + 
      (editedPA.strikes_watching || 0) + 
      (editedPA.strikes_swinging || 0) + 
      (editedPA.ball_swinging || 0)
    );
  };

  /**
   * Baseball Count Handling Logic:
   * - strikes_before_play is affected by the main strikes [+] and [-] buttons
   * - specific strike types (watching, swinging, ball_swinging) also affect strikes_before_play when incremented/decremented
   * - strikes_before_play is also affected by fouls (special baseball rule):
   *   - When strikes_before_play < 2, a foul ball adds 1 to strikes_before_play
   *   - When strikes_before_play = 2, a foul ball does NOT add to strikes_before_play
   *   - Removing a foul decrements strikes_before_play if it had previously incremented it
   * - Each strike type has its own independent counter that's updated separately
   * - strikes_unsure is only incremented by the main strikes [+] button, not by other strike types
   */

  // Updated button styles with consistent gray for all subtract buttons
  const redButtonStyle = "px-1.5 py-0.5 text-xs border border-red-500 text-red-600 rounded hover:bg-red-50";
  const grayButtonStyle = "px-1.5 py-0.5 text-xs border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";
  const purpleButtonStyle = "px-1.5 py-0.5 text-xs border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed";
  // Updated toggle button style to match Why buttons
  const toggleButtonStyle = (isActive: boolean) => 
    `py-0.5 px-2 text-[0.6rem] font-normal rounded ${isActive 
      ? 'bg-indigo-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-purple-300'}`;

  // Collapsible section header component
  const CollapsibleHeader = ({ 
    title, 
    isOpen, 
    onToggle 
  }: { 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void;
  }) => (
    <div 
      className="flex items-center justify-between cursor-pointer py-2 px-2 rounded mb-1 bg-gray-50 hover:bg-gray-100 transition-colors duration-150 border border-gray-200"
      onClick={onToggle}
    >
      <h5 className="text-sm font-semibold text-gray-700">{title}</h5>
      <button 
        type="button"
        className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
        aria-label={isOpen ? "Collapse section" : "Expand section"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="border border-gray-300 rounded p-2 min-w-[180px] sm:min-w-0 shadow-sm bg-white">
      <div className="flex items-center pb-2 mb-2 border-b border-gray-200">
        <span className="text-base font-bold text-gray-800 tracking-tight">Count</span>
      </div>
      
      {/* Main Count Section */}
      <div className="mb-2">
        {/* Count Display - Balls and Strikes */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">Balls</span>
              <div className="flex space-x-1">
                {[1, 2, 3].map(num => {
                  // Determine text color based on balls count
                  let textColor = 'text-purple-500';
                  if (balls > num) textColor = 'text-white'; // Make previous balls white
                  
                  return (
                    <div 
                      key={`ball-${num}`}
                      className={`w-[27.27px] h-[27.27px] rounded-full flex items-center justify-center text-xs ${
                        balls >= num 
                          ? `bg-white ${textColor} border border-purple-500` 
                          : 'bg-gray-200 text-gray-200'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex space-x-1 ml-auto">
              <button 
                onClick={handleBallIncrement}
                disabled={balls >= 3}
                className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
              <button 
                onClick={() => decrementCounter('balls_before_play')}
                disabled={balls <= 0}
                className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <button 
                onClick={() => {
                  // Clear only balls count
                  handleInputChange?.('balls_before_play', 0);
                }}
                disabled={balls <= 0}
                className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                title="Clear balls count"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">Strikes</span>
              <div className="flex space-x-1">
                {[1, 2].map(num => {
                  // Determine text color based on strikes count
                  let textColor = 'text-red-600';
                  if (strikes > num) textColor = 'text-white'; // Make previous strikes white
                  
                  return (
                    <div 
                      key={`strike-${num}`}
                      className={`w-[27.27px] h-[27.27px] rounded-full flex items-center justify-center text-xs ${
                        strikes >= num 
                          ? `bg-white ${textColor} border border-red-500` 
                          : 'bg-gray-200 text-gray-200'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex space-x-1 ml-auto">
              <button 
                onClick={handleStrikeIncrement}
                disabled={strikes >= 2}
                className="px-2 py-1 text-sm border border-red-500 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
              <button 
                onClick={handleStrikeDecrement}
                disabled={strikes <= 0}
                className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <button 
                onClick={() => {
                  // Clear only strike-related counts
                  handleInputChange?.('strikes_before_play', 0);
                  handleInputChange?.('strikes_watching', 0);
                  handleInputChange?.('strikes_swinging', 0);
                  handleInputChange?.('strikes_unsure', 0);
                  handleInputChange?.('ball_swinging', 0);
                  handleInputChange?.('fouls', 0);
                  handleInputChange?.('fouls_after_two_strikes', 0);
                }}
                disabled={strikes <= 0}
                className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                title="Clear strikes count"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        
        {/* Strike Breakdown Section */}
        <div className="mb-2">
          <CollapsibleHeader 
            title="Strike Breakdown" 
            isOpen={strikeBreakdownOpen} 
            onToggle={() => setStrikeBreakdownOpen(!strikeBreakdownOpen)} 
          />
          {strikeBreakdownOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {/* Watching */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Strike not swinging">Watching:</span>
                  <span className="font-bold ml-1">{editedPA.strikes_watching || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      // Increment the specific type counter
                      incrementCounter('strikes_watching');
                      // Also increment strikes_before_play if < 2
                      const currentStrikes = editedPA.strikes_before_play || 0;
                      if (currentStrikes < 2) {
                        // Use fromFoul=true to prevent auto-adjusting strikes_unsure
                        handleInputChange?.('strikes_before_play', currentStrikes + 1, true);
                      }
                    }}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add watching strike"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => {
                      // Only decrement if there are strikes to decrement
                      const watchingStrikes = editedPA.strikes_watching || 0;
                      if (watchingStrikes > 0) {
                        decrementCounter('strikes_watching');
                        // Also decrement strikes_before_play
                        const currentStrikes = editedPA.strikes_before_play || 0;
                        if (currentStrikes > 0) {
                          // Use fromFoul=true to prevent auto-adjusting strikes_unsure
                          handleInputChange?.('strikes_before_play', currentStrikes - 1, true);
                        }
                      }
                    }}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove watching strike"
                  >
                    -
                  </button>
                </div>
              </div>
              
              {/* Swinging */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Strike swinging">Swinging:</span>
                  <span className="font-bold ml-1">{editedPA.strikes_swinging || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      // Increment the specific type counter
                      incrementCounter('strikes_swinging');
                      // Also increment strikes_before_play if < 2
                      const currentStrikes = editedPA.strikes_before_play || 0;
                      if (currentStrikes < 2) {
                        // Use fromFoul=true to prevent auto-adjusting strikes_unsure
                        handleInputChange?.('strikes_before_play', currentStrikes + 1, true);
                      }
                    }}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add swinging strike"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => {
                      // Only decrement if there are strikes to decrement
                      const swingingStrikes = editedPA.strikes_swinging || 0;
                      if (swingingStrikes > 0) {
                        decrementCounter('strikes_swinging');
                        // Also decrement strikes_before_play
                        const currentStrikes = editedPA.strikes_before_play || 0;
                        if (currentStrikes > 0) {
                          // Use fromFoul=true to prevent auto-adjusting strikes_unsure
                          handleInputChange?.('strikes_before_play', currentStrikes - 1, true);
                        }
                      }
                    }}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove swinging strike"
                  >
                    -
                  </button>
                </div>
              </div>
              
              {/* Fouls */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Foul Ball">Fouls:</span>
                  <span className="font-bold ml-1">{editedPA.fouls || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleFoulIncrement}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add foul ball"
                  >
                    +
                  </button>
                  <button 
                    onClick={handleFoulDecrement}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove foul ball"
                  >
                    -
                  </button>
                </div>
              </div>
              
              {/* Ball Swinging */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Swung at a ball that would have been a called ball">Ball Swing:</span>
                  <span className="font-bold ml-1">{editedPA.ball_swinging || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      // Increment the specific type counter
                      incrementCounter('ball_swinging');
                      // Also increment strikes_before_play if < 2
                      const currentStrikes = editedPA.strikes_before_play || 0;
                      if (currentStrikes < 2) {
                        // Use fromFoul=true to prevent auto-adjusting strikes_unsure
                        handleInputChange?.('strikes_before_play', currentStrikes + 1, true);
                      }
                    }}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add ball swinging"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => {
                      // Only decrement if there are strikes to decrement
                      const ballSwinging = editedPA.ball_swinging || 0;
                      if (ballSwinging > 0) {
                        decrementCounter('ball_swinging');
                        // Also decrement strikes_before_play
                        const currentStrikes = editedPA.strikes_before_play || 0;
                        if (currentStrikes > 0) {
                          // Use fromFoul=true to prevent auto-adjusting strikes_unsure
                          handleInputChange?.('strikes_before_play', currentStrikes - 1, true);
                        }
                      }
                    }}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove ball swinging"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* NEW: Pitcher and Catcher Stats Section - Collapsible */}
        <div className="mb-2">
          <CollapsibleHeader 
            title="Pitcher and Catcher Stats" 
            isOpen={pitcherCatcherStatsOpen} 
            onToggle={() => setPitcherCatcherStatsOpen(!pitcherCatcherStatsOpen)} 
          />
          
          {pitcherCatcherStatsOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {/* Wild Pitch */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Pitch the catcher couldn't reasonably catch">Wild P:</span>
                  <span className="font-bold ml-1">{editedPA.wild_pitch || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => incrementCounter('wild_pitch')}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add wild pitch"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => decrementCounter('wild_pitch')}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(editedPA.wild_pitch || 0) <= 0}
                    title="Remove wild pitch"
                  >
                    -
                  </button>
                </div>
              </div>
              
              {/* Passed Ball */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Catchable pitch that got by the catcher">Pass Ball:</span>
                  <span className="font-bold ml-1">{editedPA.passed_ball || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => incrementCounter('passed_ball')}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add passed ball"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => decrementCounter('passed_ball')}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(editedPA.passed_ball || 0) <= 0}
                    title="Remove passed ball"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Batting Statistics Section - Combined with Pitcher and Catcher Stats */}
        <div className="mb-2">
          <CollapsibleHeader 
            title="Batting Statistics" 
            isOpen={battingStatsOpen} 
            onToggle={() => setBattingStatsOpen(!battingStatsOpen)} 
          />
          
          {battingStatsOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {/* RBI */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Runs Batted In - Number of runs scored due to this batter's plate appearance">RBI:</span>
                  <span className="font-bold ml-1">{editedPA.rbi || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => incrementCounter('rbi')}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add RBI"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => decrementCounter('rbi')}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(editedPA.rbi || 0) <= 0}
                    title="Remove RBI"
                  >
                    -
                  </button>
                </div>
              </div>
              
              {/* Late Swings */}
              <div className="flex items-center justify-end">
                <div className="flex items-center mr-2">
                  <span className="text-sm text-gray-700" title="Swings that were noticeably late on the pitch">Late Swing:</span>
                  <span className="font-bold ml-1">{editedPA.late_swings || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => incrementCounter('late_swings')}
                    className="px-2 py-1 text-sm border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add late swing"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => decrementCounter('late_swings')}
                    className="px-2 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(editedPA.late_swings || 0) <= 0}
                    title="Remove late swing"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Quality Indicators - Collapsible */}
        <div>
          <CollapsibleHeader 
            title="Indicators" 
            isOpen={qualityIndicatorsOpen} 
            onToggle={() => setQualityIndicatorsOpen(!qualityIndicatorsOpen)} 
          />
          
          {qualityIndicatorsOpen && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {/* Map through all indicators with consistent behavior */}
              {[
                { id: 'qab', label: 'Quality AB' },
                { id: 'hard_hit', label: 'Hard Hit' },
                { id: 'slap', label: 'Slapper' },
                { id: 'bunt', label: 'Bunt' },
                { id: 'sac', label: 'Sacrifice' }
              ].map(indicator => {
                // Get current value, defaulting to 0
                const currentValue = typeof editedPA[indicator.id] === 'number' ? editedPA[indicator.id] : 0;
                const isActive = currentValue === 1;
                
                return (
                  <button
                    key={indicator.id}
                    type="button"
                    onClick={() => {
                      // Toggle between 0 and 1
                      const newValue = isActive ? 0 : 1;
                      console.log(`📊 ${indicator.label} toggled from ${isActive ? 1 : 0} to ${newValue}`, {
                        fieldName: indicator.id,
                        currentValue,
                        newValue
                      });
                      
                      if (handleInputChange) {
                        handleInputChange(indicator.id, newValue);
                      }
                    }}
                    className={`px-2 py-1 text-sm border rounded flex items-center justify-center ${
                      isActive 
                        ? 'bg-indigo-600 text-white border-indigo-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-gray-700'}>{indicator.label} {isActive ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Horizontal divider - No longer needed since we moved Wild Pitches and Passed Balls */}
    </div>
  );
};

export default CountSection; 