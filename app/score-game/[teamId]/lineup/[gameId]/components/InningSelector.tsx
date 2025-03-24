import React, { useState, useEffect } from 'react';
import { Player } from './LineupTable';

interface InningSelectorProps {
  currentInning: number;
  setCurrentInning: (inning: number) => void;
  availableInnings: number[];
  handleCopyPreviousInning: () => void;
  handleAddInning: () => void;
  saveLineups: () => void;
  lineupChanged: boolean;
  activeTab: 'home' | 'away';
  homeLineup: Player[];
  awayLineup: Player[];
  handleDeleteLineup: () => void;
  fetchPreviousInningLineup?: (inningNumber: number) => Promise<boolean>;
}

const InningSelector: React.FC<InningSelectorProps> = ({
  currentInning,
  setCurrentInning,
  availableInnings,
  handleCopyPreviousInning,
  handleAddInning,
  saveLineups,
  lineupChanged,
  activeTab,
  homeLineup,
  awayLineup,
  handleDeleteLineup,
  fetchPreviousInningLineup
}) => {
  // Calculate the scroll window - default to showing innings 1-9
  const [startInning, setStartInning] = useState(1);
  const visibleInningCount = 9;
  const endInning = startInning + visibleInningCount - 1;
  
  // Determine if we need navigation arrows
  const hasMoreInningsLeft = startInning > 1;
  const hasMoreInningsRight = endInning < Math.max(...availableInnings);
  
  // Get visible innings in the current window
  const visibleInnings = availableInnings.filter(
    inning => inning >= startInning && inning <= endInning
  );
  
  // Auto-scroll to make current inning visible
  useEffect(() => {
    if (currentInning < startInning) {
      setStartInning(Math.max(1, currentInning));
    } else if (currentInning > endInning) {
      setStartInning(Math.max(1, currentInning - visibleInningCount + 1));
    }
  }, [currentInning]);
  
  // Start new inning - using server-side data when available
  const handleStartNewInning = async () => {
    // If we already have lineup data for the current inning
    if (hasLineupForInning(currentInning)) {
      // Calculate the next inning number
      const nextInning = currentInning + 1;
      console.log(`Starting new inning: ${nextInning}`);
      
      // Check if the next inning exists in available innings
      const nextInningExists = availableInnings.includes(nextInning);
      
      if (!nextInningExists) {
        // If next inning doesn't exist yet, add it first
        console.log(`Inning ${nextInning} doesn't exist yet - adding it`);
        handleAddInning();
        
        // The handleAddInning function will update currentInning and setCurrentInning
        // So we need to wait before trying to populate it
        // We'll use the fetchPreviousInningLineup after a delay 
        setTimeout(async () => {
          if (fetchPreviousInningLineup) {
            console.log(`Using server-side endpoint to populate new inning ${nextInning}`);
            const success = await fetchPreviousInningLineup(nextInning);
            if (!success) {
              console.error(`Failed to fetch lineup data for new inning ${nextInning}`);
            }
          }
        }, 300);
      } else {
        // The inning already exists, let's check if it has data
        const hasNextInningData = hasLineupForInning(nextInning);
        
        if (!hasNextInningData) {
          // First navigate to the next inning
          console.log(`Navigating to existing inning ${nextInning} and will populate it`);
          // First set the current inning, then populate
          setCurrentInning(nextInning);
          
          // Delay fetching data so UI can update first
          setTimeout(async () => {
            if (fetchPreviousInningLineup) {
              console.log(`Using server-side endpoint to populate existing inning ${nextInning}`);
              const success = await fetchPreviousInningLineup(nextInning);
              if (!success) {
                console.error(`Failed to fetch lineup data for existing inning ${nextInning}`);
              }
            }
          }, 300);
        } else {
          // Just navigate to the next inning, it already has data
          console.log(`Navigating to inning ${nextInning} which already has lineup data`);
          setCurrentInning(nextInning);
        }
      }
    } else {
      console.log(`Cannot start new inning - current inning ${currentInning} has no lineup data`);
    }
  };
  
  // Check if an inning has lineup data for the active tab
  const hasLineupForInning = (inning: number): boolean => {
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    return currentLineup.some(player => player.inning_number === inning);
  };
  
  // Get the last inning with saved lineup data
  const getLastSavedInning = (): number => {
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    if (currentLineup.length === 0) return 0;
    
    const savedInnings = Array.from(new Set(
      currentLineup.map(player => player.inning_number)
    )).sort((a: number, b: number) => a - b);
    
    return savedInnings.length > 0 ? (savedInnings[savedInnings.length - 1] as number) : 0;
  };
  
  // Check if the current inning is the last saved inning or inning 1
  const isLastSavedOrFirstInning = (): boolean => {
    const lastSavedInning = getLastSavedInning();
    return currentInning === 1 || currentInning === lastSavedInning;
  };
  
  // Confirm delete lineup
  const confirmDeleteLineup = () => {
    if (confirm(`Are you sure you want to delete the ${activeTab} team lineup for inning ${currentInning}?`)) {
      handleDeleteLineup();
    }
  };
  
  return (
    <div className="flex items-center space-x-3">
      {/* Left scroll button */}
      {hasMoreInningsLeft && (
        <button
          onClick={() => setStartInning(Math.max(1, startInning - visibleInningCount))}
          className="flex items-center justify-center h-8 w-8 rounded-md border bg-white text-gray-600 border-gray-300 hover:bg-gray-50 transition-colors"
          title="View earlier innings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      {/* Inning circles */}
      {visibleInnings.map(inning => {
        const hasLineup = hasLineupForInning(inning);
        return (
          <button
            key={inning}
            onClick={() => hasLineup ? setCurrentInning(inning) : null}
            className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
              currentInning === inning
                ? 'bg-indigo-600 text-white' 
                : hasLineup
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-default'
            }`}
            title={hasLineup ? `Go to inning ${inning}` : `No ${activeTab} team lineup for inning ${inning}`}
            disabled={!hasLineup}
          >
            {inning}
          </button>
        );
      })}
      
      {/* Right scroll button */}
      {hasMoreInningsRight && (
        <button
          onClick={() => setStartInning(Math.min(Math.max(...availableInnings) - visibleInningCount + 1, startInning + visibleInningCount))}
          className="flex items-center justify-center h-8 w-8 rounded-md border bg-white text-gray-600 border-gray-300 hover:bg-gray-50 transition-colors"
          title="View later innings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {/* Vertical divider */}
      <div className="h-8 border-l border-gray-300 mx-1"></div>
      
      {/* Start New Inning button */}
      <button
        onClick={handleStartNewInning}
        className={`flex items-center justify-center h-8 px-2 rounded-md text-sm font-medium border ${
          hasLineupForInning(currentInning) && isLastSavedOrFirstInning()
            ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 transition-colors'
            : 'text-gray-400 border-gray-300 bg-gray-50 cursor-not-allowed'
        }`}
        title={!hasLineupForInning(currentInning) 
          ? "No lineup data to copy from current inning" 
          : !isLastSavedOrFirstInning()
            ? "Must be on the last saved inning or inning 1 to add a new inning"
            : "Start new inning with lineup from current inning"}
        disabled={!hasLineupForInning(currentInning) || !isLastSavedOrFirstInning()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>New Inning</span>
      </button>
      
      {/* Save button */}
      <button 
        onClick={saveLineups}
        className="flex items-center justify-center h-8 px-2 rounded-md text-sm font-medium border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 transition-colors"
        title="Save Lineup"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span>Save Lineup</span>
      </button>
      
      {/* Delete button */}
      <button 
        onClick={confirmDeleteLineup}
        className={`flex items-center justify-center h-8 px-2 rounded-md text-sm font-medium border ${
          !hasLineupForInning(currentInning)
            ? 'text-gray-400 border-gray-300 cursor-not-allowed'
            : 'text-red-700 border-red-500 hover:bg-red-50 transition-colors'
        }`}
        disabled={!hasLineupForInning(currentInning)}
        title={!hasLineupForInning(currentInning) 
          ? `No lineup data to delete for inning ${currentInning}` 
          : `Delete lineup for inning ${currentInning}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete Lineup</span>
      </button>
      
      {/* Unsaved indicator */}
      {lineupChanged && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 flex items-center ml-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Unsaved
        </span>
      )}
    </div>
  );
};

export default InningSelector; 