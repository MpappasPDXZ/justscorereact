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
  bunt?: number;
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
  // CRITICAL required fields
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
  bunt: number;
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

const PlateAppearanceModal: React.FC<PlateAppearanceModalProps> = ({ 
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
}) => {
  const [editedPA, setEditedPA] = useState<ScoreBookEntry | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Add a ref to track if we've already fetched data for this PA
  const dataFetchedRef = React.useRef<{[key: string]: boolean}>({});

  // Define quality indicators array once for reuse
  const qualityIndicators = ['qab', 'hard_hit', 'slap', 'bunt', 'sac'];

  // Define array fields that should always be handled as lists of numbers
  const arrayFields = ["hit_around_bases", "stolen_bases", "pa_error_on", "br_error_on", "base_running_hit_around", "br_stolen_bases"];

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

  // Helper function to parse array fields from API
  const parseArrayField = (value: any, convertToNumbers: boolean = false): any[] => {
    if (!value) return [];
    
    // If it's already an array, convert values if needed and filter out zeros and invalid values
    if (Array.isArray(value)) {
      const processed = convertToNumbers 
        ? value.map(item => typeof item === 'string' ? Number(item) : Number(item))
        : value;
      
      // For numeric arrays, filter out zeros and NaN values
      return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
    }
    
    // If it's a number, return it as a single-item array (if it's valid)
    if (typeof value === 'number' && !isNaN(value) && value > 0) {
      return [value];
    }
    
    // If it's a string representation of an array, parse it
    if (typeof value === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const processed = convertToNumbers 
            ? parsed.map(item => typeof item === 'string' ? Number(item) : Number(item))
            : parsed;
          
          // For numeric arrays, filter out zeros and NaN values
          return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
        }
        
        // Handle string format like "['2', '3', '4']"
        if (value.includes('[') && value.includes(']')) {
          // Remove the outer quotes and brackets, then split by comma
          const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
          if (cleanedStr.trim() === '') return [];
          const items = cleanedStr.split(',').map(item => item.trim());
          const processed = convertToNumbers ? items.map(item => Number(item)) : items;
          
          // For numeric arrays, filter out zeros and NaN values
          return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
        }
        
        // Handle comma-separated values
        if (value.includes(',')) {
          const items = value.split(',').map(item => item.trim());
          const processed = convertToNumbers ? items.map(item => Number(item)) : items;
          
          // For numeric arrays, filter out zeros and NaN values
          return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
        }
        
        // Try to convert to number directly
        const num = Number(value);
        if (!isNaN(num) && num > 0) return [num];
        
        // Single value
        const result = [value];
        const processed = convertToNumbers ? result.map(item => Number(item)) : result;
        
        // For numeric arrays, filter out zeros and NaN values
        return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
      } catch (e) {
        // If parsing fails, return as a single-item array
        if (value.includes('[') && value.includes(']')) {
          const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
          if (cleanedStr.trim() === '') return [];
          const items = cleanedStr.split(',').map(item => item.trim());
          const processed = convertToNumbers ? items.map(item => Number(item)) : items;
          
          // For numeric arrays, filter out zeros and NaN values
          return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
        }
        
        // Try to convert to number directly
        const num = Number(value);
        if (!isNaN(num) && num > 0) return [num];
        
        const result = [value];
        const processed = convertToNumbers ? result.map(item => Number(item)) : result;
        
        // For numeric arrays, filter out zeros and NaN values
        return convertToNumbers ? processed.filter(item => typeof item === 'number' && item > 0 && !isNaN(item)) : processed;
      }
    }
    
    return [];
  };

  // Add a function to fetch player information from the lineup endpoint
  const fetchPlayerInfoFromLineup = async (orderNumber: number) => {
    try {
      // Ensure we have valid teamId and gameId
      if (!teamId || !gameId || !homeOrAway) {
        return null;
      }
      
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/games/${teamId}/${gameId}/${homeOrAway}/order_by_batter`;
      
      try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          return null;
        }
        
        const data = await response.json();
        // Check if we have the batting_order data
        if (data && data.batting_order) {
          // Convert order number to string since the keys are strings
          const orderNumberKey = String(orderNumber);
          
          // Check if the player exists for this order number
          if (data.batting_order[orderNumberKey]) {
            // Get the first inning number key (assuming it's the first one)
            const inningKeys = Object.keys(data.batting_order[orderNumberKey]);
            if (inningKeys.length > 0) {
              const inningKey = inningKeys[0];
              const player = data.batting_order[orderNumberKey][inningKey];
              
              return {
                jersey_number: player.jersey_number,
                player_name: player.player_name || player.display?.split(' - ')[1] || ''
              };
            }
          }
        }
        return null;
      } catch (fetchError) {
        return null;
      }
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
      
      // If still missing, try to fetch from the lineup endpoint
      if ((!updatedJerseyNumber || !updatedPlayerName) && pa.order_number) {
        // Use a ref to track if we've already fetched this player's info
        const playerKey = `${pa.order_number}_${pa.inning_number}`;
        if (!dataFetchedRef.current[playerKey]) {
          dataFetchedRef.current[playerKey] = true;
          
          // Fetch player info from the lineup endpoint
          fetchPlayerInfoFromLineup(pa.order_number)
            .then(playerInfo => {
              if (playerInfo) {
                setEditedPA(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    batter_jersey_number: playerInfo.jersey_number || prev.batter_jersey_number || '',
                    batter_name: playerInfo.player_name || prev.batter_name || ''
                  };
                });
              }
            })
            .catch(error => {
              console.error("Error loading player info, continuing without it:", error);
              // Continue with current data without player info
            });
        }
      }
      
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
        // Parse array fields from API as number arrays - use consistent approach for all
        pa_error_on: parseArrayField(pa.pa_error_on, true),
        br_error_on: parseArrayField(pa.br_error_on, true),
        br_stolen_bases: parseArrayField(pa.br_stolen_bases, true),
        base_running_hit_around: parseArrayField(pa.base_running_hit_around, true),
        // Ensure bunt field is properly set from the API - treat it like other quality indicators
        bunt: (pa as AdditionalFields).bunt !== undefined ? Number((pa as AdditionalFields).bunt) : 0,
        // Ensure sac field is properly set from the API
        sac: (pa as AdditionalFields).sac !== undefined ? Number((pa as AdditionalFields).sac) : 0
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
      
      // If pa_why is 'B', ensure bunt field is set to 1
      if (updatedPA.pa_why === 'B') {
        updatedPA.bunt = 1;
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
        batter_seq_id: seqId,  // Use the server-provided ID
        round: round,
        pa_round: round,
        team_id: teamId || '',
        game_id: gameId || '',
        inning_number: inningNumber || 0,
        home_or_away: homeOrAway || 'away',
        out_at: 0,
        pitch_count: 0,
        // Initialize our new fields
        qab: 0,
        hh: 0,
        hard_hit: 0,
        rbi: 0,
        // Add missing required properties
        pa_error_on: [],
        br_error_on: [],
        br_stolen_bases: [],
        base_running_hit_around: [],
        slap: 0,
        sac: 0,
        bunt: 0,
        // Initialize all other fields
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
        fouls: 0,
        ball_swinging: 0,
        base_running_stolen_base: 0,
        br_result: 0,
        late_swings: 0
      };
      
      setEditedPA(newPA);
    } else if (!isOpen) {
      // Reset the tracking when modal is closed
      dataFetchedRef.current = {};
    }
  }, [isOpen, paEditEndpoint, pa?.batter_seq_id]);

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
            // Extract array fields from the API response
            const extractedArrays: Record<string, any[]> = {};
            
            // Process each array field consistently
            arrayFields.forEach(field => {
              extractedArrays[field] = Array.isArray(data[field]) 
                ? [...data[field]] // Create a copy
                : [];
            });
            
            // Map the fields from the API response to the form state
            const mappedData = mapAPIResponseToFormState(data);
            
            if (mappedData) {
              setEditedPA(currentPA => {
                if (!currentPA) {
                  return null;
                }
                
                // Create a complete copy of the current PA
                const updatedPA = { ...currentPA };
                
                // Update with all mapped data
                Object.keys(mappedData).forEach(key => {
                  if (mappedData[key] !== undefined) {
                    updatedPA[key] = mappedData[key];
                  }
                });
                
                // Ensure all array fields are explicitly copied from the API data
                arrayFields.forEach(field => {
                  updatedPA[field] = extractedArrays[field];
                });
                
                // Also set the legacy fields for backward compatibility
                updatedPA.hit_around_bases = extractedArrays.base_running_hit_around;
                updatedPA.stolen_bases = extractedArrays.br_stolen_bases;
                
                // Explicitly copy count-related fields
                updatedPA.fouls = Number(data.fouls ?? 0);
                updatedPA.ball_swinging = Number(data.ball_swinging ?? 0);
                updatedPA.strikes_unsure = Number(data.strikes_unsure ?? 0);
                updatedPA.strikes_watching = Number(data.strikes_watching ?? 0);
                updatedPA.strikes_swinging = Number(data.strikes_swinging ?? 0);
                updatedPA.late_swings = Number(data.late_swings ?? 0);
                
                // Ensure all quality indicators are properly set with explicit handling
                updatedPA.qab = data.qab !== undefined ? Number(data.qab) : 0;
                updatedPA.hard_hit = data.hard_hit !== undefined ? Number(data.hard_hit) : 0;
                updatedPA.slap = data.slap !== undefined ? Number(data.slap) : 0;
                updatedPA.bunt = data.bunt !== undefined ? Number(data.bunt) : 0;
                updatedPA.sac = data.sac !== undefined ? Number(data.sac) : 0;
                
                // Ensure out_at is properly set
                updatedPA.out_at = data.out_at !== undefined ? Number(data.out_at) : 0;
                
                // Convert null to undefined for br_result if needed
                if (updatedPA.br_result === null) {
                  updatedPA.br_result = undefined;
                }
                
                return updatedPA;
              });
            }
          }
        }).catch(error => {
          console.error("Error fetching PA data:", error);
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

    // Map the API response fields to our form state
    return {
      team_id: apiPA.team_id,
      game_id: apiPA.game_id,
      team_choice: apiPA.team_choice,
      inning_number: apiPA.inning_number,
      round: apiPA.pa_round,
      batter_seq_id: apiPA.batter_seq_id,
      order_number: apiPA.order_number,
      pa_why: apiPA.pa_why,
      pa_result: apiPA.pa_result,
      hit_to: apiPA.hit_to,
      out: apiPA.out,
      out_at: apiPA.out_at,
      balls_before_play: apiPA.balls_before_play,
      strikes_before_play: apiPA.strikes_before_play,
      pitch_count: apiPA.pitch_count,
      strikes_unsure: apiPA.strikes_unsure,
      strikes_watching: apiPA.strikes_watching,
      strikes_swinging: apiPA.strikes_swinging,
      ball_swinging: apiPA.ball_swinging,
      fouls: apiPA.fouls,
      hard_hit: apiPA.hard_hit,
      late_swings: apiPA.late_swings,
      slap: apiPA.slap,
      bunt: apiPA.bunt,
      qab: apiPA.qab,
      rbi: apiPA.rbi,
      br_result: apiPA.br_result,
      wild_pitch: apiPA.wild_pitch,
      passed_ball: apiPA.passed_ball,
      sac: apiPA.sac,
      br_stolen_bases: apiPA.br_stolen_bases || [],
      base_running_hit_around: apiPA.base_running_hit_around || [],
      pa_error_on: apiPA.pa_error_on || [],
      br_error_on: apiPA.br_error_on || []
    };
  };

  const handleInputChange = (field: string, value: any, fromFoul?: boolean) => {
    setEditedPA(prev => {
      if (!prev) return null;
      
      // Create updated object with the new field value with explicit typing to fix linter errors
      const updated = { ...prev, pitch_count: prev.pitch_count || 0 } as ScoreBookEntry & { pitch_count: number };
      
      // Special handling for array fields to ensure they're always stored as arrays
      const arrayFields = ["hit_around_bases", "stolen_bases", "pa_error_on", "br_error_on", "base_running_hit_around", "br_stolen_bases"];
      if (arrayFields.includes(field)) {
        // Ensure value is always an array
        if (!value) {
          updated[field] = [];
        } else if (Array.isArray(value)) {
          updated[field] = value;
        } else if (typeof value === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              updated[field] = parsed;
            } else {
              // Handle string format like "['2', '3', '4']"
              if (value.includes('[') && value.includes(']')) {
                const cleanedStr = value.replace(/^\[|\]$/g, '').replace(/'/g, '').replace(/"/g, '');
                if (cleanedStr.trim() === '') {
                  updated[field] = [];
                } else {
                  updated[field] = cleanedStr.split(',').map(item => Number(item.trim()));
                }
              } else if (value.includes(',')) {
                // Handle comma-separated values
                updated[field] = value.split(',').map(item => Number(item.trim()));
              } else if (value.trim() !== '') {
                // Single value
                updated[field] = [Number(value.trim())];
              } else {
                updated[field] = [];
              }
            }
          } catch (e) {
            // If parsing fails, try simpler methods
            if (value.includes(',')) {
              updated[field] = value.split(',').map(item => Number(item.trim()));
            } else if (value.trim() !== '') {
              updated[field] = [Number(value.trim())];
            } else {
              updated[field] = [];
            }
          }
        } else {
          // Single value
          updated[field] = [Number(value)];
        }
        
        // Update br_result if we're changing an array field that affects it
        if (field === 'base_running_hit_around' || field === 'stolen_bases') {
          updateBrResult(updated);
        }
        
        // Ensure base_running_hit_around doesn't include any bases that are in br_stolen_bases
        syncBaseRunningHitAroundWithStolenBases(updated);
        
        // Hide base 2 in both arrays when pa_result is 2
        hideBase2WhenPaResultIs2(updated);
        
        return updated;
      }
      
      // Special handling for quality indicators to ensure they're properly set
      const qualityIndicators = ['qab', 'hard_hit', 'slap', 'bunt', 'sac'];
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
        // we need to adjust the individual types, UNLESS this came from a foul ball
        if (newStrikesTotal !== currentTotal && !fromFoul) {
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
      } else if (field === 'pa_result') {
        // Update pa_result
        updated[field] = Number(value);
        
        // Hide base 2 in both arrays when pa_result is 2
        hideBase2WhenPaResultIs2(updated);
        
        // Update br_result based on the new pa_result
        updateBrResult(updated);
      } else if (field === 'br_result') {
        // Update br_result
        updated[field] = Number(value);
        
        // If br_result is 4, automatically set base_running_hit_around for bases between pa_result and br_result
        if (Number(value) === 4) {
          const paResult = updated.pa_result || 0;
          
          // Only add bases if pa_result is less than br_result
          if (paResult < 4) {
            // Create an array of bases between pa_result and br_result (inclusive)
            const basesToAdd = [];
            for (let base = paResult + 1; base <= 4; base++) {
              basesToAdd.push(base);
            }
            
            // Set base_running_hit_around to include these bases
            if (basesToAdd.length > 0) {
              // Ensure base_running_hit_around is initialized as an array
              if (!Array.isArray(updated.base_running_hit_around)) {
                updated.base_running_hit_around = [];
              }
              
              // Add each base to base_running_hit_around if it's not already there
              // and not in br_stolen_bases
              basesToAdd.forEach(base => {
                // Check if we already have this base in either array
                const inHitAround = updated.base_running_hit_around?.includes(base);
                const inStolenBases = Array.isArray(updated.br_stolen_bases) && 
                                     updated.br_stolen_bases.includes(base);
                
                // Only add to base_running_hit_around if not already there and not in stolen bases
                if (!inHitAround && !inStolenBases) {
                  updated.base_running_hit_around?.push(base);
                }
              });
              
              // Also update the legacy field for backward compatibility
              updated.hit_around_bases = [...(updated.base_running_hit_around || [])];
            }
          }
          
          // Ensure base_running_hit_around doesn't include any bases that are in br_stolen_bases
          syncBaseRunningHitAroundWithStolenBases(updated);
          
          // Hide base 2 in both arrays when pa_result is 2
          hideBase2WhenPaResultIs2(updated);
        }
      } else if (field === 'out_at') {
        // Special handling for out_at field
        if (value === 0) {
          // If value is 0, treat it as a reset of the field
          updated[field] = 0;
          
          // Since out_at is being cleared, we might need to adjust the 'out' field
          // Only change 'out' to 0 if pa_result > 0 (player reached base)
          if (updated.pa_result > 0) {
            updated.out = 0;
          }
        } else {
          // For all other values, set normally
          updated[field] = Number(value);
          
          // If setting out_at to a base, also set 'out' to 1
          updated.out = 1;
        }
      } else {
        // For any other field, just set the value directly
        updated[field] = value;
      }
      
      // Update strikes_before_play when individual strike types change
      if (field === 'strikes_watching' || field === 'strikes_swinging' || field === 'strikes_unsure') {
        const watchingStrikes = updated.strikes_watching || 0;
        const swingingStrikes = updated.strikes_swinging || 0;
        const unsureStrikes = updated.strikes_unsure || 0;
        
        // Calculate the total number of strikes (limit to maximum of 2)
        const totalStrikes = Math.min(2, watchingStrikes + swingingStrikes + unsureStrikes);
        
        // Update strikes_before_play if it's different from the calculated total
        if (updated.strikes_before_play !== totalStrikes) {
          updated.strikes_before_play = totalStrikes;
        }
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

  // Helper function to update br_result based on the maximum value among pa_result, stolen_bases, and base_running_hit_around
  const updateBrResult = (updatedPA: any) => {
    const paResult = updatedPA.pa_result || 0;
    const maxStolenBase = Array.isArray(updatedPA.br_stolen_bases) ? Math.max(...updatedPA.br_stolen_bases, 0) : 0;
    const maxHitAroundBase = Array.isArray(updatedPA.base_running_hit_around) ? Math.max(...updatedPA.base_running_hit_around, 0) : 0;
    
    // Set br_result to the maximum of all values
    updatedPA.br_result = Math.max(paResult, maxStolenBase, maxHitAroundBase);
  };

  // Helper function to ensure base_running_hit_around doesn't include any bases that are in br_stolen_bases
  const syncBaseRunningHitAroundWithStolenBases = (updatedPA: any) => {
    // Ensure both arrays exist
    if (!Array.isArray(updatedPA.br_stolen_bases)) {
      updatedPA.br_stolen_bases = [];
    }
    
    if (!Array.isArray(updatedPA.base_running_hit_around)) {
      updatedPA.base_running_hit_around = [];
    }
    
    // Remove any bases from base_running_hit_around that are in br_stolen_bases
    updatedPA.base_running_hit_around = updatedPA.base_running_hit_around.filter(
      (base: number) => !updatedPA.br_stolen_bases.includes(base)
    );
    
    // Also update the legacy field for backward compatibility
    updatedPA.hit_around_bases = [...updatedPA.base_running_hit_around];
    
    // If pa_result < br_result and br_result is 4, ensure all bases between pa_result and br_result
    // are either in br_stolen_bases or base_running_hit_around
    const paResult = updatedPA.pa_result || 0;
    const brResult = updatedPA.br_result || 0;
    
    if (paResult < brResult && brResult === 4) {
      // Go through all bases between pa_result and br_result
      for (let base = paResult + 1; base <= brResult; base++) {
        // Skip base 2 if pa_result is 2 (special case)
        if (paResult === 2 && base === 2) {
          continue;
        }
        
        // Check if the base is accounted for in either array
        const inStolenBases = updatedPA.br_stolen_bases.includes(base);
        const inHitAround = updatedPA.base_running_hit_around.includes(base);
        
        // If not in either array, add to base_running_hit_around
        if (!inStolenBases && !inHitAround) {
          updatedPA.base_running_hit_around.push(base);
        }
      }
      
      // Also update the legacy field for backward compatibility
      updatedPA.hit_around_bases = [...updatedPA.base_running_hit_around];
    }
  };

  // Helper function to hide base 2 in both br_stolen_bases and base_running_hit_around when pa_result is 2
  const hideBase2WhenPaResultIs2 = (updatedPA: any) => {
    // If pa_result is 2, hide base 2 in both arrays
    if (updatedPA.pa_result === 2) {
      // Remove base 2 from br_stolen_bases if it exists
      if (Array.isArray(updatedPA.br_stolen_bases)) {
        updatedPA.br_stolen_bases = updatedPA.br_stolen_bases.filter((base: number) => base !== 2);
      }
      
      // Remove base 2 from base_running_hit_around if it exists
      if (Array.isArray(updatedPA.base_running_hit_around)) {
        updatedPA.base_running_hit_around = updatedPA.base_running_hit_around.filter((base: number) => base !== 2);
      }
      
      // Also update the legacy field for backward compatibility
      if (Array.isArray(updatedPA.base_running_hit_around)) {
        updatedPA.hit_around_bases = [...updatedPA.base_running_hit_around];
      }
    }
  };

  // Helper function to check if a base should be disabled based on pa_result
  const isBaseDisabled = (base: number, paResult: number) => {
    // If pa_result is 2, disable base 2
    if (paResult === 2 && base === 2) {
      return true;
    }
    return false;
  };

  // Helper function to increment a counter
  const incrementCounter = (field: string) => {
    if (!editedPA) return;
    const currentValue = editedPA[field] || 0;
    handleInputChange(field, currentValue + 1);
  };

  // Helper function to decrement a counter
  const decrementCounter = (field: string) => {
    if (!editedPA) return;
    const currentValue = editedPA[field] || 0;
    if (currentValue > 0) {
      handleInputChange(field, currentValue - 1);
    }
  };

  // Create a helper function to generate the API data structure
  const createApiData = () => {
    if (!editedPA) return null;

    // Calculate if this is an out based on pa_result or out_at
    const isOut = (editedPA.pa_result === 0 || (editedPA.out_at && editedPA.out_at !== 0)) ? 1 : 0;

    // Create the API data object with all necessary fields
    const apiData = {
      team_id: editedPA.team_id || teamId,
      game_id: editedPA.game_id || gameId,
      team_choice: editedPA.home_or_away || homeOrAway,
      inning_number: editedPA.inning_number || inningNumber,
      round: editedPA.round || 1,
      batter_seq_id: editedPA.batter_seq_id,
      order_number: editedPA.order_number,
      pa_why: editedPA.pa_why || '',
      pa_result: Number(editedPA.pa_result || 0),
      hit_to: Number(editedPA.hit_to || 0),
      out: isOut,
      out_at: editedPA.out_at !== undefined ? Number(editedPA.out_at) : 0,
      balls_before_play: Number(editedPA.balls_before_play || 0),
      strikes_before_play: Number(editedPA.strikes_before_play || 0),
      pitch_count: Number(editedPA.pitch_count || 0),
      strikes_unsure: Number(editedPA.strikes_unsure || 0),
      strikes_watching: Number(editedPA.strikes_watching || 0),
      strikes_swinging: Number(editedPA.strikes_swinging || 0),
      ball_swinging: Number(editedPA.ball_swinging || 0),
      fouls: Number(editedPA.fouls || 0),
      hard_hit: Number(editedPA.hard_hit || 0),
      late_swings: Number(editedPA.late_swings || 0),
      slap: Number(editedPA.slap || 0),
      bunt: Number(editedPA.bunt || 0),
      qab: Number(editedPA.qab || 0),
      rbi: Number(editedPA.rbi || 0),
      br_result: Number(editedPA.br_result || 0),
      wild_pitch: Number(editedPA.wild_pitch || 0),
      passed_ball: Number(editedPA.passed_ball || 0),
      sac: Number(editedPA.sac || 0),
      br_stolen_bases: editedPA.br_stolen_bases || [],
      base_running_hit_around: editedPA.base_running_hit_around || [],
      pa_error_on: editedPA.pa_error_on || [],
      br_error_on: editedPA.br_error_on || []
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
    
    // Calculate if this is an out based on pa_result and out_at
    const isOut = (editedPA?.pa_result === 0 || (editedPA?.out_at && editedPA?.out_at !== 0)) ? 1 : 0;
    
    // CRITICAL: Explicitly ensure all fields are included
    const allFields = {
      ...apiData,
      // Core fields
      fouls: Number(editedPA?.fouls || 0),
      pitch_count: Number(editedPA?.pitch_count || 0),
      ball_swinging: Number(editedPA?.ball_swinging || 0),
      
      // Required fields for the backend
      out: isOut,
      my_team_ha: myTeamHomeOrAway || 'away',
      
      // Quality indicators - explicitly include each one individually
      qab: editedPA?.qab !== undefined ? Number(editedPA.qab) : 0,
      hard_hit: editedPA?.hard_hit !== undefined ? Number(editedPA.hard_hit) : 0,
      slap: editedPA?.slap !== undefined ? Number(editedPA.slap) : 0,
      bunt: editedPA?.bunt !== undefined ? Number(editedPA.bunt) : 0,
      sac: editedPA?.sac !== undefined ? Number(editedPA.sac) : 0,
      
      // Explicitly include out_at to ensure it appears in the output
      out_at: editedPA?.out_at !== undefined ? Number(editedPA.out_at) : 0,
      
      // Array fields - ensure all array fields are included
      pa_error_on: Array.isArray(editedPA?.pa_error_on) ? editedPA.pa_error_on : [],
      br_error_on: Array.isArray(editedPA?.br_error_on) ? editedPA.br_error_on : [],
      br_stolen_bases: Array.isArray(editedPA?.br_stolen_bases) ? editedPA.br_stolen_bases : [],
      base_running_hit_around: Array.isArray(editedPA?.base_running_hit_around) ? editedPA.base_running_hit_around : [],
      
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
      return;
    }
    
    // Create a custom confirmation dialog that's more mobile-friendly
    const confirmDelete = () => {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        dialog.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Plate Appearance</h3>
            <p class="text-sm text-gray-500 mb-6">Are you sure you want to delete this plate appearance? This action cannot be undone.</p>
            <div class="flex justify-end space-x-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Delete
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const cancelBtn = dialog.querySelector('button:first-of-type');
        const deleteBtn = dialog.querySelector('button:last-of-type');
        
        const cleanup = () => {
          document.body.removeChild(dialog);
        };
        
        cancelBtn?.addEventListener('click', () => {
          cleanup();
          resolve(false);
        });
        
        deleteBtn?.addEventListener('click', () => {
          cleanup();
          resolve(true);
        });
      });
    };
    
    const shouldDelete = await confirmDelete();
    if (!shouldDelete) return;
    
    try {
      // Call the onDelete function passed from the parent with all required parameters
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
      alert("Failed to delete plate appearance. Please try again.");
    }
  };

  const handleArrayFieldChange = (field: string, value: number) => {
    setEditedPA(currentPA => {
      if (!currentPA) return null;
      
      // Create a complete copy of the current PA
      const updatedPA = { ...currentPA };
      
      // Check if the base should be disabled based on pa_result
      if (isBaseDisabled(value, updatedPA.pa_result || 0)) {
        // If the base should be disabled, don't add it
        return updatedPA;
      }
      
      // Ensure the field is initialized as an array
      if (!Array.isArray(updatedPA[field])) {
        updatedPA[field] = [];
      }
      
      // Handle the array field change
      const currentArray = [...updatedPA[field]];
      const index = currentArray.indexOf(value);
      
      if (index === -1) {
        // Add the value if it's not already in the array
        currentArray.push(value);
        
        // Special handling for base_running_hit_around
        if (field === 'base_running_hit_around') {
          // Remove this base from br_stolen_bases if it exists there
          if (Array.isArray(updatedPA.br_stolen_bases)) {
            updatedPA.br_stolen_bases = updatedPA.br_stolen_bases.filter(base => base !== value);
          }
        }
        
        // Special handling for br_stolen_bases
        if (field === 'br_stolen_bases') {
          // IMMEDIATELY remove this base from base_running_hit_around if it exists there
          if (Array.isArray(updatedPA.base_running_hit_around)) {
            // Remove the base from base_running_hit_around
            updatedPA.base_running_hit_around = updatedPA.base_running_hit_around.filter(base => base !== value);
            
            // Also update the legacy field for backward compatibility
            updatedPA.hit_around_bases = [...updatedPA.base_running_hit_around];
          }
        }
      } else {
        // Remove the value if it's already in the array
        currentArray.splice(index, 1);
        
        // Special handling for base_running_hit_around
        if (field === 'base_running_hit_around') {
          // Also update the legacy field for backward compatibility
          updatedPA.hit_around_bases = [...currentArray];
        }
        
        // Special handling when removing a stolen base
        // If br_result is 4 and pa_result < 4, we need to put the base back into base_running_hit_around
        if (field === 'br_stolen_bases') {
          const paResult = updatedPA.pa_result || 0;
          const brResult = updatedPA.br_result || 0;
          
          if (paResult < 4 && brResult === 4) {
            // Check if the base is between pa_result and br_result
            if (value > paResult && value <= brResult) {
              // Ensure base_running_hit_around is initialized as an array
              if (!Array.isArray(updatedPA.base_running_hit_around)) {
                updatedPA.base_running_hit_around = [];
              }
              
              // Check if the base is not already in base_running_hit_around
              if (!updatedPA.base_running_hit_around.includes(value)) {
                // Add the base to base_running_hit_around
                updatedPA.base_running_hit_around.push(value);
                // Sort the array for consistency
                updatedPA.base_running_hit_around.sort((a: number, b: number) => a - b);
                // Update the legacy field
                updatedPA.hit_around_bases = [...updatedPA.base_running_hit_around];
              }
            }
          }
        }
      }
      
      // Update the field with the new array
      updatedPA[field] = currentArray;
      
      // Also update the legacy fields for backward compatibility
      if (field === 'base_running_hit_around') {
        updatedPA.hit_around_bases = currentArray;
      } else if (field === 'br_stolen_bases') {
        updatedPA.stolen_bases = currentArray;
      }
      
      syncBaseRunningHitAroundWithStolenBases(updatedPA);
      // Hide base 2 in both arrays when pa_result is 2
      hideBase2WhenPaResultIs2(updatedPA);
      
      // Update br_result based on the maximum value among pa_result, stolen_bases, and base_running_hit_around
      updateBrResult(updatedPA);
      
      return updatedPA;
    });
  };

  if (!isOpen) return null;
  if (!editedPA) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full h-full max-h-screen overflow-y-auto">
        {/* Mobile-friendly thin header with responsive wrapping */}
        <div className="bg-gray-100 py-1 px-3 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 w-full">
            <div className="flex items-center">
              <span className="font-bold">PA:</span>
              <span>{editedPA?.inning_number || '-'}</span>
            </div>
            <span className="mx-1">-</span>
            <div className="flex items-center">
              <span className="font-medium">Inning:</span>
              <span>{editedPA?.inning_number || '-'}</span>
            </div>
            <span className="mx-1">-</span>
            <div className="flex items-center">
              <span className="font-medium">Side:</span>
              <span>{editedPA?.home_or_away || homeOrAway || '-'}</span>
            </div>
            <span className="mx-1">-</span>
            <div className="flex items-center">
              <span className="font-medium">Order:</span>
              <span>{editedPA?.order_number || '-'}</span>
            </div>
            <span className="mx-1">-</span>
            <div className="flex items-center">
              <span className="font-medium">Seq.:</span>
              <span>{editedPA?.batter_seq_id || '-'}</span>
            </div>
            <span className="mx-1">-</span>
            <div className="flex items-center">
              <span className="font-medium">#:</span>
              <span className="truncate max-w-[120px]">{editedPA?.batter_jersey_number || '-'}</span>
            </div>
            <span className="mx-1">-</span>
            <div className="flex items-center">
              <span className="font-medium">Name:</span>
              <span className="truncate max-w-[120px]">{editedPA?.batter_name || '-'}</span>
            </div>
          </div>
        </div>
        
        <div className="px-3">
          <div className="flex justify-between items-center mb-2 mt-2">
            <h2 className="text-xl font-semibold">
              Edit
            </h2>
            <div className="flex space-x-2">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1.5 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={!editedPA?.pa_why}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Save
              </button>
              <button 
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={() => onClose()}
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left side: Form */}
            <div className="flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="w-full">
                  <CountSection 
                    editedPA={editedPA}
                    incrementCounter={incrementCounter}
                    decrementCounter={decrementCounter}
                    handleInputChange={handleInputChange}
                  />
                </div>
                
                <div className="w-full">
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
            <div className={`transition-all duration-300 ${showJson ? 'lg:w-80 w-full' : 'w-0 hidden'}`}>
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
        
        {/* Footer with buttons */}
        <div className="flex justify-between items-center mt-2 p-1">
          <div className="flex space-x-2">
            <button
              onClick={() => onClose()}
              className="px-3 py-1.5 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            {/* Only show delete button for existing plate appearances (with a batter_seq_id) */}
            {editedPA?.batter_seq_id && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm border border-red-500 text-red-600 rounded hover:bg-red-50 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={!editedPA?.pa_why}
              className="px-3 py-1.5 text-sm border border-emerald-500 text-emerald-600 rounded hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              Save
            </button>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  displayJsonData();
                  setShowJson(!showJson);
                }}
                className="px-3 py-1.5 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-100"
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlateAppearanceModal; 