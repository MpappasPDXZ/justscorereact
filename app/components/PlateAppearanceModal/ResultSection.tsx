import { ScoreBookEntry } from '@/app/types/scoreTypes';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import { useState, useEffect } from 'react';

// Define array fields that should always be handled as lists of numbers
const ARRAY_FIELDS = ["hit_around_bases", "stolen_bases", "pa_error_on", "br_error_on"];

interface ResultSectionProps {
  editedPA: ScoreBookEntry;
  handleInputChange: (field: string, value: any) => void;
  incrementCounter: (field: string, value?: number) => void;
  decrementCounter: (field: string, value?: number) => void;
}

const ResultSection = ({ 
  editedPA, 
  handleInputChange,
  incrementCounter,
  decrementCounter
}: ResultSectionProps) => {
  // Define the whyOptions array that was missing
  const whyOptions = [
    { value: 'H', label: 'Hit - Single (1B)', type: 'hit' },
    { value: 'B', label: 'Bunt - Successful bunt hit', type: 'hit' },
    { value: 'BB', label: 'Base on Balls - Walk (4 balls)', type: 'hit' },
    { value: 'HBP', label: 'Hit By Pitch - Batter hit by pitch', type: 'hit' },
    { value: 'HR', label: 'Home Run - Ball hit over fence', type: 'hit' },
    { value: 'GS', label: 'Grand Slam - HR with bases loaded', type: 'hit' },
    //
    { value: 'E', label: 'Error - Reached on fielding error', type: 'other' },
    { value: 'C', label: 'Fielder\'s Choice - Out made on another runner', type: 'other' },
    //
    { value: 'K', label: 'Strikeout Swinging - Out on swinging strike', type: 'out' },
    { value: 'KK', label: 'Strikeout Looking - Out on called strike', type: 'out' },
    { value: 'GO', label: 'Ground Out - Out on ball hit on ground', type: 'out' },
    { value: 'FO', label: 'Fly Out - Out on ball hit in the air', type: 'out' },
    { value: 'LO', label: 'Line Out - Out on line drive', type: 'out' },
    { value: 'FB', label: 'Foul Ball Out - Out on caught foul ball', type: 'out' }
  ];
  // Group options by type
  const hitOptions = whyOptions.filter(option => option.type === 'hit');
  const outOptions = whyOptions.filter(option => option.type === 'out');
  const otherOptions = whyOptions.filter(option => option.type === 'other');

  // Determine which "Why Base Reached" options to show based on bases_reached
  const showOutOptions = editedPA.bases_reached === '0';
  const showReachedBaseOptions = editedPA.bases_reached !== '0' && editedPA.bases_reached !== '';
  
  // Get the current bases reached as a number
  const basesReached = parseInt(editedPA.bases_reached || '0');
  
  // Add a helper function to check if a position is in the br_error_on field
  const isErrorOnPosition = (errorOn: any, position: string | number): boolean => {
    if (!errorOn) return false;
    
    const positionStr = position.toString();
    
    // Handle string type (comma-separated values)
    if (typeof errorOn === 'string') {
      return errorOn.split(',').map(p => p.trim()).includes(positionStr);
    }
    
    // Handle array type
    if (Array.isArray(errorOn)) {
      return errorOn.some(p => p.toString() === positionStr);
    }
    
    return false;
  };
  
  // Helper function to safely ensure we have an array of appropriate type
  const safeArray = (value: any, fieldName: string): number[] => {
    if (!value) return [];
    
    // Check if this is a field that should be stored as numbers
    const shouldBeNumbers = ARRAY_FIELDS.includes(fieldName);
    
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'string' ? Number(item) : Number(item));
    }
    
    if (typeof value === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map(item => typeof item === 'string' ? Number(item) : Number(item));
        }
        
        // Handle string format like "['2', '3', '4']"
        if (value.includes('[') && value.includes(']')) {
          const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
          if (cleanedStr.trim() === '') return [];
          return cleanedStr.split(',').map(item => Number(item.trim()));
        }
        
        // Handle comma-separated values
        if (value.includes(',')) {
          return value.split(',').map(item => Number(item.trim()));
        }
        
        // Single value
        if (value.trim() !== '') {
          return [Number(value.trim())];
        }
      } catch (e) {
        // If parsing fails, try simpler methods
        if (value.includes(',')) {
          return value.split(',').map(item => Number(item.trim()));
        }
        if (value.trim() !== '') {
          return [Number(value.trim())];
        }
      }
    }
    
    return [];
  };
  
  // Helper function to safely check if a value is in an array
  const safeIncludes = (array: any[], value: string | number): boolean => {
    if (!array || !Array.isArray(array)) return false;
    const numValue = typeof value === 'string' ? Number(value) : value;
    return array.some(item => Number(item) === numValue);
  };
  
  // Effect to ensure "out" is set correctly based on br_result and out_at
  useEffect(() => {
    // Only run this effect if editedPA is properly loaded
    if (!editedPA) return;
    
    // Set out=1 if br_result=0 or out_at has a value
    if (editedPA.br_result === 0 || (editedPA.out_at && editedPA.out_at > 0)) {
      if (editedPA.out !== 1) {
        handleInputChange('out', 1);
      }
    } else {
      // Clear out if neither condition is true
      if (editedPA.out === 1) {
        handleInputChange('out', 0);
      }
    }
  }, [editedPA?.br_result, editedPA?.out_at, editedPA?.out]);
  
  // Effect to update Final Base based on stolen or hit bases
  useEffect(() => {
    // Only run this effect if editedPA is properly loaded
    if (!editedPA) return;
    
    try {
      // Get the current stolen and hit around bases
      const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
      const hitAround = safeArray(editedPA.hit_around_bases, 'hit_around_bases');
      
      // Get the maximum base from each array
      const maxStolenBase = stolenBases.length > 0 ? Math.max(...stolenBases) : 0;
      const maxHitBase = hitAround.length > 0 ? Math.max(...hitAround) : 0;
      
      // Calculate the maximum base reached through stealing or hitting
      const maxAdvancedBase = Math.max(maxStolenBase, maxHitBase);
      
      // Get the current base reached and br_result
      const currentBasesReached = parseInt(editedPA.bases_reached || '0');
      const currentBrResult = editedPA.br_result !== undefined ? editedPA.br_result : currentBasesReached;
      
      // Only update if the runner is not out and the max advanced base is greater than current br_result
      if (currentBrResult !== 0 && maxAdvancedBase > currentBrResult) {
        // Update br_result to the maximum advanced base
        handleInputChange('br_result', maxAdvancedBase);
      }
    } catch (error) {
      // Removed console.error
    }
  }, [editedPA?.stolen_bases, editedPA?.hit_around_bases]);
  
  // Effect to handle BB and HBP selections
  useEffect(() => {
    // Only run this effect if editedPA is properly loaded
    if (!editedPA) return;
    
    // Skip processing for newly created PA with no interactions
    const isNewlyCreatedPA = !editedPA.pa_why && editedPA.pitch_count === 0 && 
                            editedPA.balls_before_play === 0 && editedPA.strikes_before_play === 0;
    
    // Don't run effects if this is a newly created PA that hasn't been interacted with yet
    if (isNewlyCreatedPA) return;
    
    if (editedPA.pa_why === 'BB' || editedPA.pa_why === 'HBP') {
      // Set bases_reached to 1 if not already
      if (editedPA.bases_reached !== '1') {
        handleInputChange('bases_reached', '1');
      }
      
      // Clear the detailed_result field if it's set
      if (editedPA.detailed_result) {
        handleInputChange('detailed_result', '');
      }
      
      // For BB (walk), set balls_before_play to 3 (maximum allowed value)
      if (editedPA.pa_why === 'BB' && editedPA.balls_before_play < 3) {
        handleInputChange('balls_before_play', 3);
      }
      
      // For HBP, increment pitch_count by 1 if it wasn't already counted
      if (editedPA.pa_why === 'HBP' && !editedPA.hbp_counted) {
        // Increment pitch count
        incrementCounter('pitch_count');
        // Mark that we've counted this HBP in the pitch count
        handleInputChange('hbp_counted', true);
      }
    } else if (editedPA.pa_why === 'H' || editedPA.pa_why === 'B') {
      // For hits and bunts, set bases_reached to 1 if not already set
      if (editedPA.bases_reached !== '1') {
        handleInputChange('bases_reached', '1');
      }
    } else if (editedPA.pa_why === 'E' || editedPA.pa_why === 'C') {
      // For errors and fielder's choice, set bases_reached to 1 if not already set
      if (editedPA.bases_reached !== '1') {
        handleInputChange('bases_reached', '1');
      }
    } else if (editedPA.pa_why === 'K' || editedPA.pa_why === 'KK') {
      // For strikeouts, update strikes_before_play only if not already set properly
      if (editedPA.strikes_before_play < 2) {
        handleInputChange('strikes_before_play', 2);
      }
      
      // If there were no strikes registered, add them to strikes_unsure
      const totalStrikes = (editedPA.strikes_watching || 0) + 
                          (editedPA.strikes_swinging || 0) + 
                          (editedPA.strikes_unsure || 0);
                          
      if (totalStrikes < 2) {
        // Calculate how many strikes are missing
        const missingStrikes = 2 - totalStrikes;
        // Add the missing strikes to strikes_unsure
        handleInputChange('strikes_unsure', (editedPA.strikes_unsure || 0) + missingStrikes);
      }
      
      // Set bases_reached to 0 for strikeouts
      if (editedPA.bases_reached !== '0') {
        handleInputChange('bases_reached', '0');
      }
      
      // For KK (looking), ensure at least one strike is watching
      if (editedPA.pa_why === 'KK') {
        // Set at least one watching strike, preserving any existing value
        const currentWatching = editedPA.strikes_watching || 0;
        if (currentWatching === 0) {
          // Adjust strikes distribution: convert one unsure strike to watching
          const currentUnsure = editedPA.strikes_unsure || 0;
          if (currentUnsure > 0) {
            handleInputChange('strikes_watching', 1);
            handleInputChange('strikes_unsure', currentUnsure - 1);
          } else {
            // If no unsure strikes, just add a watching strike
            handleInputChange('strikes_watching', 1);
          }
        }
      }
    } else if (editedPA.pa_why === 'GO' || editedPA.pa_why === 'FO' || editedPA.pa_why === 'LO' || editedPA.pa_why === 'FB') {
      // For all types of outs, set bases_reached to 0
      if (editedPA.bases_reached !== '0') {
        handleInputChange('bases_reached', '0');
      }
    } else if (editedPA.pa_why === 'HR' || editedPA.pa_why === 'GS') {
      // For home runs, set bases_reached to 4
      if (editedPA.bases_reached !== '4') {
        handleInputChange('bases_reached', '4');
      }
      
      // Also set br_result to 4 for home runs
      if (editedPA.br_result !== 4) {
        handleInputChange('br_result', 4);
      }
    } else if (editedPA.hbp_counted) {
      // If we change from HBP to something else, reset the flag
      handleInputChange('hbp_counted', false);
    }
  }, [editedPA?.pa_why]);
  
  // Add a new effect to handle Error selection
  useEffect(() => {
    // Only run this effect if editedPA is properly loaded
    if (!editedPA) return;
    
    // If pa_why is set to Error
    if (editedPA.pa_why === 'E') {
      // Make sure br_error_on is initialized as an array
      if (!editedPA.br_error_on || !Array.isArray(editedPA.br_error_on)) {
        // Initialize as empty array if not already set
        handleInputChange('br_error_on', []);
      }
      
      // Make sure pa_error_on is initialized as an array
      if (!editedPA.pa_error_on || !Array.isArray(editedPA.pa_error_on)) {
        // Initialize as empty array if not already set
        handleInputChange('pa_error_on', []);
      }
      
      // Set bases_reached to 1 if not already set (errors typically result in reaching first base)
      if (editedPA.bases_reached !== '1') {
        handleInputChange('bases_reached', '1');
      }
    } else {
      // If changing away from Error, clear the br_error_on field
      if (editedPA.br_error_on && editedPA.br_error_on.length > 0) {
        handleInputChange('br_error_on', []);
      }
      
      // If changing away from Error, clear the pa_error_on field
      if (editedPA.pa_error_on && (Array.isArray(editedPA.pa_error_on) ? editedPA.pa_error_on.length > 0 : editedPA.pa_error_on)) {
        handleInputChange('pa_error_on', []);
      }
    }
  }, [editedPA?.pa_why]);
  
  // Handle hit around toggle
  const handleHitAroundToggle = (base: number) => {
    try {
      // Safely get arrays
      const hitAround = safeArray(editedPA.hit_around_bases, 'hit_around_bases');
      const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
      
      // Check if this base is already selected in stolen bases
      if (safeIncludes(stolenBases, base)) {
        return; // Don't allow toggling if already stolen
      }
      
      // Toggle selection
      let newHitAround = [...hitAround];
      if (safeIncludes(hitAround, base)) {
        // If already selected, remove it
        newHitAround = newHitAround.filter(b => b !== base);
      } else {
        // If not selected, add it
        newHitAround.push(base);
      }
      
      handleInputChange('hit_around_bases', newHitAround);
      
      // Update Final Base if this is now the maximum base
      const maxBase = newHitAround.length > 0 ? Math.max(...newHitAround) : 0;
      const maxStolenBase = stolenBases.length > 0 ? Math.max(...stolenBases) : 0;
      const currentBrResult = editedPA.br_result !== undefined ? Number(editedPA.br_result) : basesReached;
      
      if (maxBase > currentBrResult && maxBase > maxStolenBase) {
        handleInputChange('br_result', maxBase);
      }
    } catch (error) {
      // Removed console.error
    }
  };
  
  // Use only pa_why, not why_base_reached
  const selectedWhyBaseReached = editedPA?.pa_why || '';
  
  // Ensure we have valid data before rendering
  if (!editedPA) {
    return <div className="border rounded p-3">Loading plate appearance data...</div>;
  }
  
  return (
    <div className="border rounded p-3">
      <h4 className="font-medium text-sm mb-2">Result</h4>
      
      {/* Plate Appearance Result Container */}
      <div className="mb-4">
        {/* Bases Reached as diamonds */}
        <div className="mb-3">
          <div className="flex items-center">
            <span className="text-sm font-bold text-gray-700 mr-3">Bases Reached</span>
            <div className="flex space-x-2">
              {[0, 1, 2, 3, 4].map(base => {
                // Determine if player was out (out_at has a value)
                const isPlayerOut = editedPA.out_at && editedPA.out_at > 0;
                
                return (
                  <div 
                    key={`base-${base}`}
                    onClick={() => {
                      // Update both pa_result and bases_reached
                      handleInputChange('pa_result', base);
                      handleInputChange('bases_reached', base.toString());
                    }}
                    className={`transform rotate-45 w-6 h-6 flex items-center justify-center cursor-pointer ${
                      (typeof editedPA.pa_result === 'number' && editedPA.pa_result === base) || 
                      (typeof editedPA.pa_result === 'string' && editedPA.pa_result === base.toString()) ||
                      editedPA.bases_reached === base.toString()
                        ? isPlayerOut 
                          ? 'bg-red-500 text-white' // Red if out
                          : 'bg-indigo-600 text-white' // Same indigo as Why buttons if not out
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    <span className="transform -rotate-45">{base}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Why as boxes with tooltips */}
        <div className="mb-4 mt-2">
          <h5 className="text-xs font-medium text-gray-600 mb-1 pt-1.5">Why Base Reached</h5>
          
          {/* Hit options (top row) with purple outline */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {hitOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  // Toggle selection - if already selected, clear it
                  if (selectedWhyBaseReached === option.value) {
                    // Clear both pa_why and why_base_reached
                    handleInputChange('pa_why', '');
                    handleInputChange('why_base_reached', '');
                  } else {
                    // Update both pa_why and why_base_reached for consistency
                    handleInputChange('pa_why', option.value);
                    handleInputChange('why_base_reached', option.value);
                    
                    // For BB (walk), set balls_before_play to 3 (maximum allowed value)
                    if (option.value === 'BB') {
                      handleInputChange('balls_before_play', 3);
                    }
                    
                    // Set appropriate bases_reached based on the option
                    if (option.value === 'HR' || option.value === 'GS') {
                      // Home run or grand slam - set to 4
                      handleInputChange('bases_reached', '4');
                      handleInputChange('pa_result', 4);
                    } else if (option.value === 'H' || option.value === 'B' || option.value === 'BB' || option.value === 'HBP') {
                      // Hit, bunt, walk, or hit by pitch - set to 1
                      handleInputChange('bases_reached', '1');
                      handleInputChange('pa_result', 1);
                    }
                  }
                }}
                className={`py-0.75 px-1.5 text-[0.66rem] font-normal rounded ${
                  selectedWhyBaseReached === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-purple-300'
                }`}
                title={option.label}
              >
                {option.value}
              </button>
            ))}
          </div>
          
          {/* Other options (middle row) */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {otherOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  // Toggle selection - if already selected, clear it
                  if (selectedWhyBaseReached === option.value) {
                    // Clear both pa_why and why_base_reached
                    handleInputChange('pa_why', '');
                    handleInputChange('why_base_reached', '');
                  } else {
                    // Update both pa_why and why_base_reached for consistency
                    handleInputChange('pa_why', option.value);
                    handleInputChange('why_base_reached', option.value);
                    
                    // Set appropriate bases_reached based on the option
                    if (option.value === 'E' || option.value === 'C') {
                      // Error or fielder's choice - set to 1
                      handleInputChange('bases_reached', '1');
                      handleInputChange('pa_result', 1);
                    }
                  }
                }}
                className={`py-0.75 px-1.5 text-[0.66rem] font-normal rounded ${
                  selectedWhyBaseReached === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
                title={option.label}
              >
                {option.value}
              </button>
            ))}
          </div>
          
          {/* Out options (bottom row) with red outline */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {outOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  // Toggle selection - if already selected, clear it
                  if (selectedWhyBaseReached === option.value) {
                    // Clear both pa_why and why_base_reached
                    handleInputChange('pa_why', '');
                    handleInputChange('why_base_reached', '');
                  } else {
                    // Update both pa_why and why_base_reached for consistency
                    handleInputChange('pa_why', option.value);
                    handleInputChange('why_base_reached', option.value);
                    
                    // Out options always set bases_reached to 0
                    handleInputChange('bases_reached', '0');
                    handleInputChange('pa_result', 0);
                    
                    // For strikeouts (K and KK)
                    if (option.value === 'K' || option.value === 'KK') {
                      // Set strikes_before_play to 2
                      handleInputChange('strikes_before_play', 2);
                      
                      // If there were no strikes registered, add them to strikes_unsure
                      const totalStrikes = (editedPA.strikes_watching || 0) + 
                                          (editedPA.strikes_swinging || 0) + 
                                          (editedPA.strikes_unsure || 0);
                                          
                      if (totalStrikes < 2) {
                        // Calculate how many strikes are missing
                        const missingStrikes = 2 - totalStrikes;
                        // Add the missing strikes to strikes_unsure
                        handleInputChange('strikes_unsure', (editedPA.strikes_unsure || 0) + missingStrikes);
                      }
                      
                      // For KK (looking), ensure at least one strike is watching
                      if (option.value === 'KK') {
                        // Set at least one watching strike, preserving any existing value
                        const currentWatching = editedPA.strikes_watching || 0;
                        if (currentWatching === 0) {
                          // Adjust strikes distribution: convert one unsure strike to watching
                          const currentUnsure = editedPA.strikes_unsure || 0;
                          if (currentUnsure > 0) {
                            handleInputChange('strikes_watching', 1);
                            handleInputChange('strikes_unsure', currentUnsure - 1);
                          } else {
                            // If no unsure strikes, just add a watching strike
                            handleInputChange('strikes_watching', 1);
                          }
                        }
                      }
                    }
                  }
                }}
                className={`py-0.75 px-1.5 text-[0.66rem] font-normal rounded ${
                  selectedWhyBaseReached === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-red-300'
                }`}
                title={option.label}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
        
        {/* Second row: Hit To and Error On */}
        <div className="mb-3">
          {/* Container for all position-based selections */}
          <div className="mt-3 grid grid-cols-1 gap-3">
            {/* Only show Hit To if not a strikeout, walk, or hit by pitch */}
            {selectedWhyBaseReached !== 'K' && 
             selectedWhyBaseReached !== 'KK' && 
             selectedWhyBaseReached !== 'BB' && 
             selectedWhyBaseReached !== 'HBP' && (
              <div className="flex items-start">
                <span className="text-xs text-gray-600 mr-2 pt-1 w-12">Hit To:</span>
                <div className="flex flex-col gap-1">
                  {/* Outfield row (7-9) */}
                  <div className="flex gap-1 pl-9">
                    {[7, 8, 9].map(pos => (
                      <div 
                        key={`hit-to-${pos}`}
                        onClick={() => {
                          // Toggle selection - if already selected, clear it
                          if (editedPA.detailed_result === pos.toString()) {
                            handleInputChange('detailed_result', '');
                            handleInputChange('hit_to', '');
                          } else {
                            handleInputChange('detailed_result', pos.toString());
                            // Also update hit_to as a string
                            handleInputChange('hit_to', pos.toString());
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          editedPA.detailed_result === pos.toString() 
                            ? 'bg-white text-indigo-600 border border-indigo-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`Ball hit to ${pos} - ${
                          pos === 1 ? 'Pitcher - P' : 
                          pos === 2 ? 'Catcher - C' : 
                          pos === 3 ? 'First Base - 1B' : 
                          pos === 4 ? 'Second Base - 2B' : 
                          pos === 5 ? 'Third Base - 3B' : 
                          pos === 6 ? 'Shortstop - SS' :
                          pos === 7 ? 'Left Field - LF' : 
                          pos === 8 ? 'Center Field - CF' : 
                          'Right Field - RF'
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                  
                  {/* Infield row (1-6) */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(pos => (
                      <div 
                        key={`hit-to-${pos}`}
                        onClick={() => {
                          // Toggle selection - if already selected, clear it
                          if (editedPA.detailed_result === pos.toString()) {
                            handleInputChange('detailed_result', '');
                            handleInputChange('hit_to', '');
                          } else {
                            handleInputChange('detailed_result', pos.toString());
                            // Also update hit_to as a string
                            handleInputChange('hit_to', pos.toString());
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          editedPA.detailed_result === pos.toString() 
                            ? 'bg-white text-indigo-600 border border-indigo-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`Ball hit to ${pos} - ${
                          pos === 1 ? 'Pitcher - P' : 
                          pos === 2 ? 'Catcher - C' : 
                          pos === 3 ? 'First Base - 1B' : 
                          pos === 4 ? 'Second Base - 2B' : 
                          pos === 5 ? 'Third Base - 3B' : 
                          pos === 6 ? 'Shortstop - SS' :
                          pos === 7 ? 'Left Field - LF' : 
                          pos === 8 ? 'Center Field - CF' : 
                          'Right Field - RF'
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Error On - Only show if Error is selected */}
            {selectedWhyBaseReached === 'E' && (
              <div className="flex items-start">
                <span className="text-xs text-gray-600 mr-2 pt-1">PA Error:</span>
                <div className="flex flex-col gap-1">
                  {/* Outfield row (7-9) */}
                  <div className="flex gap-1 pl-9">
                    {[7, 8, 9].map(pos => (
                      <div 
                        key={`error-on-${pos}`}
                        onClick={() => {
                          try {
                            // Safely get arrays
                            const paErrorOn = safeArray(editedPA.pa_error_on, 'pa_error_on');
                            const isSelected = safeIncludes(paErrorOn, pos);
                            
                            // Toggle selection
                            let newPaErrorOn = [...paErrorOn];
                            if (isSelected) {
                              // If already selected, remove it
                              newPaErrorOn = newPaErrorOn.filter(p => p !== pos);
                            } else {
                              // If not selected, add it
                              newPaErrorOn.push(pos);
                            }
                            // Update pa_error_on field
                            handleInputChange('pa_error_on', newPaErrorOn);
                          } catch (error) {
                            // Removed console.error
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          isErrorOnPosition(editedPA.pa_error_on, pos)
                            ? 'bg-white text-red-500 border border-red-500' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`Error by ${pos} - ${
                          pos === 1 ? 'Pitcher - P' : 
                          pos === 2 ? 'Catcher - C' : 
                          pos === 3 ? 'First Base - 1B' : 
                          pos === 4 ? 'Second Base - 2B' : 
                          pos === 5 ? 'Third Base - 3B' : 
                          pos === 6 ? 'Shortstop - SS' :
                          pos === 7 ? 'Left Field - LF' : 
                          pos === 8 ? 'Center Field - CF' : 
                          'Right Field - RF'
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                  
                  {/* Infield row (1-6) */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(pos => (
                      <div 
                        key={`error-on-${pos}`}
                        onClick={() => {
                          try {
                            // Safely get arrays
                            const paErrorOn = safeArray(editedPA.pa_error_on, 'pa_error_on');
                            const isSelected = safeIncludes(paErrorOn, pos);
                            
                            // Toggle selection
                            let newPaErrorOn = [...paErrorOn];
                            if (isSelected) {
                              // If already selected, remove it
                              newPaErrorOn = newPaErrorOn.filter(p => p !== pos);
                            } else {
                              // If not selected, add it
                              newPaErrorOn.push(pos);
                            }
                            // Update pa_error_on field
                            handleInputChange('pa_error_on', newPaErrorOn);
                          } catch (error) {
                            // Removed console.error
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          isErrorOnPosition(editedPA.pa_error_on, pos)
                            ? 'bg-white text-red-500 border border-red-500' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`Error by ${pos} - ${
                          pos === 1 ? 'Pitcher - P' : 
                          pos === 2 ? 'Catcher - C' : 
                          pos === 3 ? 'First Base - 1B' : 
                          pos === 4 ? 'Second Base - 2B' : 
                          pos === 5 ? 'Third Base - 3B' : 
                          pos === 6 ? 'Shortstop - SS' :
                          pos === 7 ? 'Left Field - LF' : 
                          pos === 8 ? 'Center Field - CF' : 
                          'Right Field - RF'
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Base Running Section */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-600 mb-1 pt-2">Base Running</h5>
              
              <div className="grid grid-cols-1 gap-2">
                {/* Stolen Bases */}
                <div className="flex items-start">
                  <span className="text-xs text-gray-600 mr-2 pt-1 w-12">Stole:</span>
                  <div className="flex space-x-1">
                    {[2, 3, 4].map(base => {
                      try {
                        // Safely get arrays
                        const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
                        const isSelected = safeIncludes(stolenBases, base);
                        
                        return (
                          <div 
                            key={`stolen-base-${base}`}
                            onClick={() => {
                              try {
                                // Safely get arrays
                                const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
                                const isSelected = safeIncludes(stolenBases, base);
                                
                                // Toggle selection
                                let newStolenBases = [...stolenBases];
                                if (isSelected) {
                                  // If already selected, remove it
                                  newStolenBases = newStolenBases.filter(b => b !== base);
                                } else {
                                  // If not selected, add it
                                  newStolenBases.push(base);
                                }
                                handleInputChange('stolen_bases', newStolenBases);
                              } catch (error) {
                                // Removed console.error
                              }
                            }}
                            className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                              isSelected
                                ? 'bg-white text-indigo-600 border border-indigo-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={`Stole ${base === 2 ? 'Second' : base === 3 ? 'Third' : 'Home'}`}
                          >
                            {base}
                          </div>
                        );
                      } catch (error) {
                        // Removed console.error
                        return null;
                      }
                    })}
                  </div>
                </div>
                
                {/* Hit Around */}
                <div className="flex items-start">
                  <span className="text-xs text-gray-600 mr-2 pt-1 w-12">Hit:</span>
                  <div className="flex space-x-1">
                    {[2, 3, 4].map(base => {
                      try {
                        // Safely get arrays
                        const hitAround = safeArray(editedPA.hit_around_bases, 'hit_around_bases');
                        const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
                        const isSelected = safeIncludes(hitAround, base);
                        const isStolen = safeIncludes(stolenBases, base);
                        
                        return (
                          <div 
                            key={`hit-around-${base}`}
                            onClick={() => {
                              if (!isStolen) {
                                handleHitAroundToggle(base);
                              }
                            }}
                            className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                              isSelected
                                ? 'bg-white text-indigo-600 border border-indigo-600'
                                : isStolen
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={`Hit Around to ${base === 2 ? 'Second' : base === 3 ? 'Third' : 'Home'}`}
                          >
                            {base}
                          </div>
                        );
                      } catch (error) {
                        // Removed console.error
                        return null;
                      }
                    })}
                  </div>
                </div>
                
                {/* Base Running Errors */}
                <div className="flex items-start">
                  <span className="text-xs text-gray-600 mr-2 pt-1 w-12">BR Error:</span>
                  <div className="flex flex-col gap-1">
                    {/* Outfield row (7-9) */}
                    <div className="flex gap-1 pl-9">
                      {[7, 8, 9].map(pos => (
                        <div 
                          key={`br-error-on-${pos}`}
                          onClick={() => {
                            try {
                              // Safely get arrays
                              const brErrorOn = safeArray(editedPA.br_error_on, 'br_error_on');
                              const isSelected = safeIncludes(brErrorOn, pos);
                              
                              // Toggle selection
                              let newBrErrorOn = [...brErrorOn];
                              if (isSelected) {
                                // If already selected, remove it
                                newBrErrorOn = newBrErrorOn.filter(p => p !== pos);
                              } else {
                                // If not selected, add it
                                newBrErrorOn.push(pos);
                              }
                              // Update ONLY br_error_on, not pa_error_on
                              handleInputChange('br_error_on', newBrErrorOn);
                            } catch (error) {
                              // Removed console.error
                            }
                          }}
                          className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                            isErrorOnPosition(editedPA.br_error_on, pos)
                              ? 'bg-white text-red-500 border border-red-500'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Base Running Error by ${pos} - ${
                            pos === 1 ? 'Pitcher - P' : 
                            pos === 2 ? 'Catcher - C' : 
                            pos === 3 ? 'First Base - 1B' : 
                            pos === 4 ? 'Second Base - 2B' : 
                            pos === 5 ? 'Third Base - 3B' : 
                            pos === 6 ? 'Shortstop - SS' :
                            pos === 7 ? 'Left Field - LF' : 
                            pos === 8 ? 'Center Field - CF' : 
                            'Right Field - RF'
                          }`}
                        >
                          {pos}
                        </div>
                      ))}
                    </div>
                    
                    {/* Infield row (1-6) */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6].map(pos => (
                        <div 
                          key={`br-error-on-${pos}`}
                          onClick={() => {
                            try {
                              // Safely get arrays
                              const brErrorOn = safeArray(editedPA.br_error_on, 'br_error_on');
                              const isSelected = safeIncludes(brErrorOn, pos);
                              
                              // Toggle selection
                              let newBrErrorOn = [...brErrorOn];
                              if (isSelected) {
                                // If already selected, remove it
                                newBrErrorOn = newBrErrorOn.filter(p => p !== pos);
                              } else {
                                // If not selected, add it
                                newBrErrorOn.push(pos);
                              }
                              // Update ONLY br_error_on, not pa_error_on
                              handleInputChange('br_error_on', newBrErrorOn);
                            } catch (error) {
                              // Removed console.error
                            }
                          }}
                          className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                            isErrorOnPosition(editedPA.br_error_on, pos)
                              ? 'bg-white text-red-500 border border-red-500'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Base Running Error by ${pos} - ${
                            pos === 1 ? 'Pitcher - P' : 
                            pos === 2 ? 'Catcher - C' : 
                            pos === 3 ? 'First Base - 1B' : 
                            pos === 4 ? 'Second Base - 2B' : 
                            pos === 5 ? 'Third Base - 3B' : 
                            pos === 6 ? 'Shortstop - SS' :
                            pos === 7 ? 'Left Field - LF' : 
                            pos === 8 ? 'Center Field - CF' : 
                            'Right Field - RF'
                          }`}
                        >
                          {pos}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Out At row - Always show */}
        <div className="mb-3">
          <div className="flex items-center">
            <span className="text-sm font-bold text-gray-700 mr-3">Out At</span>
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map(base => (
                <div 
                  key={`out-at-${base}`}
                  onClick={() => {
                    // Toggle out_at
                    if (editedPA.out_at === base) {
                      // If clicking the same base again, clear the out_at
                      handleInputChange('out_at', 0);
                      // Don't automatically change br_result when clearing
                    } else {
                      // Set out_at to the clicked base
                      handleInputChange('out_at', base);
                      // Also set br_result to the same base when marking a player out
                      handleInputChange('br_result', base);
                    }
                  }}
                  className={`transform rotate-45 w-6 h-6 flex items-center justify-center cursor-pointer ${
                    editedPA.out_at === base
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <span className="transform -rotate-45">{base}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Final Base row - Always show */}
        <div className="mb-3">
          <div className="flex items-center">
            <span className="text-sm font-bold text-gray-700 mr-3">Final Base</span>
            <div className="flex space-x-2">
              {[0, 1, 2, 3, 4].map(base => {
                // Determine if player was out (out_at has a value)
                const isPlayerOut = editedPA.out_at && editedPA.out_at > 0;
                
                return (
                  <div 
                    key={`final-base-${base}`}
                    onClick={() => handleInputChange('br_result', base)}
                    className={`transform rotate-45 w-6 h-6 flex items-center justify-center cursor-pointer ${
                      editedPA.br_result === base
                        ? isPlayerOut 
                          ? 'bg-red-500 text-white' // Red if out
                          : 'bg-indigo-600 text-white' // Same indigo as Why buttons if not out
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    <span className="transform -rotate-45">{base}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSection; 