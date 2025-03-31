'use client';

import { useState, useEffect } from 'react';
import { ScoreBookEntry } from '@/app/types/scoreTypes';
import CountSection from './CountSection';
import ResultSection from './ResultSection';
import React from 'react';

// Add these additional field types for our component
interface AdditionalFields {
  qab?: number;
  hard_hit?: number;
  slap?: number;
  sac?: number;
  stolen_bases?: number[];
  hit_around_bases?: number[];
  br_stolen_bases?: number[];
  base_running_hit_around?: number[];
  br_error_on?: number[];
  pa_error_on?: number[];
  rbi?: number;
  late_swings?: number;
}

// Define InningDetail interface
interface InningDetail {
  scorebook_entries?: ScoreBookEntry[];
  lineup_entries?: { 
    order_number: number;
    jersey_number: string;
    name: string;
    position: string;
  }[];
  team_id?: string;
  game_id?: string;
  inning_number?: number;
  my_team_ha?: string;
  lineup_available?: boolean;
  stats?: {
    runs: number;
    hits: number;
    errors: number;
    walks: number;
    outs: number;
    total_plate_appearances: number;
  };
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
  br_result: number | null | undefined;
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
  onSave?: (updatedPA: ScoreBookEntry) => Promise<void>;
  teamId?: string;
  gameId?: string;
  inningNumber?: number;
  homeOrAway?: string;
  nextBatterSeqId?: number;
  myTeamHomeOrAway?: string;
  onDelete: (paData: {
    team_id: string;
    game_id: string;
    inning_number: number | string;
    home_or_away: string;
    batter_seq_id: number;
  }) => Promise<void>;
  inningDetail: InningDetail | null;
  paEditEndpoint?: string; // New prop for the API endpoint
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
  inningDetail, // used to find the jersey number and name of the batter
  paEditEndpoint
}: PlateAppearanceModalProps) => {
  const [editedPA, setEditedPA] = useState<ScoreBookEntry | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Add a ref to track if we've already fetched data for this PA
  const dataFetchedRef = React.useRef<{[key: string]: boolean}>({});

  // Define quality indicators array once for reuse
  const qualityIndicators = ['qab', 'hard_hit', 'slap', 'sac'];

  // Add a function to fetch PA data from the custom endpoint
  const fetchPADataFromEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  };

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
      const updatedPA: ScoreBookEntry = { 
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
        qab: (pa as AdditionalFields).qab !== undefined ? Number((pa as AdditionalFields).qab) : 0,
        hh: 0, // Just use 0 instead of HH string
        hard_hit: (pa as AdditionalFields).hard_hit !== undefined ? Number((pa as AdditionalFields).hard_hit) : 0,
        rbi: (pa as AdditionalFields).rbi || 0,
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
      const newPA: ScoreBookEntry = {
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

  // Use the endpoint in the useEffect
  useEffect(() => {
    if (isOpen && paEditEndpoint && pa?.batter_seq_id) {
      // Create a unique key for this PA to track if we've already fetched it
      const fetchKey = `${paEditEndpoint}_${pa.batter_seq_id}`;
      
      // Only fetch if we haven't already fetched this PA's data
      if (!dataFetchedRef.current[fetchKey]) {
        dataFetchedRef.current[fetchKey] = true;
        
        // Fetch data from the provided endpoint
        fetchPADataFromEndpoint(paEditEndpoint).then(data => {
          if (data) {
            // Update the form with the fetched data
            if (data.plate_appearance) {
              const fetchedPA = data.plate_appearance;
              // Directly extract the base_running_hit_around array from the API
              const baseRunningHitAround = Array.isArray(fetchedPA.base_running_hit_around) 
                ? [...fetchedPA.base_running_hit_around] // Create a copy
                : [];
              
              // Map the fields from the API response to the form state
              const mappedData = mapAPIResponseToFormState(fetchedPA);
              if (mappedData) {
                setEditedPA(currentPA => {
                  if (!currentPA) return null;
                  
                  // Use type assertion to handle the null value for br_result
                  const updatedPA = {
                    ...currentPA,
                    ...mappedData,
                    // Ensure these arrays are explicitly copied from the API data
                    base_running_hit_around: baseRunningHitAround,
                    hit_around_bases: baseRunningHitAround,
                    br_stolen_bases: Array.isArray(fetchedPA.br_stolen_bases) ? [...fetchedPA.br_stolen_bases] : [],
                    stolen_bases: Array.isArray(fetchedPA.br_stolen_bases) ? [...fetchedPA.br_stolen_bases] : [],
                    // Explicitly copy count-related fields
                    fouls: Number(fetchedPA.fouls ?? 0),
                    ball_swinging: Number(fetchedPA.ball_swinging ?? 0),
                    strikes_unsure: Number(fetchedPA.strikes_unsure ?? 0),
                    strikes_watching: Number(fetchedPA.strikes_watching ?? 0),
                    strikes_swinging: Number(fetchedPA.strikes_swinging ?? 0),
                    late_swings: Number(fetchedPA.late_swings ?? 0),
                    // Convert null to undefined for br_result if needed
                    br_result: mappedData.br_result === null ? undefined : mappedData.br_result
                  };
                  
                  return updatedPA;
                });
              }
            }
          }
        });
      }
    } else if (!isOpen) {
      // Reset the tracking when modal is closed
      dataFetchedRef.current = {};
    }
  }, [isOpen, paEditEndpoint, pa?.batter_seq_id]);

  // Helper function to map API response to form state with better type safety
  const mapAPIResponseToFormState = (apiPA: Record<string, any>): Partial<ScoreBookEntry> | null => {
    if (!apiPA) return null;
    
    // Helper function to properly handle array fields
    const parseArrayField = (value: any): number[] => {
      if (!value) return [];
      
      // If it's already an array, ensure all elements are numbers
      if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? Number(item) : Number(item));
      }
      
      // Handle string representations
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map(item => Number(item));
          }
        } catch (e) {
          // If parsing fails, split by comma or return as a single-item array
          if (value.includes(',')) {
            return value.split(',').map(item => Number(item.trim()));
          }
          return [Number(value)];
        }
      }
      
      return [];
    };
    
    // Make explicit conversions to ensure type safety
    const mappedData: Partial<ScoreBookEntry> = {
      // Base result fields
      bases_reached: String(apiPA.pa_result ?? 0),
      pa_result: Number(apiPA.pa_result ?? 0),
      why_base_reached: String(apiPA.pa_why ?? ''),
      pa_why: String(apiPA.pa_why ?? ''),
      detailed_result: String(apiPA.hit_to ?? 0),
      hit_to: Number(apiPA.hit_to ?? 0),
      
      // Count fields
      balls_before_play: Number(apiPA.balls_before_play ?? 0),
      strikes_before_play: Number(apiPA.strikes_before_play ?? 0),
      strikes_watching: Number(apiPA.strikes_watching ?? 0),
      strikes_swinging: Number(apiPA.strikes_swinging ?? 0),
      strikes_unsure: Number(apiPA.strikes_unsure ?? 0),
      fouls_after_two_strikes: Number(apiPA.fouls_after_two_strikes ?? 0),
      fouls: Number(apiPA.fouls ?? 0),
      ball_swinging: Number(apiPA.ball_swinging ?? 0),
      
      // Base running - convert null to undefined for type compatibility
      br_result: apiPA.br_result === null ? undefined : 
                (apiPA.br_result !== undefined ? Number(apiPA.br_result) : undefined),
      
      // Array fields - store the arrays directly
      pa_error_on: apiPA.pa_error_on ? parseArrayField(apiPA.pa_error_on) : [],
      br_error_on: apiPA.br_error_on ? parseArrayField(apiPA.br_error_on) : [],
      stolen_bases: apiPA.br_stolen_bases ? parseArrayField(apiPA.br_stolen_bases) : [],
      hit_around_bases: apiPA.base_running_hit_around ? parseArrayField(apiPA.base_running_hit_around) : [],
      // Make sure base_running_hit_around is also directly stored if available
      base_running_hit_around: apiPA.base_running_hit_around ? parseArrayField(apiPA.base_running_hit_around) : [],
      br_stolen_bases: apiPA.br_stolen_bases ? parseArrayField(apiPA.br_stolen_bases) : [],
      
      // Quality indicators - ensure we're using Number() to convert undefined to 0
      qab: Number(apiPA.qab ?? 0),
      hard_hit: Number(apiPA.hard_hit ?? 0),
      slap: Number(apiPA.slap ?? 0),
      sac: Number(apiPA.sac ?? 0),
      
      // Optional fields
      wild_pitch: apiPA.wild_pitch !== undefined ? Number(apiPA.wild_pitch) : undefined,
      passed_ball: apiPA.passed_ball !== undefined ? Number(apiPA.passed_ball) : undefined,
      late_swings: apiPA.late_swings !== undefined ? Number(apiPA.late_swings) : 0,
      rbi: apiPA.rbi !== undefined ? Number(apiPA.rbi) : 0,
      pitch_count: Number(apiPA.pitch_count ?? 0),
      out: Number(apiPA.out ?? 0),
      out_at: Number(apiPA.out_at ?? 0),
      
      // ID fields if they came from the server
      order_number: Number(apiPA.order_number ?? 0),
      batter_seq_id: Number(apiPA.batter_seq_id ?? 0),
      inning_number: Number(apiPA.inning_number ?? 0),
      round: Number(apiPA.pa_round ?? 1),
    };
    
    return mappedData;
  };

  // Remove useEffect logging statements
  useEffect(() => {
    // Removed console.log
  }, [editedPA]);

  const handleInputChange = (field: string, value: any) => {
    setEditedPA(prev => {
      if (!prev) return null;
      
      // Create updated object with the new field value with explicit typing to fix linter errors
      const updated = { ...prev, pitch_count: prev.pitch_count || 0 } as ScoreBookEntry & { pitch_count: number };
      
      // Special handling for quality indicators to ensure they're properly set
      const qualityIndicators = ['qab', 'hard_hit', 'slap', 'sac'];
      if (qualityIndicators.includes(field)) {
        updated[field] = value === null || value === undefined ? 0 : Number(value);
        return updated;
      }
      
      // Apply validation for specific fields
      if (field === 'balls_before_play') {
        // Ensure balls_before_play stays between 0-3
        updated[field] = Math.min(3, Math.max(0, Number(value)));
      } else if (field === 'strikes_before_play') {
        // Ensure strikes_before_play stays between 0-2
        const newStrikesTotal = Math.min(2, Math.max(0, Number(value)));
        updated[field] = newStrikesTotal;
        
        // Calculate the current sum of individual strike types
        const currentWatching = updated.strikes_watching || 0;
        const currentSwinging = updated.strikes_swinging || 0;
        const currentUnsure = updated.strikes_unsure || 0;
        const currentTotal = currentWatching + currentSwinging + currentUnsure;
        
        // If the new total is different from the current sum of individual strike types,
        // we need to adjust the individual types
        if (newStrikesTotal !== currentTotal) {
          if (newStrikesTotal > currentTotal) {
            // If we're increasing total strikes, add the difference to strikes_unsure
            updated.strikes_unsure = currentUnsure + (newStrikesTotal - currentTotal);
          } else if (newStrikesTotal < currentTotal) {
            // If we're decreasing total strikes, remove from individual types in this order:
            // 1. strikes_unsure, 2. strikes_swinging, 3. strikes_watching
            const reduction = currentTotal - newStrikesTotal;
            let remainingReduction = reduction;
            
            // First reduce strikes_unsure
            if (currentUnsure > 0) {
              const unsureReduction = Math.min(currentUnsure, remainingReduction);
              updated.strikes_unsure = currentUnsure - unsureReduction;
              remainingReduction -= unsureReduction;
            }
            
            // If we still need to reduce more, reduce strikes_swinging
            if (remainingReduction > 0 && currentSwinging > 0) {
              const swingingReduction = Math.min(currentSwinging, remainingReduction);
              updated.strikes_swinging = currentSwinging - swingingReduction;
              remainingReduction -= swingingReduction;
            }
            
            // Finally, reduce strikes_watching if needed
            if (remainingReduction > 0 && currentWatching > 0) {
              const watchingReduction = Math.min(currentWatching, remainingReduction);
              updated.strikes_watching = currentWatching - watchingReduction;
            }
          }
        }
      } else {
        // For any other field, just set the value directly
        updated[field] = value;
      }
      
      // Always recalculate pitch_count
      const balls = updated.balls_before_play || 0;
      const watchingStrikes = updated.strikes_watching || 0;
      const swingingStrikes = updated.strikes_swinging || 0;
      const unsureStrikes = updated.strikes_unsure || 0;
      const ballsSwinging = updated.ball_swinging || 0;
      const fouls = updated.fouls || 0;
      
      // Base pitch count calculation
      let pitchCount = balls + watchingStrikes + swingingStrikes + unsureStrikes + ballsSwinging + fouls;
      
      // Add additional pitches based on the outcome
      if (updated.pa_why === 'BB' && balls < 3) {
        // For walks, add missing balls
        pitchCount += (3 - balls);
      } else if ((updated.pa_why === 'K' || updated.pa_why === 'KK') 
                && (watchingStrikes + swingingStrikes + unsureStrikes) < 2) {
        // For strikeouts, add missing strikes
        pitchCount += (2 - (watchingStrikes + swingingStrikes + unsureStrikes));
      } else if (updated.pa_why && updated.pa_why !== '') {
        // For all other outcomes, add 1 for the final pitch
        pitchCount += 1;
      }
      
      // Set the calculated pitch count
      updated.pitch_count = pitchCount;
      
      return updated;
    });
  };

  // Increment a counter field with validation for specific fields
  const incrementCounter = (field: string, value: number = 1) => {
    setEditedPA(prev => {
      if (!prev) return null;
      
      const updated = { ...prev };
      const currentValue = updated[field] || 0;
      let newValue = currentValue + value;
      
      // Apply specific validation rules for certain fields
      if (field === 'balls_before_play') {
        // Ensure balls_before_play never exceeds 3
        newValue = Math.min(3, newValue);
      } else if (field === 'strikes_before_play' || field === 'strikes_watching' || 
                 field === 'strikes_swinging' || field === 'strikes_unsure') {
        // Ensure no strike-related field makes strikes_before_play exceed 2
        const currentStrikes = updated.strikes_before_play || 0;
        if (field === 'strikes_before_play') {
          newValue = Math.min(2, newValue);
        } else {
          // For other strike types, calculate the new total and ensure it doesn't exceed 2
          const otherStrikeTypes = ['strikes_watching', 'strikes_swinging', 'strikes_unsure'];
          const totalStrikes = otherStrikeTypes.reduce((sum, type) => {
            if (type === field) {
              return sum + newValue; // Use the new value for the current field
            } else {
              return sum + (updated[type] || 0); // Use existing values for other fields
            }
          }, 0);
          
          // If incrementing would exceed 2 total strikes, don't increment
          if (totalStrikes > 2) {
            newValue = currentValue; // Keep the current value unchanged
          }
          
          // Update strikes_before_play to match the total
          updated.strikes_before_play = Math.min(2, totalStrikes);
        }
      } else if (field === 'fouls') {
        // Special handling for fouls - they should add to strikes_before_play if it's less than 2
        const currentStrikes = updated.strikes_before_play || 0;
        if (currentStrikes < 2) {
          // Only increment strikes_before_play once per foul until we reach 2 strikes
          updated.strikes_before_play = Math.min(2, currentStrikes + 1);
        }
      }
      
      // Set the updated value
      updated[field] = newValue;
      
      // If incrementing a strike type, ensure strikes_before_play reflects the total
      if (['strikes_watching', 'strikes_swinging', 'strikes_unsure'].includes(field)) {
        const watching = updated.strikes_watching || 0;
        const swinging = updated.strikes_swinging || 0;
        const unsure = updated.strikes_unsure || 0;
        
        // Calculate total strikes from individual types, capped at 2
        updated.strikes_before_play = Math.min(2, watching + swinging + unsure);
      }
      
      // Add additional pitches based on the outcome (pa_why)
      if (updated.pa_why) {
        if (updated.pa_why === 'BB') {
          // For walks (BB), ensure we count the final pitch that resulted in the walk
          // if it's not already included in balls_before_play
          if ((updated.balls_before_play || 0) < 3) {
            updated.pitch_count = (updated.pitch_count || 0) + (3 - (updated.balls_before_play || 0));
          }
        } else if (updated.pa_why === 'K' || updated.pa_why === 'KK') {
          // For strikeouts (K or KK), ensure we count the final pitch that resulted in the strikeout
          // if it's not already included in strikes_before_play
          if ((updated.strikes_before_play || 0) < 2) {
            updated.pitch_count = (updated.pitch_count || 0) + (2 - (updated.strikes_before_play || 0));
          }
        } else {
          // For all other outcomes, add 1 for the final pitch that resulted in the play
          updated.pitch_count = (updated.pitch_count || 0) + 1;
        }
      }
      
      return updated;
    });
  };

  // Decrement a counter field with validation
  const decrementCounter = (field: string, value: number = 1) => {
    setEditedPA(prev => {
      if (!prev) return null;
      
      const updated = { ...prev };
      const currentValue = updated[field] || 0;
      
      // Ensure we don't go below 0
      updated[field] = Math.max(0, currentValue - value);
      
      // Special handling for decreasing fouls
      if (field === 'fouls') {
        const watching = updated.strikes_watching || 0;
        const swinging = updated.strikes_swinging || 0;
        const unsure = updated.strikes_unsure || 0;
        
        // If there are no explicit strike types counted and strikes_before_play is > 0,
        // that means strikes_before_play was being driven by fouls
        if (watching === 0 && swinging === 0 && unsure === 0) {
          // Calculate how many fouls we had before, and how many now
          const oldFouls = currentValue;
          const newFouls = updated[field];
          
          // If we've decremented fouls to zero and there were previously fouls
          // we should also adjust strikes_before_play
          if (newFouls === 0 && oldFouls > 0) {
            // Decrement strikes_before_play, but only if there are no other strike types
            updated.strikes_before_play = Math.max(0, (updated.strikes_before_play || 0) - 1);
          }
        }
      }
      
      // If decrementing a strike type, ensure strikes_before_play reflects the total
      if (['strikes_watching', 'strikes_swinging', 'strikes_unsure'].includes(field)) {
        const watching = updated.strikes_watching || 0;
        const swinging = updated.strikes_swinging || 0;
        const unsure = updated.strikes_unsure || 0;
        
        // Calculate total strikes from individual types
        updated.strikes_before_play = watching + swinging + unsure;
      }
      
      // Calculate pitch_count as the sum of all pitch-related fields
      updated.pitch_count = (
        (updated.balls_before_play || 0) +
        (updated.strikes_watching || 0) +
        (updated.strikes_swinging || 0) +
        (updated.strikes_unsure || 0) +
        (updated.ball_swinging || 0) +
        (updated.fouls || 0)
      );
      
      // Add additional pitches based on the outcome (pa_why)
      if (updated.pa_why) {
        if (updated.pa_why === 'BB') {
          // For walks (BB), ensure we count the final pitch that resulted in the walk
          // if it's not already included in balls_before_play
          if ((updated.balls_before_play || 0) < 3) {
            updated.pitch_count = (updated.pitch_count || 0) + (3 - (updated.balls_before_play || 0));
          }
        } else if (updated.pa_why === 'K' || updated.pa_why === 'KK') {
          // For strikeouts (K or KK), ensure we count the final pitch that resulted in the strikeout
          // if it's not already included in strikes_before_play
          if ((updated.strikes_before_play || 0) < 2) {
            updated.pitch_count = (updated.pitch_count || 0) + (2 - (updated.strikes_before_play || 0));
          }
        } else {
          // For all other outcomes, add 1 for the final pitch that resulted in the play
          updated.pitch_count = (updated.pitch_count || 0) + 1;
        }
      }
      
      return updated;
    });
  };

  // Create a helper function to generate the API data structure
  const createApiData = (): ScoreBookEntryStructure | null => {
    if (!editedPA) return null;
    
    // Create a copy of the edited data to ensure we don't modify the original
    const paData = { 
      ...editedPA,
      rbi: (editedPA as any).rbi || 0,
      late_swings: (editedPA as any).late_swings || 0,
      fouls: (editedPA as any).fouls || 0,
      ball_swinging: (editedPA as any).ball_swinging || 0,
      pitch_count: (editedPA as any).pitch_count || 0,
      // Quality Indicators - use ?? to preserve 0 values explicitly
      qab: (editedPA as any).qab !== undefined ? Number((editedPA as any).qab) : 0,
      hard_hit: (editedPA as any).hard_hit !== undefined ? Number((editedPA as any).hard_hit) : 0,
      slap: (editedPA as any).slap !== undefined ? Number((editedPA as any).slap) : 0,
      sac: (editedPA as any).sac !== undefined ? Number((editedPA as any).sac) : 0,
      // Ensure pa_why is set
      pa_why: editedPA.pa_why || editedPA.why_base_reached || ''
    };
    
    // Helper function to safely parse array fields and convert to numbers
    const parseArrayField = (value: any, convertToNumbers: boolean = true): any[] => {
      if (!value) return [];
      
      // If it's already an array, return it directly
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
          
          // Single value if not empty
          if (value.trim() !== '') {
            const result = [value];
            return convertToNumbers ? result.map(item => Number(item)) : result;
          }
          
          // Empty string
          return [];
        } catch (e) {
          // If parsing fails and the string isn't empty, treat as a single value
          if (value.trim() !== '') {
            const result = [value];
            return convertToNumbers ? result.map(item => Number(item)) : result;
          }
          return [];
        }
      }
      
      return [];
    };
    
    // Convert string pa_error_on to array
    const parseErrorOn = (value: string | number[] | undefined): number[] => {
      if (!value) return [];
      
      // If it's already an array, return it directly
      if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? Number(item) : Number(item));
      }
      
      // Now we know value is a string since we've handled arrays above
      if (typeof value === 'string') {
        if (value.trim() === '') return [];
        
        // Try to convert to number directly
        const num = Number(value);
        if (!isNaN(num) && num > 0) return [num];
        
        // Otherwise try to parse as array
        return parseArrayField(value);
      }
      
      return [];
    };
    
    // Get the shared ID values
    const sharedGameId = paData.game_id || gameId || '';
    const sharedTeamId = paData.team_id || teamId || '';
    
    // Create the structured data for the backend API
    const apiData = {
      // Lineup and identification
      order_number: Number(paData.order_number) || 1,
      batter_seq_id: Number(paData.batter_seq_id) || nextBatterSeqId || 1,
      inning_number: Number(paData.inning_number) || inningNumber || 1,
      home_or_away: paData.home_or_away || homeOrAway || 'away',
      batting_order_position: Number(paData.order_number) || 1, // Same as order_number
      team_id: sharedTeamId,
      teamId: sharedTeamId, // Use the same value to avoid duplicates
      game_id: sharedGameId,
      gameId: sharedGameId, // Use the same value to avoid duplicates
      out: (typeof paData.pa_result === 'number' && paData.pa_result === 0) || 
           (typeof paData.pa_result === 'string' && paData.pa_result === '0') || 
           paData.bases_reached === '0' || 
           (paData.out_at && paData.out_at !== 0) ? 1 : 0,
      my_team_ha: myTeamHomeOrAway || 'away',
      // Pitcher and catcher stats
      wild_pitch: paData.wild_pitch !== undefined ? Number(paData.wild_pitch) : null,
      passed_ball: paData.passed_ball !== undefined ? Number(paData.passed_ball) : null,
      // One-off tracking
      rbi: paData.rbi !== undefined ? Number(paData.rbi) : null,
      late_swings: paData.late_swings !== undefined ? Number(paData.late_swings) : null,
      // Quality Indicators
      qab: paData.qab !== undefined ? Number(paData.qab) : 0,
      hard_hit: paData.hard_hit !== undefined ? Number(paData.hard_hit) : 0,
      slap: paData.slap !== undefined ? Number(paData.slap) : 0,
      sac: paData.sac !== undefined ? Number(paData.sac) : 0,
      // At the plate
      out_at: paData.out_at ? Number(paData.out_at) : 0,
      pa_why: paData.pa_why || '', // Primary field for plate appearance reason
      pa_result: Number(paData.pa_result || 0),
      hit_to: Number(paData.hit_to || paData.detailed_result || 0),
      // Fixed array fields parsing
      pa_error_on: Array.isArray(paData.pa_error_on) ? paData.pa_error_on : parseErrorOn(typeof paData.pa_error_on === 'string' ? paData.pa_error_on : ''),
      // Base running
      br_result: paData.br_result !== undefined ? Number(paData.br_result) : null,
      br_stolen_bases: Array.isArray(paData.stolen_bases) ? paData.stolen_bases : 
                        Array.isArray(paData.br_stolen_bases) ? paData.br_stolen_bases :
                        parseArrayField(paData.br_stolen_bases || paData.stolen_bases || []),
      // Explicitly use base_running_hit_around from the form state
      base_running_hit_around: Array.isArray(paData.base_running_hit_around) 
        ? paData.base_running_hit_around 
        : Array.isArray(paData.hit_around_bases)
        ? paData.hit_around_bases
        : [],
      br_error_on: Array.isArray(paData.br_error_on) ? paData.br_error_on : parseErrorOn(typeof paData.br_error_on === 'string' ? paData.br_error_on : ''),
      // Balls and strikes - EXPLICITLY ensure these are included
      pitch_count: Number(paData.pitch_count || 0),
      balls_before_play: Number(paData.balls_before_play || 0),
      strikes_before_play: Number(paData.strikes_before_play || 0),
      strikes_unsure: Number(paData.strikes_unsure || 0),
      strikes_watching: Number(paData.strikes_watching || 0),
      strikes_swinging: Number(paData.strikes_swinging || 0),
      ball_swinging: Number(paData.ball_swinging || 0),
      fouls: Number(paData.fouls || 0),
    };
    
    return apiData;
  };

  // Add a custom close handler to prevent team switching
  const handleClose = () => {
    // Clear modal state
    setShowJson(false);
    setJsonData('');
    setIsSaving(false);
    
    // Call the parent's onClose without any teamSide parameter to maintain the current tab
    onClose();
  };

  const handleSave = () => {
    // Get the API data using our helper function
    const apiData = createApiData();
    if (!apiData) return;
    
    // CRITICAL: Explicitly ensure these fields are included by setting them directly
    apiData.fouls = Number(editedPA?.fouls || 0);
    apiData.pitch_count = Number(editedPA?.pitch_count || 0);
    
    // Ensure gameId is properly set for the ScoreBookEntryStructure type
    apiData.gameId = apiData.game_id;
    
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
    
    // CRITICAL: Explicitly ensure all fields are included
    const allFields = {
      ...apiData,
      // Core fields
      fouls: Number(editedPA?.fouls || 0),
      pitch_count: Number(editedPA?.pitch_count || 0),
      ball_swinging: Number(editedPA?.ball_swinging || 0),
      
      // Quality indicators
      qab: Number(editedPA?.qab || 0),
      hard_hit: Number(editedPA?.hard_hit || 0),
      slap: Number(editedPA?.slap || 0),
      sac: Number(editedPA?.sac || 0),
      
      // Other fields
      wild_pitch: Number(editedPA?.wild_pitch || 0),
      passed_ball: Number(editedPA?.passed_ball || 0),
      late_swings: Number(editedPA?.late_swings || 0),
      rbi: Number(editedPA?.rbi || 0)
    };
    
    // Convert the data to a formatted JSON string
    const jsonString = JSON.stringify(allFields, null, 2);
    
    // Set the JSON data and show the display
    setJsonData(jsonString);
    setShowJson(true);
  };

  // Update the delete handler to safely handle undefined values
  const handleDelete = async () => {
    if (!pa || !pa.batter_seq_id) {
      console.error("❌ Cannot delete: Missing required plate appearance data");
      return;
    }
    
    // Confirm deletion with the user
    if (!confirm('Are you sure you want to delete this plate appearance? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Call the onDelete function passed from the parent with all required parameters
      // Use empty strings as safe fallbacks for required string parameters
      await onDelete({
        team_id: pa.team_id || teamId || "",
        game_id: pa.game_id || gameId || "",
        inning_number: pa.inning_number || inningNumber || 0,
        home_or_away: pa.home_or_away || homeOrAway || "",
        batter_seq_id: pa.batter_seq_id
      });
      
      // Close the modal after successful deletion using our custom close handler
      handleClose();
    } catch (error) {
      console.error("❌ Error in delete handler:", error);
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