import { ScoreBookEntry } from '@/app/types/scoreTypes';

interface CountSectionProps {
  editedPA: ScoreBookEntry;
  incrementCounter: (field: string, value?: number) => void;
  decrementCounter: (field: string, value?: number) => void;
  handleInputChange?: (field: string, value: any) => void;
}

const CountSection = ({ editedPA, incrementCounter, decrementCounter, handleInputChange }: CountSectionProps) => {
  // Calculate current count
  const balls = editedPA.balls_before_play || 0;
  const strikes = editedPA.strikes_before_play || 0;
  
  // Handle ball increment with max of 3
  const handleBallIncrement = () => {
    if (balls < 3) {
      incrementCounter('balls_before_play');
    }
  };
  
  // Handle strike increment - count as unsure
  const handleStrikeIncrement = () => {
    // Only increment strikes_unsure, not strikes_before_play
    incrementCounter('strikes_unsure');
  };

  // Add a handler for strike decrement that also decreases unsure strikes
  const handleStrikeDecrement = () => {
    // Only decrement unsure if there are any unsure strikes
    if ((editedPA.strikes_unsure || 0) > 0) {
      decrementCounter('strikes_unsure');
    } 
    // If no unsure strikes, try to decrement other types in this order: swinging, watching
    else if ((editedPA.strikes_swinging || 0) > 0) {
      decrementCounter('strikes_swinging');
    }
    else if ((editedPA.strikes_watching || 0) > 0) {
      decrementCounter('strikes_watching');
    }
  };

  // Handle foul increment with special logic for two-strike situations
  const handleFoulIncrement = () => {
    // Always increment the fouls counter
    incrementCounter('fouls');
    
    // Get current strikes
    const strikes = editedPA.strikes_before_play || 0;
    
    // If already at 2 strikes, increment fouls_after_two_strikes
    if (strikes >= 2) {
      incrementCounter('fouls_after_two_strikes');
    }
    // No need to increment strikes_before_play - it will be calculated automatically
  };

  // Handle foul decrement with special logic for two-strike situations
  const handleFoulDecrement = () => {
    // Only proceed if there are fouls to decrement
    if ((editedPA.fouls || 0) <= 0) return;
    
    // Get current strikes and fouls
    const strikes = editedPA.strikes_before_play || 0;
    const foulsAfterTwoStrikes = editedPA.fouls_after_two_strikes || 0;
    
    // Decrement the fouls counter
    decrementCounter('fouls');
    
    // If we have fouls after two strikes, decrement that first
    if (foulsAfterTwoStrikes > 0) {
      decrementCounter('fouls_after_two_strikes');
    }
    // No need to decrement strikes_before_play - it will be calculated automatically
  };

  // Updated button styles with consistent gray for all subtract buttons
  const redButtonStyle = "px-1.5 py-0.5 text-xs border border-red-500 text-red-600 rounded hover:bg-red-50";
  const grayButtonStyle = "px-1.5 py-0.5 text-xs border border-gray-400 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";
  const purpleButtonStyle = "px-1.5 py-0.5 text-xs border border-purple-500 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed";
  // Updated toggle button style to match Why buttons
  const toggleButtonStyle = (isActive: boolean) => 
    `py-0.5 px-2 text-[0.6rem] font-normal rounded ${isActive 
      ? 'bg-indigo-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-purple-300'}`;

  return (
    <div className="border rounded p-2">
      <h4 className="font-medium text-sm mb-1">Count</h4>
      
      {/* Main Count Section */}
      <div className="mb-2">
        {/* Count Display - Balls and Strikes */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <span className="text-sm font-bold text-gray-700 mr-2">Balls</span>
              <div className="flex space-x-1">
                {[1, 2, 3].map(num => {
                  // Determine text color based on balls count
                  let textColor = 'text-purple-500';
                  if (balls > num) textColor = 'text-white'; // Make previous balls white
                  
                  return (
                    <div 
                      key={`ball-${num}`}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
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
            
            <div className="flex space-x-1">
              <button 
                onClick={handleBallIncrement}
                disabled={balls >= 3}
                className={purpleButtonStyle}
              >
                +
              </button>
              <button 
                onClick={() => decrementCounter('balls_before_play')}
                disabled={balls <= 0}
                className={grayButtonStyle}
              >
                -
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-bold text-gray-700 mr-2">Strikes</span>
              <div className="flex space-x-1">
                {[1, 2].map(num => {
                  // Determine text color based on strikes count
                  let textColor = 'text-red-600';
                  if (strikes > num) textColor = 'text-white'; // Make previous strikes white
                  
                  return (
                    <div 
                      key={`strike-${num}`}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
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
            
            <div className="flex space-x-1">
              <button 
                onClick={handleStrikeIncrement}
                className={redButtonStyle}
              >
                +
              </button>
              <button 
                onClick={handleStrikeDecrement}
                disabled={strikes <= 0}
                className={grayButtonStyle}
              >
                -
              </button>
            </div>
          </div>
        </div>
        
        {/* Strike Types */}
        <div className="mb-2">
          <h5 className="text-xs font-medium text-gray-600 mb-1 pt-2">Strike Breakdown</h5>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Watching: {editedPA.strikes_watching || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => incrementCounter('strikes_watching')}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => decrementCounter('strikes_watching')}
                  disabled={(editedPA.strikes_watching || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Swinging: {editedPA.strikes_swinging || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => incrementCounter('strikes_swinging')}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => decrementCounter('strikes_swinging')}
                  disabled={(editedPA.strikes_swinging || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Fouls: {editedPA.fouls || 0}</label>
              <div className="flex items-center">
                <div className="flex space-x-1">
                  <button 
                    onClick={handleFoulIncrement}
                    className={purpleButtonStyle}
                  >
                    +
                  </button>
                  <button 
                    onClick={handleFoulDecrement}
                    disabled={(editedPA.fouls || 0) <= 0}
                    className={grayButtonStyle}
                  >
                    -
                  </button>
                </div>
                {/* Foul indicator */}
                {(editedPA.fouls || 0) > 0 && (
                  <div className="ml-2 w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center text-xs font-medium text-yellow-600">
                    {editedPA.fouls}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Ball Swinging: {editedPA.ball_swinging || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => {
                    // Only increment ball_swinging counter
                    incrementCounter('ball_swinging');
                    // No need to increment strikes_before_play - it will be calculated automatically
                  }}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => {
                    // Only decrement if there are any ball_swinging
                    if ((editedPA.ball_swinging || 0) > 0) {
                      decrementCounter('ball_swinging');
                      // No need to decrement strikes_before_play - it will be calculated automatically
                    }
                  }}
                  disabled={(editedPA.ball_swinging || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* NEW: Pitcher and Catcher Stats Section */}
        <div className="mb-2">
          <h5 className="text-xs font-medium text-gray-600 mb-1 pt-2">Pitcher and Catcher Stats</h5>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Wild Pitches: {editedPA.wild_pitch || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => incrementCounter('wild_pitch')}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => decrementCounter('wild_pitch')}
                  disabled={(editedPA.wild_pitch || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Passed Balls: {editedPA.passed_ball || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => incrementCounter('passed_ball')}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => decrementCounter('passed_ball')}
                  disabled={(editedPA.passed_ball || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Batting Statistics Section */}
        <div className="mb-2">
          <h5 className="text-xs font-medium text-gray-600 mb-1 pt-2">Batting Statistics</h5>
          
          {/* Counter-based statistics (RBI, Late Swings) */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">RBI: {editedPA.rbi || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => incrementCounter('rbi')}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => decrementCounter('rbi')}
                  disabled={(editedPA.rbi || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Late Swings: {editedPA.late_swings || 0}</label>
              <div className="flex space-x-1">
                <button 
                  onClick={() => incrementCounter('late_swings')}
                  className={purpleButtonStyle}
                >
                  +
                </button>
                <button 
                  onClick={() => decrementCounter('late_swings')}
                  disabled={(editedPA.late_swings || 0) <= 0}
                  className={grayButtonStyle}
                >
                  -
                </button>
              </div>
            </div>
          </div>
          
          {/* Toggle-based statistics (QAB, Hard Hit) - Styled like Why buttons */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 pt-2">
              Quality Indicators
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => {
                  // Toggle QAB between 'QAB' and null
                  const newValue = editedPA.qab === 'QAB' ? null : 'QAB';
                  if (handleInputChange) {
                    handleInputChange('qab', newValue);
                  }
                }}
                className={toggleButtonStyle(editedPA.qab === 'QAB')}
                title="Quality At Bat"
              >
                Quality AB
              </button>
              
              <button
                onClick={() => {
                  // Toggle Hard Hit between 'HH' and null
                  const newValue = editedPA.hh === 'HH' ? null : 'HH';
                  if (handleInputChange) {
                    // Update both hh and hard_hit fields for consistency
                    handleInputChange('hh', newValue);
                  }
                }}
                className={toggleButtonStyle(editedPA.hh === 'HH')}
                title="Hard Hit"
              >
                Hard Hit
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Horizontal divider - No longer needed since we moved Wild Pitches and Passed Balls */}
    </div>
  );
};

export default CountSection; 