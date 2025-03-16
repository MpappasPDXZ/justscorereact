'use client';

import { useState, useEffect } from 'react';
import { ScoreBookEntry } from '@/app/types/scoreTypes';
import CountSection from './CountSection';
import ResultSection from './ResultSection';

interface PlateAppearanceModalProps {
  pa: ScoreBookEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedPA: ScoreBookEntry) => void;
  teamId?: string;
  gameId?: string;
  inningNumber?: number;
  homeOrAway?: string;
  nextBatterSeqId?: number; // The next sequence ID to use for a new PA
  myTeamHomeOrAway?: string; // Add this new prop: 'home' or 'away'
  onDelete: (paData: {
    team_id: string | undefined;
    game_id: string | undefined;
    inning_number: number | undefined;
    home_or_away: string | undefined;
    batter_seq_id: number;
  }) => Promise<void>;
  inningDetail?: { 
    scorebook_entries?: ScoreBookEntry[];
    lineup_entries?: { order_number: number }[];
  };
}

const PlateAppearanceModal = ({ 
  pa, 
  isOpen, 
  onClose,
  onSave,
  teamId,
  gameId,
  inningNumber,
  homeOrAway,
  nextBatterSeqId,
  myTeamHomeOrAway,
  onDelete,
  inningDetail
}: PlateAppearanceModalProps) => {
  const [editedPA, setEditedPA] = useState<ScoreBookEntry | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonData, setJsonData] = useState('');

  useEffect(() => {
    if (pa) {
      // Editing existing PA
      console.log("PlateAppearanceModal: Editing existing PA", pa);
      console.log("Existing PA details:", {
        order_number: pa.order_number,
        round: pa.round,
        batter_seq_id: pa.batter_seq_id,
        inning_number: pa.inning_number,
        home_or_away: pa.home_or_away
      });
      
      setEditedPA({ ...pa, out_at: pa.out_at || 0 });
    } else if (isOpen) {
      // Creating new PA
      console.log("PlateAppearanceModal: Creating new PA");
      console.log("Modal props:", { teamId, gameId, inningNumber, homeOrAway, nextBatterSeqId });
      
      // For a new PA, use the nextBatterSeqId provided by the parent component
      // This will already be calculated based on the round and order number
      const seqId = nextBatterSeqId || 1;
      console.log(`Using sequence ID: ${seqId} for new plate appearance`);
      
      // Calculate the round based on the sequence ID
      const lineupSize = inningDetail?.lineup_entries.length || 9;
      const round = Math.floor((seqId - 1) / lineupSize) + 1;
      console.log(`Calculated round: ${round} for sequence ID ${seqId}`);
      
      setEditedPA({
        order_number: 0,
        batter_jersey_number: '',
        batter_name: '',
        batter_seq_id: seqId,
        round: round,
        bases_reached: '',
        why_base_reached: '',
        pa_result: '',
        result_type: '',
        detailed_result: '',
        base_running: '',
        balls_before_play: 0,
        strikes_before_play: 0,
        strikes_watching: 0,
        strikes_swinging: 0,
        strikes_unsure: 0,
        fouls_after_two_strikes: 0,
        base_running_stolen_base: 0,
        team_id: teamId || '',
        game_id: gameId || '',
        inning_number: inningNumber || 0,
        home_or_away: homeOrAway || 'away',
        out_at: 0,
        pitch_count: 0,
      });
    }
  }, [pa, isOpen, teamId, gameId, inningNumber, homeOrAway, inningDetail, nextBatterSeqId]);

  // Remove or comment out these useEffect logging statements
  useEffect(() => {
    // Remove this log
    // console.log("editedPA updated:", editedPA);
  }, [editedPA]);

  const handleInputChange = (field: string, value: any) => {
    setEditedPA((prev: ScoreBookEntry | null) => {
      if (!prev) return null;
      // Remove this log
      // console.log(`Updating ${field} to ${value}`);
      
      const updatedPA = { ...prev, [field]: value };
      
      // If changing why_base_reached, recalculate pitch_count
      if (field === 'why_base_reached') {
        updatedPA.pitch_count = (
          (updatedPA.balls_before_play || 0) +
          (updatedPA.strikes_watching || 0) +
          (updatedPA.strikes_swinging || 0) +
          (updatedPA.strikes_unsure || 0) +
          (updatedPA.ball_swinging || 0) +
          (updatedPA.fouls || 0) +
          // Add 1 if why_base_reached is filled out (represents the final pitch)
          (updatedPA.why_base_reached ? 1 : 0)
        );
      }
      
      return updatedPA;
    });
  };

  // Handle incrementing counters for balls and strikes
  const incrementCounter = (field: string, value: number = 1) => {
    setEditedPA((prev: ScoreBookEntry | null) => {
      if (!prev) return null;
      // Remove this log
      // console.log(`Incrementing ${field} by ${value}`);
      
      const updatedPA = { ...prev };
      
      // Update the specific counter
      updatedPA[field] = (updatedPA[field] || 0) + value;
      
      // Recalculate strikes_before_play based on the rules
      if (field !== 'strikes_before_play') {
        // Calculate the sum of all strike types
        const strikeTypeSum = (
          (updatedPA.strikes_watching || 0) + 
          (updatedPA.strikes_swinging || 0) + 
          (updatedPA.strikes_unsure || 0) +
          (updatedPA.ball_swinging || 0)
        );
        
        const fouls = updatedPA.fouls || 0;
        
        // Apply the rules for strikes_before_play
        if (strikeTypeSum >= 2) {
          // If we already have 2 strikes from the types, don't count fouls
          updatedPA.strikes_before_play = Math.min(2, strikeTypeSum);
        } else if (strikeTypeSum === 1 && fouls >= 1) {
          // If we have 1 strike from types and at least 1 foul, count as 2 strikes
          updatedPA.strikes_before_play = 2;
        } else if (strikeTypeSum === 0 && fouls >= 2) {
          // If we have 0 strikes from types but 2+ fouls, count as 2 strikes
          updatedPA.strikes_before_play = 2;
        } else if (strikeTypeSum === 0 && fouls === 1) {
          // If we have 0 strikes from types and 1 foul, count as 1 strike
          updatedPA.strikes_before_play = 1;
        } else {
          // Otherwise, just use the sum of strike types
          updatedPA.strikes_before_play = strikeTypeSum;
        }
      }
      
      // Calculate pitch_count as the sum of all pitch-related fields
      updatedPA.pitch_count = (
        (updatedPA.balls_before_play || 0) +
        (updatedPA.strikes_watching || 0) +
        (updatedPA.strikes_swinging || 0) +
        (updatedPA.strikes_unsure || 0) +
        (updatedPA.ball_swinging || 0) +
        (updatedPA.fouls || 0) +
        (updatedPA.why_base_reached ? 1 : 0)
      );
      
      return updatedPA;
    });
  };

  // Handle decrementing counters
  const decrementCounter = (field: string, value: number = 1) => {
    setEditedPA((prev: ScoreBookEntry | null) => {
      if (!prev) return null;
      // Remove this log
      // console.log(`Decrementing ${field} by ${value}`);
      
      const updatedPA = { ...prev };
      
      // Update the specific counter (don't go below 0)
      updatedPA[field] = Math.max(0, (updatedPA[field] || 0) - value);
      
      // Recalculate strikes_before_play based on the rules
      if (field !== 'strikes_before_play') {
        // Calculate the sum of all strike types
        const strikeTypeSum = (
          (updatedPA.strikes_watching || 0) + 
          (updatedPA.strikes_swinging || 0) + 
          (updatedPA.strikes_unsure || 0) +
          (updatedPA.ball_swinging || 0)
        );
        
        const fouls = updatedPA.fouls || 0;
        
        // Apply the rules for strikes_before_play
        if (strikeTypeSum >= 2) {
          // If we already have 2 strikes from the types, don't count fouls
          updatedPA.strikes_before_play = Math.min(2, strikeTypeSum);
        } else if (strikeTypeSum === 1 && fouls >= 1) {
          // If we have 1 strike from types and at least 1 foul, count as 2 strikes
          updatedPA.strikes_before_play = 2;
        } else if (strikeTypeSum === 0 && fouls >= 2) {
          // If we have 0 strikes from types but 2+ fouls, count as 2 strikes
          updatedPA.strikes_before_play = 2;
        } else if (strikeTypeSum === 0 && fouls === 1) {
          // If we have 0 strikes from types and 1 foul, count as 1 strike
          updatedPA.strikes_before_play = 1;
        } else {
          // Otherwise, just use the sum of strike types
          updatedPA.strikes_before_play = strikeTypeSum;
        }
      }
      
      // Calculate pitch_count as the sum of all pitch-related fields
      updatedPA.pitch_count = (
        (updatedPA.balls_before_play || 0) +
        (updatedPA.strikes_watching || 0) +
        (updatedPA.strikes_swinging || 0) +
        (updatedPA.strikes_unsure || 0) +
        (updatedPA.ball_swinging || 0) +
        (updatedPA.fouls || 0) +
        (updatedPA.why_base_reached ? 1 : 0)
      );
      
      return updatedPA;
    });
  };

  // Update legacy fields for backward compatibility
  const updateLegacyFields = (updatedPA: ScoreBookEntry) => {
    // Map bases_reached and why_base_reached to legacy pa_result
    const basesReached = updatedPA.bases_reached || '';
    const whyBaseReached = updatedPA.why_base_reached || '';
    
    let legacyResult = '';
    
    // Handle outs
    if (basesReached === '0') {
      if (whyBaseReached === 'K') legacyResult = 'K';
      else if (whyBaseReached === 'KK') legacyResult = 'KK';
      else if (whyBaseReached === 'GO') legacyResult = 'GO';
      else if (whyBaseReached === 'FO') legacyResult = 'FO';
      else if (whyBaseReached === 'LO') legacyResult = 'LO';
      else if (whyBaseReached === 'FB') legacyResult = 'FB';
      else legacyResult = 'OUT';
    }
    // Handle hits
    else if (basesReached === '1') {
      if (whyBaseReached === 'H' || whyBaseReached === 'HH' || whyBaseReached === 'S' || whyBaseReached === 'B') 
        legacyResult = '1B';
      else if (whyBaseReached === 'BB') legacyResult = 'BB';
      else if (whyBaseReached === 'HBP') legacyResult = 'HBP';
      else if (whyBaseReached === 'E') legacyResult = 'E';
      else if (whyBaseReached === 'C') legacyResult = 'FC';
      else legacyResult = '1B';
    }
    else if (basesReached === '2') legacyResult = '2B';
    else if (basesReached === '3') legacyResult = '3B';
    else if (basesReached === '4') legacyResult = 'HR';
    
    // Update the legacy field
    updatedPA.pa_result = legacyResult;
    
    // Also update result_type for backward compatibility
    updatedPA.result_type = whyBaseReached;
  };

  const handleSave = async () => {
    // Remove this log
    // console.log('Submitting PA data row PlateAppearanceModal-->row255:', editedPA);
    if (editedPA && onSave) {
      // Ensure all required fields are present
      const completePA = {
        ...editedPA,
        // Set defaults for any missing fields
        inning_number: editedPA.inning_number || 1,
        home_or_away: editedPA.home_or_away || 'away',
        order_number: editedPA.order_number || 1,
        batter_seq_id: editedPA.batter_seq_id || 1,
        // A batter is out if bases_reached is 0 OR out_at is not 0
        out: (editedPA.bases_reached === '0' || (editedPA.out_at && editedPA.out_at !== 0)) ? 1 : 0,
        out_at: editedPA.out_at || 0,
        balls_before_play: editedPA.balls_before_play || 0,
        // Include the pitch_count field
        pitch_count: editedPA.pitch_count || 0,
        wild_pitch: editedPA.wild_pitch || 0,
        passed_ball: editedPA.passed_ball || 0,
        strikes_before_play: editedPA.strikes_before_play || 0,
        strikes_watching: editedPA.strikes_watching || 0,
        strikes_swinging: editedPA.strikes_swinging || 0,
        strikes_unsure: editedPA.strikes_unsure || 0,
        ball_swinging: editedPA.ball_swinging || 0,
        fouls: editedPA.fouls || 0,
        fouls_after_two_strikes: editedPA.fouls_after_two_strikes || 0,
        pa_result: editedPA.bases_reached?.charAt(0) || '0',
        hit_to: editedPA.detailed_result || '',
        pa_why: editedPA.why_base_reached || '',
        pa_error_on: editedPA.error_on || '0',
        br_result: editedPA.br_result !== undefined ? editedPA.br_result : parseInt(editedPA.bases_reached?.charAt(0) || '0'),
        // Set br_stolen_bases to the length of the stolen_bases array
        br_stolen_bases: (editedPA.stolen_bases || []).length,
        // br_error_on should be a list of positions that had an error
        br_error_on: editedPA.br_error_on || [],
        base_running_hit_around: editedPA.hit_around || 0,
        base_running_other: 0,
        stolen_bases: editedPA.stolen_bases || [],
        hit_around_bases: editedPA.hit_around_bases || [],
        // Add any other fields needed for the API
        teamId: editedPA.team_id || teamId || '',
        gameId: editedPA.game_id || gameId || '',
        my_team_ha: myTeamHomeOrAway || 'away',
      };

      // Remove this log
      // console.log('Complete payload being sent to API:', JSON.stringify(completePA, null, 2));

      try {
        // Use environment variable for API URL without fallback
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error('API URL is not configured. Please set NEXT_PUBLIC_API_URL in your environment variables.');
        }
        
        const response = await fetch(`${apiUrl}/scores/api/plate-appearance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completePA),
        });

        if (!response.ok) {
          // Check if the response is JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            // Remove this log
            // console.error('API error details:', errorData);
            throw new Error(`API error: ${errorData.detail || response.statusText}`);
          } else {
            // If not JSON, get the text response
            const errorText = await response.text();
            // Remove this log
            // console.error('API error text:', errorText);
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
        }

        const result = await response.json();
        // Remove this log
        // console.log('API save result:', result);

        // Then call the onSave callback to update local state
        onSave(completePA);
        
        // Close the modal
        onClose();
      } catch (error: unknown) {
        console.error('Error saving plate appearance:', error);
        if (error instanceof Error) {
          alert(`Failed to save plate appearance: ${error.message}`);
        } else {
          alert('Failed to save plate appearance: Unknown error');
        }
      }
    }
  };

  // Modify the generateJsonFile function to display the JSON instead of downloading it
  const displayJsonData = () => {
    if (!editedPA) return;
    
    // Create the complete data object with all required fields
    const completeData = {
      teamId: editedPA.team_id || teamId || '',
      gameId: editedPA.game_id || gameId || '',
      inning_number: editedPA.inning_number || inningNumber || 1,
      home_or_away: editedPA.home_or_away || homeOrAway || 'away',
      my_team_ha: myTeamHomeOrAway || 'away',
      order_number: editedPA.order_number || 1,
      batter_jersey_number: editedPA.batter_jersey_number || '',
      batter_name: editedPA.batter_name || '',
      batter_seq_id: editedPA.batter_seq_id || nextBatterSeqId || 1,
      // A batter is out if bases_reached is 0 OR out_at is not 0
      out: (editedPA.bases_reached === '0' || (editedPA.out_at && editedPA.out_at !== 0)) ? 1 : 0,
      out_at: editedPA.out_at || 0,
      balls_before_play: editedPA.balls_before_play || 0,
      // Include the pitch_count field
      pitch_count: editedPA.pitch_count || 0,
      wild_pitches: editedPA.wild_pitch || 0,
      passed_ball: editedPA.passed_ball || 0,
      strikes_before_play: editedPA.strikes_before_play || 0,
      strikes_watching: editedPA.strikes_watching || 0,
      strikes_swinging: editedPA.strikes_swinging || 0,
      strikes_unsure: editedPA.strikes_unsure || 0,
      ball_swinging: editedPA.ball_swinging || 0,
      fouls: editedPA.fouls || 0,
      pa_result: editedPA.bases_reached?.charAt(0) || '0',
      hit_to: editedPA.detailed_result || '',
      pa_why: editedPA.why_base_reached || '',
      pa_error_on: editedPA.error_on || '0',
      br_result: editedPA.br_result !== undefined ? editedPA.br_result : parseInt(editedPA.bases_reached?.charAt(0) || '0'),
      // Set br_stolen_bases to the length of the stolen_bases array
      br_stolen_bases: (editedPA.stolen_bases || []).length,
      // br_error_on should be a list of positions that had an error
      br_error_on: editedPA.br_error_on || [],
      base_running_hit_around: editedPA.hit_around || 0,
      base_running_other: 0,
      stolen_bases: editedPA.stolen_bases || [],
      hit_around_bases: editedPA.hit_around_bases || [],
    };
    
    // Convert the data to a formatted JSON string
    const jsonString = JSON.stringify(completeData, null, 2);
    
    // Set the JSON data and show the display
    setJsonData(jsonString);
    setShowJson(true);
  };

  // Update the delete handler in the PlateAppearanceModal component
  const handleDelete = async () => {
    if (!pa || !pa.id) {
      // For new API, we need team_id, game_id, inning_number, home_or_away, and batter_seq_id
      if (!pa || !pa.team_id || !pa.game_id || !pa.inning_number || !pa.home_or_away || !pa.batter_seq_id) {
        console.error("Cannot delete: Missing required plate appearance data");
        return;
      }
    }
    
    // Confirm deletion with the user
    if (!confirm('Are you sure you want to delete this plate appearance? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Call the onDelete function passed from the parent with all required parameters
      await onDelete({
        team_id: pa.team_id || teamId,
        game_id: pa.game_id || gameId,
        inning_number: pa.inning_number || inningNumber,
        home_or_away: pa.home_or_away || homeOrAway,
        batter_seq_id: pa.batter_seq_id
      });
      
      // Close the modal after successful deletion
      onClose();
    } catch (error) {
      console.error("Error in delete handler:", error);
      alert("Failed to delete plate appearance. Please try again.");
    }
  };

  // Check if we're creating a new PA or editing an existing one
  const isNewPA = pa && !pa.id; // Or some other check to determine if it's a new PA

  if (!isOpen) return null;
  if (!editedPA) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isNewPA ? "Add New Plate Appearance" : "Edit Plate Appearance"}
                  </h3>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                    
                    {pa && (
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                        onClick={handleDelete}
                      >
                        Delete
                      </button>
                    )}
                    
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-12 gap-4 mb-4">
                  <div className="col-span-5">
                    <CountSection 
                      editedPA={editedPA}
                      incrementCounter={incrementCounter}
                      decrementCounter={decrementCounter}
                    />
                  </div>
                  
                  <div className="col-span-7">
                    <ResultSection 
                      editedPA={editedPA}
                      handleInputChange={handleInputChange}
                      incrementCounter={incrementCounter}
                      decrementCounter={decrementCounter}
                    />
                  </div>
                </div>

                {showJson && (
                  <div className="mt-4 border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm">JSON Data</h4>
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => setShowJson(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-60 text-xs font-mono">
                      <pre>{jsonData}</pre>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          navigator.clipboard.writeText(jsonData);
                          alert('JSON copied to clipboard!');
                        }}
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 flex flex-wrap gap-x-4">
              <span><strong>Team:</strong> {editedPA.team_id || teamId || '-'}</span>
              <span><strong>Game:</strong> {editedPA.game_id || gameId || '-'}</span>
              <span><strong>Inning:</strong> {editedPA.inning_number || inningNumber || '-'}</span>
              <span><strong>Side:</strong> {editedPA.home_or_away || homeOrAway || '-'}</span>
              <span><strong>My Team:</strong> {myTeamHomeOrAway || '-'}</span>
              <span><strong>Inning Half:</strong> {(editedPA.home_or_away || homeOrAway) === 'away' ? 'Top' : 'Bottom'}</span>
              <span><strong>Sequence:</strong> {editedPA.batter_seq_id || nextBatterSeqId || '-'}</span>
            </div>
            
            <div className="mt-2">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-blue-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                onClick={displayJsonData}
              >
                Show JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlateAppearanceModal; 