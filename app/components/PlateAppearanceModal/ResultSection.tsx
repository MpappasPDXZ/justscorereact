import { ScoreBookEntry } from '@/app/types/scoreTypes';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import { useState, useEffect } from 'react';

// Define array fields that should always be handled as lists of strings
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
    { value: 'H', label: 'Hit', type: 'hit' },
    { value: 'B', label: 'Bunt', type: 'hit' },
    { value: 'BB', label: 'Walk', type: 'hit' },
    { value: 'HBP', label: 'Hit By Pitch', type: 'hit' },
    { value: 'HR', label: 'Home Run', type: 'hit' },
    { value: 'GS', label: 'Grand Slam', type: 'hit' },
    //
    { value: 'E', label: 'Error', type: 'other' },
    { value: 'C', label: 'Fielder\'s Choice', type: 'other' },
    //
    { value: 'K', label: 'Strikeout', type: 'out' },
    { value: 'KK', label: 'Strikeout Looking', type: 'out' },
    { value: 'GO', label: 'Ground Out', type: 'out' },
    { value: 'FO', label: 'Fly Out', type: 'out' },
    { value: 'LO', label: 'Line Out', type: 'out' },
    { value: 'FB', label: 'Foul Ball Out', type: 'out' }

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
  
  // Safe array access helper function - improved to handle more edge cases
  const safeArray = (value: any, fieldName?: string): any[] => {
    if (!value) return [];
    
    // If it's already an array, ensure values are strings if it's one of our special array fields
    if (Array.isArray(value)) {
      if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
        return value.map(item => item.toString());
      }
      return value;
    }
    
    // Handle string representations of arrays
    if (typeof value === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
            return parsed.map(item => item.toString());
          }
          return parsed;
        }
        
        // Handle string format like "['2', '3', '4']"
        if (value.includes('[') && value.includes(']')) {
          // Remove the outer quotes and brackets, then split by comma
          const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
          if (cleanedStr.trim() === '') return [];
          const items = cleanedStr.split(',').map(item => item.trim());
          if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
            return items;
          }
          return items.map(item => {
            const num = Number(item);
            return isNaN(num) ? item : num;
          });
        }
        
        // If it's not valid JSON, check if it's a comma-separated string
        if (value.includes(',')) {
          const items = value.split(',').map(item => item.trim());
          if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
            return items;
          }
          return items.map(item => {
            const num = Number(item);
            return isNaN(num) ? item : num;
          });
        }
        // If it's a single value, return as a one-item array
        if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
          return [value.trim()];
        }
        const num = Number(value.trim());
        return [isNaN(num) ? value.trim() : num];
      } catch (e) {
        // If parsing fails, check if it's a string representation of an array
        if (value.includes('[') && value.includes(']')) {
          // Remove the outer quotes and brackets, then split by comma
          const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
          if (cleanedStr.trim() === '') return [];
          const items = cleanedStr.split(',').map(item => item.trim());
          if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
            return items;
          }
          return items.map(item => {
            const num = Number(item);
            return isNaN(num) ? item : num;
          });
        }
        
        // If it's a comma-separated string
        if (value.includes(',')) {
          const items = value.split(',').map(item => item.trim());
          if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
            return items;
          }
          return items.map(item => {
            const num = Number(item);
            return isNaN(num) ? item : num;
          });
        }
        // For a single value
        if (fieldName && ARRAY_FIELDS.includes(fieldName)) {
          return [value.trim()];
        }
        const num = Number(value.trim());
        return [isNaN(num) ? value.trim() : num];
      }
    }
    
    // For any other type, return empty array
    return [];
  };
  
  // Safe includes check
  const safeIncludes = (arr: any, value: any): boolean => {
    const safeArr = Array.isArray(arr) ? arr : [];
    return safeArr.some(item => item.toString() === value.toString());
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
  
  // Add a useEffect to update Final Base based on stolen or hit bases
  useEffect(() => {
    // Only run this effect if editedPA is properly loaded
    if (!editedPA) return;
    
    try {
      // Get the current stolen and hit around bases
      const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
      const hitAround = safeArray(editedPA.hit_around_bases, 'hit_around_bases');
      
      // Get the maximum base from each array
      const maxStolenBase = stolenBases.length > 0 ? Math.max(...stolenBases.map(b => parseInt(b))) : 0;
      const maxHitBase = hitAround.length > 0 ? Math.max(...hitAround.map(b => parseInt(b))) : 0;
      
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
    
    if (editedPA.pa_why === 'BB' || editedPA.pa_why === 'HBP') {
      // Set bases_reached to 1 if not already
      if (editedPA.bases_reached !== '1') {
        handleInputChange('bases_reached', '1');
      }
      
      // Clear the detailed_result field if it's set
      if (editedPA.detailed_result) {
        handleInputChange('detailed_result', '');
      }
      
      // For BB (walk), set balls_before_play to 4 if not already set
      if (editedPA.pa_why === 'BB' && (editedPA.balls_before_play === undefined || editedPA.balls_before_play < 4)) {
        handleInputChange('balls_before_play', 4);
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
      // For strikeouts, set strikes_before_play to 3 if not already set
      if (editedPA.strikes_before_play === undefined || editedPA.strikes_before_play < 3) {
        handleInputChange('strikes_before_play', 3);
      }
      
      // Set bases_reached to 0 for strikeouts
      if (editedPA.bases_reached !== '0') {
        handleInputChange('bases_reached', '0');
      }
      
      // For KK (looking), ensure at least one strike is watching
      if (editedPA.pa_why === 'KK' && (editedPA.strikes_watching === undefined || editedPA.strikes_watching < 1)) {
        handleInputChange('strikes_watching', Math.max(1, editedPA.strikes_watching || 0));
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
      const hitAround = safeArray(editedPA.hit_around_bases, 'hit_around_bases');
      const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
      
      // Check if this base is already selected in stolen bases
      if (safeIncludes(stolenBases, base.toString())) {
        return; // Don't allow toggling if already stolen
      }
      
      // Toggle selection
      let newHitAround = [...hitAround];
      if (safeIncludes(hitAround, base.toString())) {
        // If already selected, remove it
        newHitAround = newHitAround.filter(b => b !== base.toString());
      } else {
        // If not selected, add it
        newHitAround.push(base.toString());
      }
      
      handleInputChange('hit_around_bases', newHitAround);
      
      // Update Final Base if this is now the maximum base
      const maxBase = newHitAround.length > 0 ? Math.max(...newHitAround.map(b => parseInt(b))) : 0;
      const maxStolenBase = stolenBases.length > 0 ? Math.max(...stolenBases.map(b => parseInt(b))) : 0;
      const currentBrResult = editedPA.br_result !== undefined ? editedPA.br_result : basesReached;
      
      if (maxBase > currentBrResult && maxBase > maxStolenBase) {
        handleInputChange('br_result', maxBase);
      }
    } catch (error) {
      // Removed console.error
    }
  };
  
  // Use only pa_why, not why_base_reached
  const selectedWhyBaseReached = editedPA?.pa_why || '';
  
  // Add a helper function to check if a position is in the br_error_on field
  const isErrorOnPosition = (errorOn: any, position: string): boolean => {
    if (!errorOn) return false;
    
    // Handle string type (comma-separated values)
    if (typeof errorOn === 'string') {
      return errorOn.split(',').map(p => p.trim()).includes(position);
    }
    
    // Handle array type
    if (Array.isArray(errorOn)) {
      return errorOn.some(p => p.toString() === position);
    }
    
    return false;
  };
  
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
                      handleInputChange('pa_result', base.toString());
                      handleInputChange('bases_reached', base.toString());
                    }}
                    className={`transform rotate-45 w-6 h-6 flex items-center justify-center cursor-pointer ${
                      editedPA.bases_reached === base.toString() || editedPA.pa_result === base.toString()
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
                  // Update both pa_why and why_base_reached for consistency
                  handleInputChange('pa_why', option.value);
                  handleInputChange('why_base_reached', option.value);
                  
                  // Set appropriate bases_reached based on the option
                  if (option.value === 'HR' || option.value === 'GS') {
                    // Home run or grand slam - set to 4
                    handleInputChange('bases_reached', '4');
                    handleInputChange('pa_result', '4');
                  } else if (option.value === 'H' || option.value === 'B' || option.value === 'BB' || option.value === 'HBP') {
                    // Hit, bunt, walk, or hit by pitch - set to 1
                    handleInputChange('bases_reached', '1');
                    handleInputChange('pa_result', '1');
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
                  // Update both pa_why and why_base_reached for consistency
                  handleInputChange('pa_why', option.value);
                  handleInputChange('why_base_reached', option.value);
                  
                  // Set appropriate bases_reached based on the option
                  if (option.value === 'E' || option.value === 'C') {
                    // Error or fielder's choice - set to 1
                    handleInputChange('bases_reached', '1');
                    handleInputChange('pa_result', '1');
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
          <div className="grid grid-cols-7 gap-1">
            {outOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  // Update both pa_why and why_base_reached for consistency
                  handleInputChange('pa_why', option.value);
                  handleInputChange('why_base_reached', option.value);
                  
                  // All out options set bases_reached to 0
                  handleInputChange('bases_reached', '0');
                  handleInputChange('pa_result', '0');
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
                          } else {
                            handleInputChange('detailed_result', pos.toString());
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          editedPA.detailed_result === pos.toString() 
                            ? 'bg-white text-indigo-600 border border-indigo-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`${pos} - ${pos === 7 ? 'Left Field' : pos === 8 ? 'Center Field' : 'Right Field'}`}
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
                          } else {
                            handleInputChange('detailed_result', pos.toString());
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          editedPA.detailed_result === pos.toString() 
                            ? 'bg-white text-indigo-600 border border-indigo-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`${pos} - ${
                          pos === 1 ? 'Pitcher' : 
                          pos === 2 ? 'Catcher' : 
                          pos === 3 ? 'First Base' : 
                          pos === 4 ? 'Second Base' : 
                          pos === 5 ? 'Third Base' : 'Shortstop'
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
                            const isSelected = safeIncludes(paErrorOn, pos.toString());
                            
                            // Toggle selection
                            let newPaErrorOn = [...paErrorOn];
                            if (isSelected) {
                              // If already selected, remove it
                              newPaErrorOn = newPaErrorOn.filter(p => p !== pos.toString());
                            } else {
                              // If not selected, add it
                              newPaErrorOn.push(pos.toString());
                            }
                            // Update pa_error_on field
                            handleInputChange('pa_error_on', newPaErrorOn);
                          } catch (error) {
                            // Removed console.error
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          isErrorOnPosition(editedPA.pa_error_on, pos.toString())
                            ? 'bg-white text-red-500 border border-red-500' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`${pos} - ${pos === 7 ? 'Left Field' : pos === 8 ? 'Center Field' : 'Right Field'}`}
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
                            const isSelected = safeIncludes(paErrorOn, pos.toString());
                            
                            // Toggle selection
                            let newPaErrorOn = [...paErrorOn];
                            if (isSelected) {
                              // If already selected, remove it
                              newPaErrorOn = newPaErrorOn.filter(p => p !== pos.toString());
                            } else {
                              // If not selected, add it
                              newPaErrorOn.push(pos.toString());
                            }
                            // Update pa_error_on field
                            handleInputChange('pa_error_on', newPaErrorOn);
                          } catch (error) {
                            // Removed console.error
                          }
                        }}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                          isErrorOnPosition(editedPA.pa_error_on, pos.toString())
                            ? 'bg-white text-red-500 border border-red-500' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={`${pos} - ${
                          pos === 1 ? 'Pitcher' : 
                          pos === 2 ? 'Catcher' : 
                          pos === 3 ? 'First Base' : 
                          pos === 4 ? 'Second Base' : 
                          pos === 5 ? 'Third Base' : 'Shortstop'
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
                        const isSelected = safeIncludes(stolenBases, base.toString());
                        
                        return (
                          <div 
                            key={`stolen-base-${base}`}
                            onClick={() => {
                              try {
                                // Safely get arrays
                                const stolenBases = safeArray(editedPA.stolen_bases, 'stolen_bases');
                                const isSelected = safeIncludes(stolenBases, base.toString());
                                
                                // Toggle selection
                                let newStolenBases = [...stolenBases];
                                if (isSelected) {
                                  // If already selected, remove it
                                  newStolenBases = newStolenBases.filter(b => b !== base.toString());
                                } else {
                                  // If not selected, add it
                                  newStolenBases.push(base.toString());
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
                        const hitAround = safeArray(editedPA.hit_around_bases);
                        const stolenBases = safeArray(editedPA.stolen_bases);
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
                              const isSelected = safeIncludes(brErrorOn, pos.toString());
                              
                              // Toggle selection
                              let newBrErrorOn = [...brErrorOn];
                              if (isSelected) {
                                // If already selected, remove it
                                newBrErrorOn = newBrErrorOn.filter(p => p !== pos.toString());
                              } else {
                                // If not selected, add it
                                newBrErrorOn = [...newBrErrorOn, pos.toString()];
                              }
                              // Update ONLY br_error_on, not pa_error_on
                              handleInputChange('br_error_on', newBrErrorOn);
                            } catch (error) {
                              // Removed console.error
                            }
                          }}
                          className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                            isErrorOnPosition(editedPA.br_error_on, pos.toString())
                              ? 'bg-white text-red-500 border border-red-500'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Base Running Error on Position ${pos}`}
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
                              const isSelected = safeIncludes(brErrorOn, pos.toString());
                              
                              // Toggle selection
                              let newBrErrorOn = [...brErrorOn];
                              if (isSelected) {
                                // If already selected, remove it
                                newBrErrorOn = newBrErrorOn.filter(p => p !== pos.toString());
                              } else {
                                // If not selected, add it
                                newBrErrorOn = [...newBrErrorOn, pos.toString()];
                              }
                              // Update ONLY br_error_on, not pa_error_on
                              handleInputChange('br_error_on', newBrErrorOn);
                            } catch (error) {
                              // Removed console.error
                            }
                          }}
                          className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                            isErrorOnPosition(editedPA.br_error_on, pos.toString())
                              ? 'bg-white text-red-500 border border-red-500'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Base Running Error on Position ${pos}`}
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