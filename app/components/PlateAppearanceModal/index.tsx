'use client';

import { useState, useEffect } from 'react';
import { ScoreBookEntry } from '@/app/types/scoreTypes';
import CountSection from './CountSection';
import ResultSection from './ResultSection';

// Extend the ScoreBookEntry interface to include our new fields
// This is a local extension since we can't modify the imported type directly
interface ExtendedScoreBookEntry extends ScoreBookEntry {
  qab?: number;
  hard_hit?: number;
  slap?: number;
  sac?: number;
}

// Define the exact structure for the backend API
interface ScoreBookEntryStructure {
  // Lineup and identification
  order_number: number;
  batter_seq_id: number;
  inning_number: number;
  home_or_away: string;
  batting_order_position: number;
  team_id: string;
  teamId: string;
  game_id: string;
  gameId: string;
  out: number;
  my_team_ha: string;
  // Pitcher and Catcher Stats
  wild_pitch: number | null;
  passed_ball: number | null;
  //Batting Statistics
  rbi: number | null;
  late_swings: number | null;
  //Quality Indicators
  qab: number;
  hard_hit: number;
  slap: number;
  sac: number;
  // At the plate
  out_at: number;
  pa_why: string;
  pa_result: number;
  hit_to: number;
  pa_error_on: number[];
  // Base running
  br_result: number | null;
  br_stolen_bases: number[];
  base_running_hit_around: number[];
  br_error_on: number[];
  // Balls and strikes
  pitch_count: number;
  balls_before_play: number;
  strikes_before_play: number;
  strikes_unsure: number;
  strikes_watching: number;
  strikes_swinging: number;
  ball_swinging: number;
  fouls: number;
}

interface PlateAppearanceModalProps {
  pa: ScoreBookEntry | null;
  isOpen: boolean;
  onClose: (teamSide?: 'home' | 'away') => void;
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
    lineup_entries?: { 
      order_number: number;
      jersey_number: string;
      name: string;
      position: string;
    }[];
  };
}

const PlateAppearanceModal = ({ 
  pa, 
  isOpen, 
  onClose,
  onSave,
  teamId, //transfer from parent
  gameId,
  inningNumber,
  homeOrAway,
  nextBatterSeqId,
  myTeamHomeOrAway,
  onDelete,
  inningDetail // used to find the jersey number and name of the batter
}: PlateAppearanceModalProps) => {
  const [editedPA, setEditedPA] = useState<ScoreBookEntry | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Define quality indicators array once for reuse
  const qualityIndicators = ['qab', 'hard_hit', 'slap', 'sac'];

  useEffect(() => {
    if (pa) {
      // Create a copy of the PA with default values for missing fields
      
      // Ensure we have strings for jersey_number and name
      let updatedJerseyNumber = pa.batter_jersey_number || '';
      let updatedPlayerName = pa.batter_name || '';
      
      // If jersey number or name is missing, try to find it in the lineup entries
      if ((!updatedJerseyNumber || !updatedPlayerName) && inningDetail?.lineup_entries) {
        const orderNumber = pa.order_number;
        const playerInfo = inningDetail.lineup_entries.find(entry => entry.order_number === orderNumber);
        
        if (playerInfo) {
          updatedJerseyNumber = playerInfo.jersey_number || updatedJerseyNumber;
          updatedPlayerName = playerInfo.name || updatedPlayerName;
        }
      }
      
      // Helper function to parse array fields from API
      const parseArrayField = (value: any, convertToNumbers: boolean = false): any[] => {
        if (!value) return [];
        
        // If it's already an array, convert values if needed and return
        if (Array.isArray(value)) {
          return convertToNumbers 
            ? value.map(item => typeof item === 'string' ? Number(item) : item)
            : value;
        }
        
        // If it's a string representation of an array, parse it
        if (typeof value === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return convertToNumbers 
                ? parsed.map(item => typeof item === 'string' ? Number(item) : item)
                : parsed;
            }
            
            // Handle string format like "['2', '3', '4']"
            if (value.includes('[') && value.includes(']')) {
              // Remove the outer quotes and brackets, then split by comma
              const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
              if (cleanedStr.trim() === '') return [];
              const items = cleanedStr.split(',').map(item => item.trim());
              return convertToNumbers ? items.map(item => Number(item)) : items;
            }
            
            // Handle comma-separated values
            if (value.includes(',')) {
              const items = value.split(',').map(item => item.trim());
              return convertToNumbers ? items.map(item => Number(item)) : items;
            }
            
            // Single value
            const result = [value];
            return convertToNumbers ? result.map(item => Number(item)) : result;
          } catch (e) {
            // If parsing fails, return as a single-item array
            if (value.includes('[') && value.includes(']')) {
              const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
              if (cleanedStr.trim() === '') return [];
              const items = cleanedStr.split(',').map(item => item.trim());
              return convertToNumbers ? items.map(item => Number(item)) : items;
            }
            const result = [value];
            return convertToNumbers ? result.map(item => Number(item)) : result;
          }
        }
        
        return [];
      };
      
      // Create a copy of the PA with default values for missing fields
      const updatedPA: ExtendedScoreBookEntry = { 
        ...pa, 
        // Ensure out_at is treated as a number for type compatibility
        out_at: pa.out_at ? Number(pa.out_at) : 0,
        // Make sure these fields are properly set
        batter_jersey_number: updatedJerseyNumber,
        batter_name: updatedPlayerName,
        // Ensure hit_to and detailed_result are synced - use whichever one is available
        hit_to: pa.hit_to !== undefined ? Number(pa.hit_to) : 
               (pa.detailed_result ? Number(pa.detailed_result) : 0),
        detailed_result: (pa.detailed_result || String(pa.hit_to || 0) || '0'),
        // Ensure pa_result is properly set - this is the initial base reached
        pa_result: pa.pa_result ? Number(pa.pa_result) : 0,
        // Ensure br_result is properly set - this is the final base reached
        br_result: pa.br_result !== undefined ? Number(pa.br_result) : (
          pa.pa_result ? Number(pa.pa_result) : 0
        ),
        // Initialize our new fields
        qab: (pa as ExtendedScoreBookEntry).qab !== undefined ? Number((pa as ExtendedScoreBookEntry).qab) : 0,
        hh: 0, // Just use 0 instead of HH string
        hard_hit: (pa as ExtendedScoreBookEntry).hard_hit !== undefined ? Number((pa as ExtendedScoreBookEntry).hard_hit) : 0,
        rbi: (pa as ExtendedScoreBookEntry).rbi || 0,
        risp: null,
        // Parse array fields from API as number arrays
        pa_error_on: parseArrayField(pa.pa_error_on, true),
        br_error_on: parseArrayField(pa.br_error_on, true),
        stolen_bases: parseArrayField(pa.br_stolen_bases, true),
        hit_around_bases: parseArrayField(pa.base_running_hit_around, true)
      };
      
      // If why_base_reached exists but pa_why doesn't, copy the value for backward compatibility
      if (pa.why_base_reached && !(pa as any).pa_why) {
        updatedPA.pa_why = pa.why_base_reached;
      }
      
      // Always keep why_base_reached in sync with pa_why for backward compatibility
      // We're transitioning to using pa_why as the primary field
      updatedPA.why_base_reached = updatedPA.pa_why || '';
      
      // If pa_why is 'HH', ensure hard_hit field is set to 1
      if (updatedPA.pa_why === 'HH') {
        updatedPA.hard_hit = 1;
      }
      
      // If this is a sacrifice fly/bunt or hard hit, it's a QAB
      if (['SF', 'SB', 'HH'].includes(updatedPA.pa_why || '')) {
        updatedPA.qab = 1;
      }
      
      // If RBI is greater than 0, set RISP
      if (updatedPA.rbi && updatedPA.rbi > 0) {
        updatedPA.risp = 'RISP';
      }
      
      // Set default values for all quality indicators
      qualityIndicators.forEach(field => {
        updatedPA[field] = updatedPA[field] !== undefined ? Number(updatedPA[field]) : 0;
      });
      
      setEditedPA(updatedPA);
    } else if (isOpen) {
      // Creating new PA
      
      // For a new PA, use the nextBatterSeqId provided by the parent component
      const seqId = nextBatterSeqId || 1;
      
      // Calculate the round based on the sequence ID
      const lineupSize = inningDetail?.lineup_entries?.length || 9;
      const round = Math.floor((seqId - 1) / lineupSize) + 1;
      
      // Find the player information from the lineup entries
      let playerJerseyNumber = '';
      let playerName = '';
      let orderNumber = 0;
      
      if (inningDetail?.lineup_entries && inningDetail.lineup_entries.length > 0) {
        // Calculate the order number based on the sequence ID
        orderNumber = ((seqId - 1) % lineupSize) + 1;
        
        // Find the player with the matching order number
        const playerInfo = inningDetail.lineup_entries.find(entry => entry.order_number === orderNumber);
        
        if (playerInfo) {
          playerJerseyNumber = playerInfo.jersey_number || '';
          playerName = playerInfo.name || '';
        }
      }
      
      // Create the new PA with the player information
      const newPA: ExtendedScoreBookEntry = {
        order_number: orderNumber,
        batter_jersey_number: playerJerseyNumber,
        batter_name: playerName,
        batter_seq_id: seqId,
        round: round,
        pa_result: 0,
        bases_reached: '', // Required by ScoreBookEntry interface but duplicative with pa_result
        base_running: '',
        balls_before_play: 0,
        strikes_before_play: 0,
        strikes_watching: 0,
        strikes_swinging: 0,
        strikes_unsure: 0,
        fouls_after_two_strikes: 0,
        fouls: 0, // Explicitly set fouls to 0
        ball_swinging: 0, // Explicitly set ball_swinging to 0
        base_running_stolen_base: 0,
        team_id: teamId || '',
        game_id: gameId || '',
        inning_number: inningNumber || 0,
        home_or_away: homeOrAway || 'away',
        out_at: 0, // Ensure out_at is a number for type compatibility
        pitch_count: 0,
        // Initialize our new fields
        qab: 0,
        hh: 0,
        hard_hit: 0, // Initialize hard_hit field as 0
        rbi: 0,
        // Add missing required properties
        pa_why: '', // This is the field we'll use going forward
        why_base_reached: '', // For backward compatibility
        detailed_result: '', // Add detailed_result field
        result_type: '', // Required by ScoreBookEntry interface
        // Explicitly initialize arrays to empty
        pa_error_on: [],
        br_error_on: [],
        stolen_bases: [],
        hit_around_bases: []
      };
      
      // Set default values for all quality indicators
      qualityIndicators.forEach(field => {
        newPA[field] = 0;
      });
      
      setEditedPA(newPA);
    }
  }, [pa, isOpen, teamId, gameId, inningNumber, homeOrAway, inningDetail, nextBatterSeqId]);

  // Remove useEffect logging statements
  useEffect(() => {
    // Removed console.log
  }, [editedPA]);

  const handleInputChange = (field: string, value: any) => {
    setEditedPA(prev => {
      if (!prev) return null;
      
      // Create updated object with the new field value
      const updated = { ...prev };
      
      // Helper function to safely parse array fields and convert to numbers
      const parseArrayField = (value: any, convertToNumbers: boolean = true): any[] => {
        if (!value) return [];
        
        // If it's already an array, convert values if needed and return
        if (Array.isArray(value)) {
          return convertToNumbers 
            ? value.map(item => typeof item === 'string' ? Number(item) : Number(item))
            : value;
        }
        
        // If it's a string representation of an array, parse it
        if (typeof value === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return convertToNumbers 
                ? parsed.map(item => typeof item === 'string' ? Number(item) : Number(item))
                : parsed;
            }
            
            // Handle string format like "['2', '3', '4']"
            if (value.includes('[') && value.includes(']')) {
              // Remove the outer quotes and brackets, then split by comma
              const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
              if (cleanedStr.trim() === '') return [];
              const items = cleanedStr.split(',').map(item => item.trim());
              return convertToNumbers ? items.map(item => Number(item)) : items;
            }
            
            // Handle comma-separated values
            if (value.includes(',')) {
              const items = value.split(',').map(item => item.trim());
              return convertToNumbers ? items.map(item => Number(item)) : items;
            }
            
            // Single value
            const result = [value];
            return convertToNumbers ? result.map(item => Number(item)) : result;
          } catch (e) {
            // If parsing fails, return as a single-item array
            const result = [value];
            return convertToNumbers ? result.map(item => Number(item)) : result;
          }
        }
        
        return [];
      };
      
      // Handle array fields
      const ARRAY_FIELDS = ["hit_around_bases", "stolen_bases", "pa_error_on", "br_error_on"];
      if (ARRAY_FIELDS.includes(field)) {
        // For fields that need to be arrays of numbers
        const NUMBER_ARRAY_FIELDS = ["pa_error_on", "br_error_on", "hit_around_bases", "stolen_bases"];
        const shouldConvertToNumbers = NUMBER_ARRAY_FIELDS.includes(field);
        
        // Use the parseArrayField helper function
        updated[field] = parseArrayField(value, shouldConvertToNumbers);
      } else {
        // For non-array fields, just set the value directly
        updated[field] = value;
      }
      
      // If changing detailed_result, also update hit_to (and vice versa)
      if (field === 'detailed_result') {
        updated.hit_to = value;
      } else if (field === 'hit_to') {
        updated.detailed_result = value;
      }
      
      // If changing pa_result directly, ensure br_result is updated appropriately
      if (field === 'pa_result') {
        // Also update bases_reached to keep them in sync
        updated.bases_reached = typeof value === 'number' ? value.toString() : value;
        
        // If br_result is not set or less than pa_result, update it too
        const numValue = typeof value === 'number' ? value : parseInt(value);
        if (updated.br_result === undefined || updated.br_result < numValue) {
          updated.br_result = numValue;
        }
      }
      
      // If changing bases_reached, also update pa_result to keep them in sync
      if (field === 'bases_reached' && value) {
        updated.pa_result = parseInt(value);
        
        // If br_result is not set or less than the initial base, update it too
        const numValue = parseInt(value);
        if (updated.br_result === undefined || updated.br_result < numValue) {
          updated.br_result = numValue;
        }
      }
      
      // IMPORTANT: We're transitioning from why_base_reached to pa_why
      // Keep both fields in sync during the transition period
      // In the future, we'll only use pa_why
      
      // If changing pa_why, also update why_base_reached for backward compatibility
      if (field === 'pa_why') {
        // Keep why_base_reached in sync with pa_why for backward compatibility
        updated.why_base_reached = value;
        
        // If setting pa_why to 'BB' (walk), ensure balls_before_play is at least 4
        if (value === 'BB' && (updated.balls_before_play === undefined || updated.balls_before_play < 4)) {
          updated.balls_before_play = 4;
          
          // Recalculate pitch count to include the 4 balls and any strikes
          const strikeTypeSum = (
            (updated.strikes_watching || 0) + 
            (updated.strikes_swinging || 0) + 
            (updated.strikes_unsure || 0) +
            (updated.ball_swinging || 0)
          );
          const fouls = updated.fouls || 0;
          
          updated.pitch_count = (
            4 + // 4 balls for a walk
            strikeTypeSum +
            fouls
          );
        }
        
        // If setting pa_why to 'K' or 'KK' (strikeout), ensure strikes_before_play is at least 3
        else if ((value === 'K' || value === 'KK') && (updated.strikes_before_play === undefined || updated.strikes_before_play < 3)) {
          updated.strikes_before_play = 3;
          
          // For KK (looking), ensure at least one strike is watching
          if (value === 'KK' && (updated.strikes_watching === undefined || updated.strikes_watching < 1)) {
            updated.strikes_watching = Math.max(1, updated.strikes_watching || 0);
          }
          
          // Recalculate pitch count to include at least 3 strikes and any balls
          const balls = updated.balls_before_play || 0;
          const fouls = updated.fouls || 0;
          
          // For a full count strikeout, ensure we have at least 3 balls
          if (balls === 3) {
            updated.pitch_count = (
              balls + 
              3 + // 3 strikes for a strikeout
              fouls
            );
          } else {
            // For other strikeouts, just ensure we have at least 3 strikes
            updated.pitch_count = Math.max(
              updated.pitch_count || 0,
              balls + 3 + fouls
            );
          }
        }
        // For all other outcomes, add 1 to the pitch count for the final pitch
        else if (value && value !== '') {
          // Calculate the base pitch count from all the components
          const basePitchCount = (
            (updated.balls_before_play || 0) +
            (updated.strikes_watching || 0) + 
            (updated.strikes_swinging || 0) + 
            (updated.strikes_unsure || 0) +
            (updated.ball_swinging || 0) +
            (updated.fouls || 0)
          );
          
          // Add 1 for the final pitch that resulted in the play
          updated.pitch_count = basePitchCount + 1;
        }
      }
      
      // If changing why_base_reached, also update pa_why for forward compatibility
      if (field === 'why_base_reached') {
        // Copy the value to pa_why and continue using pa_why going forward
        updated.pa_why = value;
      }
      // Handle all Quality Indicators with numeric values (1/0)
      if (['qab', 'hard_hit', 'slap', 'sac'].includes(field)) {
        updated[field] = value === 1 ? 1 : 0;
      }
      // Handle RBI increment/decrement without RISP
      if (field === 'rbi') {
        // Ensure RBI is a number
        updated.rbi = typeof value === 'number' ? value : 0;
      }
      // Remove any existing RISP references
      if (updated.hasOwnProperty('risp')) {
        delete updated.risp;
      }
      return updated;
    });
  };

  // Handle incrementing counters for balls and strikes
  const incrementCounter = (field: string, value: number = 1) => {
    setEditedPA((prev: ScoreBookEntry | null) => {
      if (!prev) return null;
      const updatedPA = { ...prev };
      
      // Skip processing for newly created PA with no interactions
      const isNewlyCreatedPA = !prev.pa_why && prev.pitch_count === 0 && 
                              prev.balls_before_play === 0 && prev.strikes_before_play === 0;
      
      // Update the specific counter
      updatedPA[field] = (updatedPA[field] || 0) + value;
      
      // Only recalculate if this is not a brand new PA
      if (!isNewlyCreatedPA) {
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
          (updatedPA.fouls || 0)
        );
        
        // Add additional pitches based on the outcome (pa_why)
        if (updatedPA.pa_why) {
          if (updatedPA.pa_why === 'BB') {
            // For walks (BB), ensure we count the final pitch that resulted in the walk
            // if it's not already included in balls_before_play
            if ((updatedPA.balls_before_play || 0) < 4) {
              updatedPA.pitch_count += (4 - (updatedPA.balls_before_play || 0));
            }
          } else if (updatedPA.pa_why === 'K' || updatedPA.pa_why === 'KK') {
            // For strikeouts (K or KK), ensure we count the final pitch that resulted in the strikeout
            // if it's not already included in strikes_before_play
            if ((updatedPA.strikes_before_play || 0) < 3) {
              updatedPA.pitch_count += (3 - (updatedPA.strikes_before_play || 0));
            }
          } else {
            // For all other outcomes, add 1 for the final pitch that resulted in the play
            updatedPA.pitch_count += 1;
          }
        }
      }
      
      return updatedPA;
    });
  };

  // Handle decrementing counters
  const decrementCounter = (field: string, value: number = 1) => {
    setEditedPA((prev: ScoreBookEntry | null) => {
      if (!prev) return null;
      
      const updatedPA = { ...prev };
      
      // Skip processing for newly created PA with no interactions
      const isNewlyCreatedPA = !prev.pa_why && prev.pitch_count === 0 && 
                              prev.balls_before_play === 0 && prev.strikes_before_play === 0;
      
      // Update the specific counter (don't go below 0)
      updatedPA[field] = Math.max(0, (updatedPA[field] || 0) - value);
      
      // Only recalculate if this is not a brand new PA
      if (!isNewlyCreatedPA) {
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
          (updatedPA.fouls || 0)
        );
        
        // Add additional pitches based on the outcome (pa_why)
        if (updatedPA.pa_why) {
          if (updatedPA.pa_why === 'BB') {
            // For walks (BB), ensure we count the final pitch that resulted in the walk
            // if it's not already included in balls_before_play
            if ((updatedPA.balls_before_play || 0) < 4) {
              updatedPA.pitch_count += (4 - (updatedPA.balls_before_play || 0));
            }
          } else if (updatedPA.pa_why === 'K' || updatedPA.pa_why === 'KK') {
            // For strikeouts (K or KK), ensure we count the final pitch that resulted in the strikeout
            // if it's not already included in strikes_before_play
            if ((updatedPA.strikes_before_play || 0) < 3) {
              updatedPA.pitch_count += (3 - (updatedPA.strikes_before_play || 0));
            }
          } else {
            // For all other outcomes, add 1 for the final pitch that resulted in the play
            updatedPA.pitch_count += 1;
          }
        }
      }
      
      return updatedPA;
    });
  };

  // Create a helper function to generate the API data structure
  const createApiData = (): ScoreBookEntryStructure | null => {
    if (!editedPA) return null;
    // Create a copy of the edited data to ensure we don't modify the original
    const paData: ExtendedScoreBookEntry = { 
      ...editedPA,
      rbi: (editedPA as ExtendedScoreBookEntry).rbi || 0,
      late_swings: (editedPA as ExtendedScoreBookEntry).late_swings || 0,
      // Quality Indicators - ensure all are numbers
      qab: (editedPA as ExtendedScoreBookEntry).qab !== undefined ? Number((editedPA as ExtendedScoreBookEntry).qab) : 0,
      hard_hit: (editedPA as ExtendedScoreBookEntry).hard_hit !== undefined ? Number((editedPA as ExtendedScoreBookEntry).hard_hit) : 0,
      slap: (editedPA as ExtendedScoreBookEntry).slap !== undefined ? Number((editedPA as ExtendedScoreBookEntry).slap) : 0,
      sac: (editedPA as ExtendedScoreBookEntry).sac !== undefined ? Number((editedPA as ExtendedScoreBookEntry).sac) : 0,
      // Ensure pa_why is set
      pa_why: editedPA.pa_why || editedPA.why_base_reached || ''
    };
    
    // Helper function to safely parse array fields and convert to numbers
    const parseArrayField = (value: any, convertToNumbers: boolean = true): any[] => {
      if (!value) return [];
      
      // If it's already an array, convert values if needed and return
      if (Array.isArray(value)) {
        return convertToNumbers 
          ? value.map(item => typeof item === 'string' ? Number(item) : Number(item))
          : value;
      }
      
      // If it's a string representation of an array, parse it
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return convertToNumbers 
              ? parsed.map(item => typeof item === 'string' ? Number(item) : Number(item))
              : parsed;
          }
          
          // Handle string format like "['2', '3', '4']"
          if (value.includes('[') && value.includes(']')) {
            // Remove the outer quotes and brackets, then split by comma
            const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
            if (cleanedStr.trim() === '') return [];
            const items = cleanedStr.split(',').map(item => item.trim());
            return convertToNumbers ? items.map(item => Number(item)) : items;
          }
          
          // Handle comma-separated values
          if (value.includes(',')) {
            const items = value.split(',').map(item => item.trim());
            return convertToNumbers ? items.map(item => Number(item)) : items;
          }
          
          // Single value
          const result = [value];
          return convertToNumbers ? result.map(item => Number(item)) : result;
        } catch (e) {
          // If parsing fails, return as a single-item array
          const result = [value];
          return convertToNumbers ? result.map(item => Number(item)) : result;
        }
      }
      
      return [];
    };
    
    // Create the structured data for the backend API
    return {
      // Lineup and identification
      order_number: Number(paData.order_number) || 1,
      batter_seq_id: Number(paData.batter_seq_id) || nextBatterSeqId || 1,
      inning_number: Number(paData.inning_number) || inningNumber || 1,
      home_or_away: paData.home_or_away || homeOrAway || 'away',
      batting_order_position: Number(paData.order_number) || 1, // Same as order_number
      team_id: paData.team_id || teamId || '',
      teamId: paData.team_id || teamId || '',
      game_id: paData.game_id || gameId || '',
      gameId: paData.game_id || gameId || '',
      out: (typeof paData.pa_result === 'number' && paData.pa_result === 0) || 
           (typeof paData.pa_result === 'string' && paData.pa_result === '0') || 
           paData.bases_reached === '0' || 
           (paData.out_at && paData.out_at !== 0) ? 1 : 0,
      my_team_ha: myTeamHomeOrAway || 'away',
      //pitcher and catcher stats
      wild_pitch: paData.wild_pitch !== undefined ? Number(paData.wild_pitch) : 0,
      passed_ball: paData.passed_ball !== undefined ? Number(paData.passed_ball) : 0,
      // One-off tracking
      rbi: paData.rbi !== undefined ? Number(paData.rbi) : 0,
      late_swings: paData.late_swings !== undefined ? Number(paData.late_swings) : 0,
      //Quality Indicators
      qab: paData.qab !== undefined ? Number(paData.qab) : 0,
      hard_hit: paData.hard_hit !== undefined ? Number(paData.hard_hit) : 0,
      slap: paData.slap !== undefined ? Number(paData.slap) : 0,
      sac: paData.sac !== undefined ? Number(paData.sac) : 0,
      // At the plate
      out_at: paData.out_at ? Number(paData.out_at) : 0,
      pa_why: paData.pa_why || '', // Primary field for plate appearance reason
      pa_result: Number(paData.pa_result || 0),
      hit_to: Number(paData.hit_to || paData.detailed_result || 0),
      pa_error_on: parseArrayField(paData.pa_error_on, true),
      // Base running
      br_result: paData.br_result !== undefined ? Number(paData.br_result) : null,
      br_stolen_bases: parseArrayField(paData.stolen_bases, true),
      base_running_hit_around: parseArrayField(paData.hit_around_bases, true),
      br_error_on: parseArrayField(paData.br_error_on, true),
      // Balls and strikes
      pitch_count: Number(paData.pitch_count) || 0,
      balls_before_play: Number(paData.balls_before_play) || 0,
      strikes_before_play: Number(paData.strikes_before_play) || 0,
      strikes_unsure: Number(paData.strikes_unsure) || 0,
      strikes_watching: Number(paData.strikes_watching) || 0,
      strikes_swinging: Number(paData.strikes_swinging) || 0,
      ball_swinging: Number(paData.ball_swinging) || 0,
      fouls: Number(paData.fouls) || 0,
    };
  };

  // Add a custom close handler to prevent team switching
  const handleClose = () => {
    // Clear modal state
    setShowJson(false);
    setJsonData('');
    setIsSaving(false);
    
    // Call the parent's onClose with the myTeamHomeOrAway value to maintain the correct tab
    onClose(myTeamHomeOrAway as 'home' | 'away');
  };

  const handleSave = () => {
    // Get the API data using our helper function
    const apiData = createApiData();
    if (!apiData) return;
    
    // Call the onSave function with the prepared data
    if (onSave) {
      // Set saving state if needed
      setIsSaving(true);
      
      // Call onSave
      try {
        onSave(apiData as unknown as ScoreBookEntry);
        // Close the modal on successful save using our custom close handler
        handleClose();
      } catch (error) {
        console.error("Error saving plate appearance:", error);
        // You could show an error message here if needed
        setIsSaving(false);
      }
    }
  };

  // Modify the displayJsonData function to use the same data structure as the API
  const displayJsonData = () => {
    // Get the API data using our helper function
    const apiData = createApiData();
    if (!apiData) return;
    
    // Convert the data to a formatted JSON string
    const jsonString = JSON.stringify(apiData, null, 2);
    
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
      
      // Close the modal after successful deletion using our custom close handler
      handleClose();
    } catch (error) {
      console.error("Error in delete handler:", error);
      alert("Failed to delete plate appearance. Please try again.");
    }
  };

  if (!isOpen) return null;
  if (!editedPA) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-16 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-top bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-4 sm:align-middle sm:max-w-4xl sm:w-full sm:max-h-[90vh]">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[calc(95vh-120px)] overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editedPA?.batter_name 
                      ? `Edit PA for ${editedPA.batter_name} (#${editedPA.batter_jersey_number || ''})`
                      : "Edit Plate Appearance"
                    }
                  </h3>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-blue-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                      onClick={displayJsonData}
                    >
                      Show JSON
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                
                {/* Main content area with form and JSON side by side */}
                <div className="flex flex-row gap-4">
                  {/* Left side: Form */}
                  <div className="flex-grow">
                    <div className="grid grid-cols-12 gap-4 mb-4">
                      <div className="col-span-5">
                        <CountSection 
                          editedPA={editedPA}
                          incrementCounter={incrementCounter}
                          decrementCounter={decrementCounter}
                          handleInputChange={handleInputChange}
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
                  </div>
                  
                  {/* Right side: JSON data */}
                  <div className={`w-80 transition-all duration-300 ${showJson ? 'opacity-100' : 'opacity-0 w-0'}`}>
                    {showJson && (
                      <div className="border rounded p-3 bg-gray-50 h-full">
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
                        <div className="bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-[660px] text-xs font-mono">
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
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 flex flex-wrap gap-x-4">
              <span><strong>Team:</strong> {editedPA.team_id || teamId || '-'}</span>
              <span><strong>Game:</strong> {editedPA.game_id || gameId || '-'}</span>
              <span><strong>Inning:</strong> {editedPA.inning_number || inningNumber || '-'}</span>
              <span><strong>Side:</strong> {editedPA.home_or_away || homeOrAway || '-'}</span>
              <span><strong>My Team:</strong> {myTeamHomeOrAway || '-'}</span>
              <span><strong>Sequence:</strong> {editedPA.batter_seq_id || nextBatterSeqId || '-'}</span>
            </div>
            
            <div className="mt-2 flex justify-between">
              {pa && (
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlateAppearanceModal; 