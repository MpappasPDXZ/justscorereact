import { ScoreBookEntry } from '@/app/types/scoreTypes';
import PositionSelectOptions from '@/app/components/PositionSelectOptions';
import { useState, useEffect } from 'react';

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
  // Determine which "Why Base Reached" options to show based on bases_reached
  const showOutOptions = editedPA.bases_reached === '0';
  const showReachedBaseOptions = editedPA.bases_reached !== '0' && editedPA.bases_reached !== '';
  
  // Get the current bases reached as a number
  const basesReached = parseInt(editedPA.bases_reached || '0');
  
  // Safe array access helper function
  const safeArray = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing array:', e);
    }
    return [];
  };
  
  // Safe includes check
  const safeIncludes = (arr: any, value: any): boolean => {
    const safeArr = safeArray(arr);
    return safeArr.some(item => item === value);
  };
  
  // Effect to ensure "out" is set correctly based on br_result and out_at
  useEffect(() => {
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
  }, [editedPA.br_result, editedPA.out_at, editedPA.out]);
  
  // Add a useEffect to update Final Base based on stolen or hit bases
  useEffect(() => {
    try {
      // Get the current stolen and hit around bases
      const stolenBases = safeArray(editedPA.stolen_bases);
      const hitAround = safeArray(editedPA.hit_around_bases);
      
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
      console.error('Error in update Final Base effect:', error);
    }
  }, [editedPA.stolen_bases, editedPA.hit_around_bases]);
  
  // Effect to handle BB and HBP selections
  useEffect(() => {
    if (editedPA.why_base_reached === 'BB' || editedPA.why_base_reached === 'HBP') {
      // Set bases_reached to 1 if not already
      if (editedPA.bases_reached !== '1') {
        handleInputChange('bases_reached', '1');
      }
      
      // Clear the detailed_result field if it's set
      if (editedPA.detailed_result) {
        handleInputChange('detailed_result', '');
      }
    }
  }, [editedPA.why_base_reached]);
  
  // Handle hit around toggle
  const handleHitAroundToggle = (base: number) => {
    try {
      const hitAround = safeArray(editedPA.hit_around_bases);
      const stolenBases = safeArray(editedPA.stolen_bases);
      
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
      
      // Also update the legacy field for backward compatibility
      handleInputChange('hit_around', newHitAround.length);
      
      // Update Final Base if this is now the maximum base
      const maxBase = newHitAround.length > 0 ? Math.max(...newHitAround) : 0;
      const maxStolenBase = stolenBases.length > 0 ? Math.max(...stolenBases) : 0;
      const currentBrResult = editedPA.br_result !== undefined ? editedPA.br_result : basesReached;
      
      if (maxBase > currentBrResult && maxBase > maxStolenBase) {
        handleInputChange('br_result', maxBase);
      }
    } catch (error) {
      console.error('Error in handleHitAroundToggle:', error);
    }
  };
  
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
              {[0, 1, 2, 3, 4].map(base => (
                <div 
                  key={`base-${base}`}
                  onClick={() => handleInputChange('bases_reached', base.toString())}
                  className={`transform rotate-45 w-6 h-6 flex items-center justify-center cursor-pointer ${
                    editedPA.bases_reached === base.toString()
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <span className="transform -rotate-45">{base}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Why as boxes with tooltips */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Why</label>
          
          {/* Show these options only when batter is out */}
          {showOutOptions && (
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'K', label: 'K - Strikeout Swinging' },
                { value: 'KK', label: 'KK - Strikeout Looking' },
                { value: 'GO', label: 'GO - Ground Out' },
                { value: 'FO', label: 'FO - Fly Out' },
                { value: 'LO', label: 'LO - Line Out' },
                { value: 'FB', label: 'FB - Foul Ball Caught' },
                { value: 'SH', label: 'SH - Sacrifice Hit' }
              ].map(option => (
                <div 
                  key={option.value}
                  onClick={() => {
                    // First update the why_base_reached field
                    handleInputChange('why_base_reached', option.value);
                    
                    // No need to update bases_reached for out options
                  }}
                  className={`w-8 px-1.5 py-0.5 text-xs border rounded cursor-pointer relative group text-center ${
                    editedPA.why_base_reached === option.value
                      ? 'bg-purple-100 border-purple-500 text-purple-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  title={option.label}
                >
                  {option.value}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    {option.label}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Show these options only when batter reached base */}
          {showReachedBaseOptions && (
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'H', label: 'H - Hit' },
                { value: 'HH', label: 'HH - Hard Hit' },
                { value: 'BB', label: 'BB - Walk' },
                { value: 'HBP', label: 'HBP - Hit By Pitch' },
                { value: 'E', label: 'E - Error' },
                { value: 'S', label: 'S - Slap' },
                { value: 'FC', label: 'FC - Fielder\'s Choice' },
                { value: 'B', label: 'B - Bunt' }
              ].map(option => (
                <div 
                  key={option.value}
                  onClick={() => {
                    // First update the why_base_reached field
                    handleInputChange('why_base_reached', option.value);
                    
                    // Then update bases_reached based on the selected value
                    if (['H', 'HH', 'E', 'BB', 'HBP'].includes(option.value)) {
                      handleInputChange('bases_reached', '1');
                    } else if (option.value === '2B') {
                      handleInputChange('bases_reached', '2');
                    } else if (option.value === '3B') {
                      handleInputChange('bases_reached', '3');
                    } else if (option.value === 'HR') {
                      handleInputChange('bases_reached', '4');
                    }
                  }}
                  className={`w-8 px-1.5 py-0.5 text-xs border rounded cursor-pointer relative group text-center ${
                    editedPA.why_base_reached === option.value
                      ? 'bg-purple-100 border-purple-500 text-purple-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  title={option.label}
                >
                  {option.value}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    {option.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Second row: Hit To and Error On */}
        <div className="mb-3">
          {/* Only show Hit To if not a strikeout, walk, or hit by pitch */}
          {editedPA.why_base_reached !== 'K' && 
           editedPA.why_base_reached !== 'KK' && 
           editedPA.why_base_reached !== 'BB' && 
           editedPA.why_base_reached !== 'HBP' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hit To</label>
              <div className="flex flex-col gap-1">
                {/* Outfield row (7-9) */}
                <div className="flex gap-1 justify-center">
                  {[
                    { pos: 7, name: 'Left Field' },
                    { pos: 8, name: 'Center Field' },
                    { pos: 9, name: 'Right Field' }
                  ].map(({ pos, name }) => (
                    <div 
                      key={`hit-to-${pos}`}
                      onClick={() => handleInputChange('detailed_result', pos.toString())}
                      className={`w-8 h-8 flex items-center justify-center cursor-pointer text-xs relative group ${
                        editedPA.detailed_result === pos.toString() 
                          ? 'bg-white text-purple-500 border border-purple-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={`${pos} - ${name}`}
                    >
                      {pos}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {pos} - {name}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Infield row (1-6) */}
                <div className="flex gap-1 justify-center">
                  {[
                    { pos: 1, name: 'Pitcher' },
                    { pos: 2, name: 'Catcher' },
                    { pos: 3, name: 'First Base' },
                    { pos: 4, name: 'Second Base' },
                    { pos: 5, name: 'Third Base' },
                    { pos: 6, name: 'Shortstop' }
                  ].map(({ pos, name }) => (
                    <div 
                      key={`hit-to-${pos}`}
                      onClick={() => handleInputChange('detailed_result', pos.toString())}
                      className={`w-8 h-8 flex items-center justify-center cursor-pointer text-xs relative group ${
                        editedPA.detailed_result === pos.toString() 
                          ? 'bg-white text-purple-500 border border-purple-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={`${pos} - ${name}`}
                    >
                      {pos}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {pos} - {name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Error On - Only show if Error is selected */}
          {editedPA.why_base_reached === 'E' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Error On</label>
              <div className="flex flex-col gap-1">
                {/* Outfield row (7-9) */}
                <div className="flex gap-1 justify-center">
                  {[
                    { pos: 7, name: 'Left Field' },
                    { pos: 8, name: 'Center Field' },
                    { pos: 9, name: 'Right Field' }
                  ].map(({ pos, name }) => (
                    <div 
                      key={`error-on-${pos}`}
                      onClick={() => handleInputChange('br_error_on', pos.toString())}
                      className={`w-8 h-8 flex items-center justify-center cursor-pointer text-xs relative group ${
                        Array.isArray(editedPA.br_error_on) && editedPA.br_error_on.includes(pos.toString())
                          ? 'bg-white text-red-500 border border-red-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={`${pos} - ${name}`}
                    >
                      {pos}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {pos} - {name}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Infield row (1-6) */}
                <div className="flex gap-1 justify-center">
                  {[
                    { pos: 1, name: 'Pitcher' },
                    { pos: 2, name: 'Catcher' },
                    { pos: 3, name: 'First Base' },
                    { pos: 4, name: 'Second Base' },
                    { pos: 5, name: 'Third Base' },
                    { pos: 6, name: 'Shortstop' }
                  ].map(({ pos, name }) => (
                    <div 
                      key={`error-on-${pos}`}
                      onClick={() => handleInputChange('br_error_on', pos.toString())}
                      className={`w-8 h-8 flex items-center justify-center cursor-pointer text-xs relative group ${
                        Array.isArray(editedPA.br_error_on) && editedPA.br_error_on.includes(pos.toString())
                          ? 'bg-white text-red-500 border border-red-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={`${pos} - ${name}`}
                    >
                      {pos}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {pos} - {name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Advanced Bases Section */}
          <div className="mt-3">
            <div className="flex flex-col gap-2">
              {/* Stolen Bases */}
              <div className="flex items-center">
                <span className="text-xs text-gray-600 mr-2">Stole:</span>
                <div className="flex space-x-1">
                  {[2, 3, 4].map(base => {
                    try {
                      // Safely get arrays
                      const stolenBases = safeArray(editedPA.stolen_bases);
                      const isSelected = safeIncludes(stolenBases, base);
                      
                      return (
                        <div 
                          key={`stolen-base-${base}`}
                          onClick={() => {
                            try {
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
                              console.error('Error toggling stolen base:', error);
                            }
                          }}
                          className={`w-6 h-6 flex items-center justify-center cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Stole ${base === 2 ? 'Second' : base === 3 ? 'Third' : 'Home'}`}
                        >
                          {base}
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering stolen base option:', error);
                      return null;
                    }
                  })}
                </div>
              </div>
              
              {/* Hit Around */}
              <div className="flex items-center">
                <span className="text-xs text-gray-600 mr-2">Hit:</span>
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
                              ? 'bg-blue-500 text-white'
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
                      console.error('Error rendering hit around option:', error);
                      return null;
                    }
                  })}
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
                      handleInputChange('out_at', 0);
                    } else {
                      handleInputChange('out_at', base);
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
              {[0, 1, 2, 3, 4].map(base => (
                <div 
                  key={`final-base-${base}`}
                  onClick={() => handleInputChange('br_result', base)}
                  className={`transform rotate-45 w-6 h-6 flex items-center justify-center cursor-pointer ${
                    editedPA.br_result === base
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <span className="transform -rotate-45">{base}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSection; 