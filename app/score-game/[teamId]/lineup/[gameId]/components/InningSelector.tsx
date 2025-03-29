import React, { useState, useEffect, useCallback, memo } from 'react';
import { Player } from './LineupTable';

interface InningSelectorProps {
  currentInning: number;
  setCurrentInning: (inning: number) => void;
  availableInnings: number[];
  handleCopyPreviousInning?: () => void;
  handleAddInning?: () => void;
  saveLineups?: () => void;
  lineupChanged?: boolean;
  activeTab?: 'home' | 'away';
  homeLineup?: any[];
  awayLineup?: any[];
  handleDeleteLineup?: () => void;
  fetchPreviousInningLineup?: (inningNumber: number) => Promise<boolean>;
  hideActionButtons?: boolean;
  isLoading?: boolean;
}

// Define constant for the default number of visible innings
const DEFAULT_VISIBLE_INNINGS = 7;

const InningSelector: React.FC<InningSelectorProps> = memo(({
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
  fetchPreviousInningLineup,
  hideActionButtons = false,
  isLoading = false
}) => {
  // Only show the default number of innings unless expanded
  const [showAllInnings, setShowAllInnings] = useState(false);
  
  // Set to inning 1 by default if currentInning is not set
  useEffect(() => {
    if (!currentInning) {
      setCurrentInning(1);
    }
  }, [currentInning, setCurrentInning]);
  
  // Get innings with saved data for the active tab
  const getSavedInnings = useCallback((): number[] => {
    if (!activeTab || !homeLineup || !awayLineup) return [1];
    
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    if (!currentLineup || currentLineup.length === 0) return [1];
    
    const savedInnings = Array.from(new Set(
      currentLineup.map(player => player.inning_number)
    )).sort((a: number, b: number) => a - b);
    
    // Always include inning 1, even if it's not saved
    if (!savedInnings.includes(1)) {
      savedInnings.unshift(1);
    }
    
    return savedInnings;
  }, [activeTab, homeLineup, awayLineup]);
  
  // Show only saved innings (plus inning 1)
  const savedInnings = getSavedInnings();
  
  // Calculate which innings to show based on expansion state
  const visibleInnings = showAllInnings 
    ? savedInnings 
    : savedInnings.slice(0, DEFAULT_VISIBLE_INNINGS);
  
  // Toggle between showing default or all innings
  const toggleInningsView = useCallback(() => {
    setShowAllInnings(prev => !prev);
  }, []);
  
  // Check if an inning has lineup data for the active tab
  const hasLineupForInning = useCallback((inning: number): boolean => {
    if (!activeTab || !homeLineup || !awayLineup) return false;
    
    // Get the current lineup based on the active tab
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    
    // Check if any players exist for this inning
    return currentLineup.some(player => 
      player.inning_number === inning && 
      player.home_or_away === activeTab
    );
  }, [activeTab, homeLineup, awayLineup]);
  
  // Get the last inning with saved lineup data
  const getLastSavedInning = useCallback((): number => {
    if (!activeTab || !homeLineup || !awayLineup) return 0;
    
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    if (!currentLineup || currentLineup.length === 0) return 0;
    
    const savedInnings = Array.from(new Set(
      currentLineup.map(player => player.inning_number)
    )).sort((a: number, b: number) => a - b);
    
    return savedInnings.length > 0 ? (savedInnings[savedInnings.length - 1] as number) : 0;
  }, [activeTab, homeLineup, awayLineup]);
  
  // Get the next inning number after the last saved inning
  const getNextInningNumber = useCallback((): number => {
    const lastSavedInning = getLastSavedInning();
    return lastSavedInning > 0 ? lastSavedInning + 1 : 2;
  }, [getLastSavedInning]);
  
  // Check if the current inning is the last saved inning or inning 1
  const isLastSavedOrFirstInning = useCallback((): boolean => {
    const lastSavedInning = getLastSavedInning();
    return currentInning === 1 || currentInning === lastSavedInning;
  }, [currentInning, getLastSavedInning]);
  
  // Start new inning - using server-side data
  const handleStartNewInning = useCallback(async () => {
    // If we already have lineup data for the current inning
    if (hasLineupForInning(currentInning)) {
      // Calculate the next inning number
      const nextInning = currentInning + 1;
      
      // Check if the next inning exists in available innings
      const nextInningExists = availableInnings.includes(nextInning);
      
      if (!nextInningExists) {
        // If next inning doesn't exist yet, add it first
        if (handleAddInning) {
          handleAddInning();
        }
        
        // The handleAddInning function will update currentInning and setCurrentInning
        // So we need to wait before trying to populate it
        // We'll use the fetchPreviousInningLineup after a delay 
        setTimeout(async () => {
          if (fetchPreviousInningLineup) {
            await fetchPreviousInningLineup(nextInning);
          }
        }, 300);
      } else {
        // The inning already exists, let's check if it has data
        const hasNextInningData = hasLineupForInning(nextInning);
        
        if (!hasNextInningData) {
          // First navigate to the next inning
          // First set the current inning, then populate
          setCurrentInning(nextInning);
          
          // Delay fetching data so UI can update first
          setTimeout(async () => {
            if (fetchPreviousInningLineup) {
              await fetchPreviousInningLineup(nextInning);
            }
          }, 300);
        } else {
          // Just navigate to the next inning, it already has data
          setCurrentInning(nextInning);
        }
      }
    }
  }, [currentInning, availableInnings, handleAddInning, fetchPreviousInningLineup, setCurrentInning, hasLineupForInning]);
  
  // Confirm delete lineup
  const confirmDeleteLineup = useCallback(() => {
    if (handleDeleteLineup) {
      handleDeleteLineup();
    }
  }, [handleDeleteLineup]);
  
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center mb-2">
        {/* Show currently visible innings */}
        <div className="flex-grow overflow-x-auto py-1 no-scrollbar">
          <div className="flex space-x-1">
            {/* Display saved innings */}
            {visibleInnings.map(inning => (
              <button
                key={inning}
                onClick={() => !isLoading && setCurrentInning(inning)}
                className={`flex-none min-w-[36px] h-[36px] flex items-center justify-center rounded-full text-xs font-medium transition-colors duration-150 ${
                  inning === currentInning
                    ? 'bg-indigo-600 text-white'
                    : hasLineupForInning(inning)
                      ? 'border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {inning}
              </button>
            ))}
            
            {/* Add the "next inning" button with a "+" only if we have saved data for at least one inning */}
            {getLastSavedInning() > 0 && !visibleInnings.includes(getNextInningNumber()) && (
              <button
                onClick={() => {
                  if (!isLoading && handleAddInning) {
                    // This will call the API endpoint to copy from the last saved inning to the next one
                    handleAddInning();
                  }
                }}
                className={`flex-none min-w-[36px] h-[36px] flex items-center justify-center rounded-full text-xs font-medium transition-colors duration-150
                  border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-600
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
                title={`Add inning ${getNextInningNumber()} with data copied from inning ${getLastSavedInning()}`}
              >
                <span className="flex items-center justify-center">
                  {getNextInningNumber()}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
        
        {/* Expansion chevron button - only show when there are more saved innings than DEFAULT_VISIBLE_INNINGS */}
        {savedInnings.length > DEFAULT_VISIBLE_INNINGS && (
          <div className="ml-2">
            <button
              onClick={() => !isLoading && toggleInningsView()}
              className={`inline-flex items-center justify-center rounded-full p-1 border border-gray-300 text-gray-500 hover:bg-gray-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transform transition-transform duration-200 ${showAllInnings ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      {!hideActionButtons && (
        <div className="flex space-x-2">
          {/* Add Inning Button */}
          <button
            onClick={handleAddInning}
            className={`flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium transition-colors ${
              !isLoading && hasLineupForInning(1)
                ? 'border-indigo-500 text-indigo-600 hover:bg-indigo-50'
                : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
            }`}
            disabled={isLoading || !hasLineupForInning(1)}
            title={!hasLineupForInning(1) ? "Save inning 1 before adding more innings" : "Add next inning"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Inning</span>
          </button>
          
          {/* Save Button */}
          <button
            onClick={saveLineups}
            className={`flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium transition-colors ${
              !isLoading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save</span>
          </button>
          
          {/* Delete Button - disabled for inning 1 */}
          <button 
            onClick={confirmDeleteLineup}
            className={`flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium transition-colors ${
              activeTab && (activeTab === 'home' ? homeLineup : awayLineup)?.some(p => p.inning_number === currentInning) && !isLoading && currentInning !== 1
                ? 'text-red-700 border-red-500 hover:bg-red-50'
                : 'text-gray-400 border-gray-300 cursor-not-allowed'
            }`}
            disabled={!activeTab || !(activeTab === 'home' ? homeLineup : awayLineup)?.some(p => p.inning_number === currentInning) || isLoading || currentInning === 1}
            title={currentInning === 1 ? "Inning 1 cannot be deleted" : "Delete this inning"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete Inning</span>
          </button>
        </div>
      )}
    </div>
  );
});

InningSelector.displayName = 'InningSelector';

export default InningSelector; 