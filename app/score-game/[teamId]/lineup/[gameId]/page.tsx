"use client"

import React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LineupTable, { Player } from "./components/LineupTable";
import InningSelector from "./components/InningSelector";
import AddPlayerDropdown, { RosterPlayer } from "./components/AddPlayerDropdown";
import AddPlayerForm, { PlayerFormInput } from "./components/AddPlayerForm";

interface Game {
  away_team_name: string;
  coach: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  field_location: string;
  field_name: string;
  field_temperature: string;
  field_type: string;
  game_id: string;
  game_status: string;
  my_team_ha: string;
  user_team: string;
}

// First, let's create a helper function to determine if this is the first SUB in the sorted lineup
const isFirstSub = (player: Player, index: number, sortedLineup: Player[]) => {
  // Check if this player has order_number 0
  if (player.order_number === 0) {
    // If it's the first player in the array, it's the first SUB
    if (index === 0) return true;
    
    // If the previous player doesn't have order_number 0, this is the first SUB
    const prevPlayer = sortedLineup[index - 1];
    return prevPlayer.order_number !== 0;
  }
  return false;
};

// Helper function to create default players
const getDefaultPlayers = () => {
  return [
    { jersey_number: "1", player_name: "Player 1" },
    { jersey_number: "2", player_name: "Player 2" },
    { jersey_number: "3", player_name: "Player 3" },
    { jersey_number: "4", player_name: "Player 4" },
    { jersey_number: "5", player_name: "Player 5" },
    { jersey_number: "6", player_name: "Player 6" },
    { jersey_number: "7", player_name: "Player 7" },
    { jersey_number: "8", player_name: "Player 8" },
    { jersey_number: "9", player_name: "Player 9" },
  ];
};

// Helper function to process lineup data
const processLineupData = (data: any, homeOrAway: 'home' | 'away'): Player[] => {
  let lineupData: Player[] = [];
  
  if (data && data.innings_data) {
    Object.entries(data.innings_data).forEach(([inning, players]) => {
      const inningNumber = parseInt(inning);
      
      // Check if players is an array before processing
      if (Array.isArray(players)) {
        (players as any[]).forEach(player => {
          lineupData.push({
            jersey_number: player.jersey_number,
            name: player.player_name,
            order_number: player.order_number,
            inning_number: inningNumber,
            home_or_away: homeOrAway
          });
        });
      } else {
        console.warn(`${homeOrAway} innings_data[${inning}] is not an array`);
      }
    });
  } else {
    console.warn(`${homeOrAway} data structure is invalid or missing innings_data`);
  }
  
  return lineupData;
};

export default function GameLineup() {
  const params = useParams();
  const router = useRouter();
  const [homeLineup, setHomeLineup] = useState<Player[]>([]);
  const [awayLineup, setAwayLineup] = useState<Player[]>([]);
  const [myTeamHa, setMyTeamHa] = useState<'home' | 'away'>('home');
  const [currentInning, setCurrentInning] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('away');
  const [lineupChanged, setLineupChanged] = useState(false);
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [previousInningLineup, setPreviousInningLineup] = useState<Player[]>([]);
  const [lineupOperationInProgress, setLineupOperationInProgress] = useState(false);
  
  // Default 12 innings with ability to add more
  const [availableInnings, setAvailableInnings] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [maxInning, setMaxInning] = useState<number>(12);
  
  // Update the state to include the active players separately
  const [activePlayersList, setActivePlayersList] = useState<{
    jersey_number: string;
    player_name: string;
    position: string;
  }[]>([]);
  
  // Fetch my_team_ha value
  const fetchMyTeamHa = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/${params.teamId}/${params.gameId}/my_team_ha`);
      
      if (response.ok) {
        // Get the raw response text
        const rawResponse = await response.text();
        console.log("Raw my_team_ha response:", rawResponse);
        
        // Standardize and clean response
        const cleanResponse = rawResponse.trim().toLowerCase();
        
        // Parse the response
        if (cleanResponse === 'away' || cleanResponse.includes('"away"') || cleanResponse.includes("'away'")) {
          console.log("Setting my_team_ha to 'away'");
          setMyTeamHa('away');
        } else if (cleanResponse === 'home' || cleanResponse.includes('"home"') || cleanResponse.includes("'home'")) {
          console.log("Setting my_team_ha to 'home'");
          setMyTeamHa('home');
        } else {
          // Try to parse JSON if it's a JSON string
          try {
            const jsonResponse = JSON.parse(rawResponse);
            if (jsonResponse === 'away' || (typeof jsonResponse === 'object' && jsonResponse.value === 'away')) {
              console.log("Parsed JSON: Setting my_team_ha to 'away'");
              setMyTeamHa('away');
              return;
            } else if (jsonResponse === 'home' || (typeof jsonResponse === 'object' && jsonResponse.value === 'home')) {
              console.log("Parsed JSON: Setting my_team_ha to 'home'");
              setMyTeamHa('home');
              return;
            }
          } catch (jsonError) {
            // Not a valid JSON, continue with fallback
            console.warn("Response is not valid JSON:", jsonError);
          }
          
          // If we can't determine, use home as a fallback
          console.warn("Could not determine my_team_ha from response, using 'home' as fallback");
          setMyTeamHa('home');
        }
      } else {
        console.error("Error fetching my_team_ha:", response.status, response.statusText);
        // Fallback to 'home' if API call fails
        setMyTeamHa('home');
      }
    } catch (error) {
      console.error("Error in fetchMyTeamHa:", error);
      // Fallback to 'home' if there's an exception
      setMyTeamHa('home');
    }
  };
  
  // Function to copy lineup from previous inning to current inning
  const handleCopyPreviousInning = () => {
    if (currentInning <= 1) return; // Can't copy if we're on inning 1
    
    setLineupOperationInProgress(true);
    const prevInning = currentInning - 1;
    let madeChanges = false;
    
    console.log(`Copying lineup from inning ${prevInning} to inning ${currentInning}`);
    
    // Copy home lineup
    const prevInningHomePlayers = homeLineup.filter(p => p.inning_number === prevInning);
    if (prevInningHomePlayers.length > 0) {
      // Only copy if current inning doesn't already have players
      const currentInningHomePlayers = homeLineup.filter(p => p.inning_number === currentInning);
      
      if (currentInningHomePlayers.length === 0) {
        console.log(`Copying ${prevInningHomePlayers.length} home players from inning ${prevInning} to ${currentInning}`);
        
        // Create copies of players from previous inning with the new inning number
        const newInningHomePlayers = prevInningHomePlayers.map(player => ({
          ...player,
          inning_number: currentInning
        }));
        
        // Add these new players to the lineup
        setHomeLineup([...homeLineup, ...newInningHomePlayers]);
        madeChanges = true;
      }
    }
    
    // Copy away lineup
    const prevInningAwayPlayers = awayLineup.filter(p => p.inning_number === prevInning);
    if (prevInningAwayPlayers.length > 0) {
      // Only copy if current inning doesn't already have players
      const currentInningAwayPlayers = awayLineup.filter(p => p.inning_number === currentInning);
      
      if (currentInningAwayPlayers.length === 0) {
        console.log(`Copying ${prevInningAwayPlayers.length} away players from inning ${prevInning} to ${currentInning}`);
        
        // Create copies of players from previous inning with the new inning number
        const newInningAwayPlayers = prevInningAwayPlayers.map(player => ({
          ...player,
          inning_number: currentInning
        }));
        
        // Add these new players to the lineup
        setAwayLineup([...awayLineup, ...newInningAwayPlayers]);
        madeChanges = true;
      }
    }
    
    if (madeChanges) {
      console.log(`Successfully copied lineup data from inning ${prevInning} to inning ${currentInning}`);
      setLineupChanged(true);
    } else {
      // If current inning already has players
      const hasHomePlayers = homeLineup.some(p => p.inning_number === currentInning);
      const hasAwayPlayers = awayLineup.some(p => p.inning_number === currentInning);
      
      if (hasHomePlayers || hasAwayPlayers) {
        console.log(`Inning ${currentInning} already has players. Not copying from inning ${prevInning}.`);
      } else {
        console.log(`No players found in inning ${prevInning} to copy.`);
      }
    }
    
    // Reset the operation flag after copying
    setTimeout(() => {
      setLineupOperationInProgress(false);
    }, 300);
  };
  
  // Add a new inning
  const handleAddInning = () => {
    // Calculate the next inning number
    const nextInning = Math.max(...availableInnings) + 1;
    console.log(`Adding new inning ${nextInning}`);
    
    // First create an empty inning in the lineup (so the UI shows it right away)
    const emptyInningPlaceholder: Player[] = [];
    
    // Set the lineup for this inning with an empty array - this makes the inning selectable
    if (activeTab === 'home') {
      setHomeLineup(prev => [...prev, ...emptyInningPlaceholder]);
    } else {
      setAwayLineup(prev => [...prev, ...emptyInningPlaceholder]);
    }
    
    // Update available innings to include the new one
    setAvailableInnings(prev => {
      if (prev.includes(nextInning)) {
        return prev;
      }
      return [...prev, nextInning].sort((a, b) => a - b);
    });
    
    // Navigate to the new inning
    setCurrentInning(nextInning);
    
    // Mark as changed so the user knows to save
    // Even though it's empty, it's a structural change
    setLineupChanged(true);
  };
  
  // Fetch lineups
  const fetchLineups = async () => {
    setLoading(true);
    try {
      // Log the URLs we're fetching for debugging purposes
      const homeEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/lineup/${params.teamId}/${params.gameId}/home`;
      const awayEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/lineup/${params.teamId}/${params.gameId}/away`;
      
      console.log(`Fetching home lineup from: ${homeEndpoint}`);
      console.log(`Fetching away lineup from: ${awayEndpoint}`);
      
      // First check if lineup is available by fetching away lineup (it contains the lineup_available flag)
      console.log(`Checking lineup availability from: ${awayEndpoint}`);
      const awayResponse = await fetch(awayEndpoint);
      
      // Log response status for debugging
      console.log(`Away lineup response status: ${awayResponse.status}`);
      
      let lineupAvailable = 'no';
      if (awayResponse.ok) {
        try {
          const awayRawText = await awayResponse.text();
          console.log('=== RAW AWAY LINEUP RESPONSE ===');
          console.log(awayRawText.substring(0, 500) + (awayRawText.length > 500 ? '...' : ''));
          console.log('=== END RAW AWAY LINEUP RESPONSE ===');
          
          const awayData = JSON.parse(awayRawText);
          console.log('=== PARSED AWAY LINEUP DATA ===');
          console.log(JSON.stringify(awayData, null, 2).substring(0, 500) + (JSON.stringify(awayData, null, 2).length > 500 ? '...' : ''));
          console.log('=== END PARSED AWAY LINEUP DATA ===');
          
          // Check for lineup_available flag in the response
          if (awayData.lineup_available) {
            lineupAvailable = awayData.lineup_available;
            console.log(`Lineup availability status from response: ${lineupAvailable}`);
          }
          
          // Process the away lineup data
          const processedAwayLineup = processLineupData(awayData, 'away');
          console.log(`Processed ${processedAwayLineup.length} away players`);
          setAwayLineup(processedAwayLineup);
        } catch (jsonError) {
          console.error('Error parsing away lineup JSON:', jsonError);
          setAwayLineup([]);
        }
      } else {
        console.log(`Away lineup fetch failed: ${awayResponse.status} ${awayResponse.statusText}`);
        if (awayResponse.status === 404) {
          console.log('Away lineup might not exist yet. This is normal for a new game.');
        } else {
          console.log('Unexpected error with away lineup fetch');
        }
        setAwayLineup([]);
      }
      
      // If lineup is not available, initialize with empty arrays and stop loading
      if (lineupAvailable.toLowerCase() === 'no') {
        console.log('No lineup data available yet according to response. Starting with empty lineups.');
        setHomeLineup([]);
        setLoading(false);
        return;
      }
      
      // If we get here, lineup is available, so fetch home lineup as well
      const homeResponse = await fetch(homeEndpoint);
      console.log(`Home lineup response status: ${homeResponse.status}`);
      
      // Process home lineup
      if (homeResponse.ok) {
        try {
          const homeRawText = await homeResponse.text();
          console.log('=== RAW HOME LINEUP RESPONSE ===');
          console.log(homeRawText.substring(0, 500) + (homeRawText.length > 500 ? '...' : ''));
          console.log('=== END RAW HOME LINEUP RESPONSE ===');
          
          const homeData = JSON.parse(homeRawText);
          console.log('=== PARSED HOME LINEUP DATA ===');
          console.log(JSON.stringify(homeData, null, 2).substring(0, 500) + (JSON.stringify(homeData, null, 2).length > 500 ? '...' : ''));
          console.log('=== END PARSED HOME LINEUP DATA ===');
          
          // Process the home lineup data
          const processedHomeLineup = processLineupData(homeData, 'home');
          console.log(`Processed ${processedHomeLineup.length} home players`);
          setHomeLineup(processedHomeLineup);
        } catch (jsonError) {
          console.error('Error parsing home lineup JSON:', jsonError);
          setHomeLineup([]);
        }
      } else {
        console.error(`Home lineup fetch failed: ${homeResponse.status} ${homeResponse.statusText}`);
        if (homeResponse.status === 404) {
          console.log('Home lineup might not exist yet. This is normal for a new game.');
        } else {
          console.log('Unexpected error with home lineup fetch');
        }
        setHomeLineup([]);
      }
    } catch (error) {
      console.error('Error fetching lineups:', error);
      setHomeLineup([]);
      setAwayLineup([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to update previous inning lineup
  const updatePreviousInningLineup = (prevInningNumber: number, homeData: Player[] = homeLineup, awayData: Player[] = awayLineup) => {
    const prevHomeLineup = homeData.filter(p => p.inning_number === prevInningNumber);
    const prevAwayLineup = awayData.filter(p => p.inning_number === prevInningNumber);
    
    setPreviousInningLineup([...prevHomeLineup, ...prevAwayLineup]);
  };
  
  // Fetch roster players for the current team
  const fetchRosterPlayers = async () => {
    try {
      // Use the active_players endpoint for my team's data
      const teamActivePlayersEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/teams/${params.teamId}/active_players`;
      let endpoint;
      
      if (myTeamHa === activeTab) {
        // If viewing my team's lineup, use my team's active players
        endpoint = teamActivePlayersEndpoint;
      } else {
        
        // please generate a dataset instead of doing this call.  this is what the json looks like for active_players endpoint. {"team_id":"1","team_name":"NE Thunder 11U","active_players_count":11,"active_players":[{"jersey_number":"10","player_name":"Avry Vandeberg","position":"P"},{"jersey_number":"11","player_name":"Ellie Pappas","position":"C"},
        //generatea a blank dataset for the opponent team.
        const blankDataset = {
          team_id: params.teamId,
          team_name: 'Opponent Team',
          active_players_count: 0,
          active_players: []
        };
        // Remove these lines that are causing the 404 error
        // endpoint = `${process.env.NEXT_PUBLIC_API_URL}/games/${params.teamId}/${params.gameId}/${activeTab}_roster`;
        // endpoint = `${process.env.NEXT_PUBLIC_API_URL}/games/${params.teamId}/${params.gameId}/${activeTab}_roster`;
        
        // Use the blank dataset directly instead of fetching
        console.log('Using blank dataset for opponent team');
        setRosterPlayers([]);
        return;
      }
      
      console.log(`Fetching roster from: ${endpoint}`);
      const response = await fetch(endpoint);
      
      console.log(`Roster response status: ${response.status}`);
      
      if (response.ok) {
        try {
          const rawText = await response.text();
          console.log('=== RAW ROSTER RESPONSE ===');
          console.log(rawText);
          console.log('=== END RAW ROSTER RESPONSE ===');
          
          const data = JSON.parse(rawText);
          console.log('=== PARSED ROSTER DATA ===');
          console.log(JSON.stringify(data, null, 2));
          console.log('=== END PARSED ROSTER DATA ===');
          
          // Handle the new active_players endpoint format
          if (data.active_players && Array.isArray(data.active_players)) {
            // Transform the active_players format to our RosterPlayer format
            const transformedPlayers = data.active_players.map((player: { 
              jersey_number: number | string; 
              player_name: string; 
              position: string 
            }) => ({
              jersey_number: player.jersey_number.toString(),
              player_name: player.player_name,
              position: player.position // we'll keep this additional data
            }));
            
            // Store active players separately for my team
            if (myTeamHa === activeTab) {
              setActivePlayersList(transformedPlayers);
              console.log(`Stored ${transformedPlayers.length} active players for my team`);
            }
            
            setRosterPlayers(transformedPlayers);
            console.log(`Successfully loaded ${transformedPlayers.length} players from active_players endpoint`);
          } 
          // Fall back to handling the traditional roster format
          else if (Array.isArray(data)) {
            setRosterPlayers(data);
            console.log(`Successfully loaded ${data.length} players from traditional roster endpoint`);
          } else {
            console.warn('Roster data is not in expected format, using default players');
            setRosterPlayers(getDefaultPlayers());
          }
        } catch (jsonError) {
          console.error('Error parsing roster JSON:', jsonError);
          setRosterPlayers(getDefaultPlayers());
        }
      } else {
        console.warn(`No specific roster found for ${activeTab} team, using fallback options`);
        
        // Try getting active players for my team
        const fallbackResponse = await fetch(teamActivePlayersEndpoint);
        console.log(`Fallback active_players response status: ${fallbackResponse.status}`);
        
        if (fallbackResponse.ok) {
          try {
            const fallbackRawText = await fallbackResponse.text();
            console.log('=== RAW FALLBACK ACTIVE_PLAYERS RESPONSE ===');
            console.log(fallbackRawText);
            console.log('=== END RAW FALLBACK ACTIVE_PLAYERS RESPONSE ===');
            
            const fallbackData = JSON.parse(fallbackRawText);
            console.log('=== PARSED FALLBACK ACTIVE_PLAYERS DATA ===');
            console.log(JSON.stringify(fallbackData, null, 2));
            console.log('=== END PARSED FALLBACK ACTIVE_PLAYERS DATA ===');
            
            console.log("Using team active_players as fallback");
            
            // Handle the active_players endpoint format
            if (fallbackData.active_players && Array.isArray(fallbackData.active_players)) {
              // Transform the active_players format to our RosterPlayer format
              const transformedPlayers = fallbackData.active_players.map((player: { 
                jersey_number: number | string; 
                player_name: string; 
                position: string 
              }) => ({
                jersey_number: player.jersey_number.toString(),
                player_name: player.player_name,
                position: player.position // we'll keep this additional data
              }));
              
              // Store active players separately for my team
              setActivePlayersList(transformedPlayers);
              console.log(`Stored ${transformedPlayers.length} active players from fallback`);
              
              if (myTeamHa !== activeTab) {
                setRosterPlayers(transformedPlayers);
                console.log(`Loaded ${transformedPlayers.length} players from fallback active_players endpoint`);
              }
            }
            // Fall back to handling the traditional format if needed
            else if (Array.isArray(fallbackData)) {
              if (myTeamHa !== activeTab) {
                setRosterPlayers(fallbackData);
                console.log(`Loaded ${fallbackData.length} players from fallback traditional roster`);
              }
            } else {
              console.warn('Fallback data is not in expected format, using default players');
              if (myTeamHa !== activeTab) {
                setRosterPlayers(getDefaultPlayers());
              }
            }
          } catch (jsonError) {
            console.error('Error parsing fallback active_players JSON:', jsonError);
            if (myTeamHa !== activeTab) {
              setRosterPlayers(getDefaultPlayers());
            }
          }
        } else {
          console.log("Creating default players as fallback");
          if (myTeamHa !== activeTab) {
            setRosterPlayers(getDefaultPlayers());
          }
        }
      }
    } catch (error) {
      console.error('Error fetching roster players', error);
      // Create default players as a fallback
      console.log("Creating default players after error");
      setRosterPlayers(getDefaultPlayers());
    }
  };
  
  // Function to get the next order number for the active tab and current inning
  const getNextOrderNumber = () => {
    const currentTeamLineup = activeTab === 'home' ? homeLineup : awayLineup;
    const inningPlayers = currentTeamLineup.filter(p => p.inning_number === currentInning);
    
    return inningPlayers.length > 0 
      ? Math.max(...inningPlayers.map(p => p.order_number)) + 1
      : 1;
  };
  
  // Function to add a player to the lineup
  const handleAddPlayer = (player: RosterPlayer | PlayerFormInput, inning: number) => {
    const teamType = activeTab;
    const existingLineup = teamType === 'home' ? homeLineup : awayLineup;
    
    // Determine the next order number for this inning
    const inningPlayers = existingLineup.filter(p => p.inning_number === inning);
    const nextOrderNumber = inningPlayers.length > 0 
      ? Math.max(...inningPlayers.map(p => p.order_number)) + 1
      : 1;
    
    const newPlayer: Player = {
      jersey_number: player.jersey_number,
      name: player.player_name,
      order_number: nextOrderNumber,
      inning_number: inning,
      home_or_away: teamType
    };
    
    if (teamType === 'home') {
      setHomeLineup([...homeLineup, newPlayer]);
    } else {
      setAwayLineup([...awayLineup, newPlayer]);
    }
    
    setLineupChanged(true);
    setIsAddPlayerModalOpen(false);
  };
  
  // Refresh lineup data for a specific team
  const refreshLineupData = async (teamChoice: 'home' | 'away', inningNumber: number) => {
    try {
      setLoading(true);
      
      // Only proceed with refresh if lineup data should be available
      // Ensure we're using the literal string 'home' or 'away'
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/lineup/${params.teamId}/${params.gameId}/${teamChoice === 'home' ? 'home' : 'away'}`;
      console.log(`Refreshing ${teamChoice} lineup from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        // Use cache: 'no-store' to ensure we're getting fresh data
        cache: 'no-store',
      });
      
      console.log(`${teamChoice} lineup refresh response status: ${response.status}`);
      
      if (response.ok) {
        try {
          const rawText = await response.text();
          console.log(`=== RAW ${teamChoice.toUpperCase()} LINEUP REFRESH RESPONSE ===`);
          console.log(rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''));
          console.log(`=== END RAW ${teamChoice.toUpperCase()} LINEUP REFRESH RESPONSE ===`);
          
          const data = JSON.parse(rawText);
          console.log(`=== PARSED ${teamChoice.toUpperCase()} REFRESH DATA ===`);
          console.log(JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data, null, 2).length > 500 ? '...' : ''));
          console.log(`=== END PARSED ${teamChoice.toUpperCase()} REFRESH DATA ===`);
          
          // Process the data
          const processedLineup = processLineupData(data, teamChoice);
          console.log(`Processed ${processedLineup.length} ${teamChoice} players`);
          
          // Update the lineup state
          if (teamChoice === 'home') {
            setHomeLineup(processedLineup);
          } else {
            setAwayLineup(processedLineup);
          }
        } catch (jsonError) {
          console.error(`Error parsing ${teamChoice} lineup JSON:`, jsonError);
        }
      } else {
        const errorText = await response.text().catch(() => 'No response body');
        
        if (response.status === 404) {
          // Handle 404 case - this is expected if lineup hasn't been saved yet
          console.log(`${teamChoice} lineup not found (404). This is normal for a new lineup.`);
          console.log(`Response body:`, errorText.substring(0, 200) + (errorText.length > 200 ? '...' : ''));
          
          // Set empty lineup for the team
          if (teamChoice === 'home') {
            setHomeLineup([]);
          } else {
            setAwayLineup([]);
          }
        } else {
          // Other error cases - log but don't show to user
          console.error(`${teamChoice} lineup refresh failed:`, response.status, response.statusText);
          console.error(`Response body:`, errorText.substring(0, 500) + (errorText.length > 500 ? '...' : ''));
        }
      }
    } catch (error) {
      console.error(`Error refreshing ${teamChoice} lineup:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  // Save lineups
  const saveLineups = async () => {
    try {
      // Parse teamId and gameId from params
      const teamId = parseInt(params.teamId as string);
      const gameId = parseInt(params.gameId as string);
      
      // Only format and save data for the active tab and current inning
      let lineupData;
      let endpoint;
      
      // Filter for only the current inning's players to avoid duplication
      const currentInningPlayers = getCurrentInningPlayers();
      console.log(`Saving ${currentInningPlayers.length} players for ${activeTab} team, inning ${currentInning}`);
      
      if (activeTab === 'home') {
        // Format home lineup data according to the specified model
        lineupData = currentInningPlayers.map(player => ({
          team_id: teamId,
          game_id: gameId,
          home_or_away: "home",
          inning_number: player.inning_number,
          order_number: player.order_number,
          jersey_number: player.jersey_number,
          player_name: player.name
        }));
        
        // Updated endpoint with inning_number parameter
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/lineup/${teamId}/${gameId}/home/${currentInning}`;
        console.log('=== HOME LINEUP JSON TO BE SENT ===');
        console.log(JSON.stringify(lineupData, null, 2));
        console.log('=== END HOME LINEUP ===');
      } else {
        // Format away lineup data according to the specified model
        lineupData = currentInningPlayers.map(player => ({
          team_id: teamId,
          game_id: gameId,
          home_or_away: "away",
          inning_number: player.inning_number,
          order_number: player.order_number,
          jersey_number: player.jersey_number,
          player_name: player.name
        }));
        
        // Updated endpoint with inning_number parameter
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/lineup/${teamId}/${gameId}/away/${currentInning}`;
        console.log('=== AWAY LINEUP JSON TO BE SENT ===');
        console.log(JSON.stringify(lineupData, null, 2));
        console.log('=== END AWAY LINEUP ===');
      }
      
      // Log the endpoint
      console.log(`Sending ${activeTab} lineup for inning ${currentInning} to: ${endpoint}`);
      
      // Save lineup for active tab only
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lineupData),
      });
      
      console.log(`${activeTab} lineup save response status: ${response.status}`);
      
      // Log the response text if available
      try {
        const responseText = await response.text();
        console.log(`=== ${activeTab.toUpperCase()} LINEUP SAVE RESPONSE ===`);
        console.log(responseText);
        console.log(`=== END ${activeTab.toUpperCase()} LINEUP SAVE RESPONSE ===`);
      } catch (error) {
        console.log(`No ${activeTab} response text available`);
      }
      
      if (response.ok) {
        console.log(`${activeTab} lineup saved successfully`);
        
        // Remove the separate lineup availability API call/update
        setLineupChanged(false);
        alert(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} lineup for inning ${currentInning} saved successfully`);
      } else {
        console.error(`Failed to save ${activeTab} lineup`);
        alert(`Failed to save ${activeTab} lineup. Please try again.`);
      }
    } catch (error) {
      console.error('Error saving lineup:', error);
      alert('An error occurred while saving the lineup.');
    }
  };
  
  // Update lineup display immediately after lineup changes
  useEffect(() => {
    // This will trigger UI update when lineups change
    console.log("Lineup data changed, updating UI...");
    // No action needed, just the dependency array is enough for re-render
  }, [homeLineup, awayLineup]);

  // Update data when active tab or current inning changes
  useEffect(() => {
    // Skip API refresh when a lineup operation is in progress
    if (lineupOperationInProgress) {
      console.log("Skipping API refresh during lineup operation");
      return;
    }
    
    // Skip API refresh when lineup has changed but not saved
    if (lineupChanged) {
      console.log("Skipping API refresh because lineup has unsaved changes");
      return;
    }
    
    console.log("Refreshing lineup data from API for", activeTab, "inning", currentInning);
    refreshLineupData(activeTab, currentInning);
    
    // Also update previous inning data if needed
    if (currentInning > 1) {
      updatePreviousInningLineup(currentInning - 1);
    }
  }, [activeTab, currentInning, lineupOperationInProgress, lineupChanged]);
  
  // Fetch data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      // First get the my_team_ha value
      await fetchMyTeamHa();
      // Then fetch lineups
      await fetchLineups();
      // Fetch roster players last (depends on activeTab which is away by default)
      await fetchRosterPlayers();
    };
    
    loadInitialData();
  }, []);
  
  // Default to "away" tab since away team bats first
  // Update activeTab based on myTeamHa if it changes
  useEffect(() => {
    // Log the values for debugging
    console.log("My team is:", myTeamHa, "Active tab is:", activeTab);
    
    // We don't automatically change the active tab when myTeamHa changes
    // This just ensures we have valid state for UI displays
    if (myTeamHa !== 'home' && myTeamHa !== 'away') {
      console.warn("Invalid myTeamHa value, defaulting to 'home'");
      setMyTeamHa('home');
    }
  }, [myTeamHa, activeTab]);
  
  // Update roster players when tab changes
  useEffect(() => {
    console.log(`Tab changed to ${activeTab}, fetching roster and active players data...`);
    fetchRosterPlayers();
  }, [activeTab]);
  
  // Now we need to implement proper move player functionality in the GameLineup component
  const handleMovePlayer = (player: Player, direction: 'up' | 'down') => {
    const currentTeamLineup = player.home_or_away === 'home' ? homeLineup : awayLineup;
    const setLineup = player.home_or_away === 'home' ? setHomeLineup : setAwayLineup;
    
    // Filter only players from the same inning
    const sameInningPlayers = currentTeamLineup
      .filter(p => p.inning_number === player.inning_number)
      .sort((a, b) => a.order_number - b.order_number);
    
    // Find the index of the player in the sorted list
    const playerIndex = sameInningPlayers.findIndex(
      p => p.jersey_number === player.jersey_number && p.order_number === player.order_number
    );
    
    // Cannot move if at the boundaries
    if (
      (direction === 'up' && playerIndex === 0) || 
      (direction === 'down' && playerIndex === sameInningPlayers.length - 1)
    ) {
      return;
    }
    
    // Get the player to swap with
    const swapIndex = direction === 'up' ? playerIndex - 1 : playerIndex + 1;
    const swapPlayer = sameInningPlayers[swapIndex];
    
    // Swap order numbers
    const updatedLineup = currentTeamLineup.map(p => {
      if (p.jersey_number === player.jersey_number && 
          p.inning_number === player.inning_number &&
          p.order_number === player.order_number) {
        return { ...p, order_number: swapPlayer.order_number };
      } else if (p.jersey_number === swapPlayer.jersey_number && 
                 p.inning_number === swapPlayer.inning_number &&
                 p.order_number === swapPlayer.order_number) {
        return { ...p, order_number: player.order_number };
      }
      return p;
    });
    
    // Update the lineup
    setLineup(updatedLineup);
    setLineupChanged(true);
  };
  
  // Delete lineup for the current inning and active tab
  const handleDeleteLineup = () => {
    if (activeTab === 'home') {
      // Filter out players from the current inning
      const updatedLineup = homeLineup.filter(
        player => player.inning_number !== currentInning
      );
      setHomeLineup(updatedLineup);
    } else {
      // Filter out players from the current inning
      const updatedLineup = awayLineup.filter(
        player => player.inning_number !== currentInning
      );
      setAwayLineup(updatedLineup);
    }
    
    // Mark as changed so the user knows to save
    setLineupChanged(true);
  };
  
  // Fetch previous inning lineup data from server for creating a new inning
  const fetchPreviousInningLineup = async (inningNumber: number) => {
    setLineupOperationInProgress(true);
    try {
      console.log(`Fetching previous inning lineup data for creating inning ${inningNumber}`);
      
      // Fetch data for the current active tab team
      const teamChoice = activeTab; // 'home' or 'away'
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/lineup/${params.teamId}/${params.gameId}/${teamChoice}/${inningNumber - 1}/new_inning`;
      
      console.log(`Fetching lineup template from: ${endpoint}`);
      const response = await fetch(endpoint);
      
      if (response.ok) {
        // Log raw response data for debugging
        const rawText = await response.text();
        console.log(`=== RAW NEW INNING RESPONSE ===`);
        console.log(rawText);
        console.log(`=== END RAW NEW INNING RESPONSE ===`);
        
        // Parse the raw text to JSON
        const data = JSON.parse(rawText);
        console.log(`Received lineup template data structure:`, Object.keys(data));
        
        // The API response format has {message, team_id, game_id, team_choice, source_inning, lineup: Array}
        if (data.lineup && Array.isArray(data.lineup) && data.lineup.length > 0) {
          // Transform the data to match our Player structure
          const sourcePlayers = data.lineup.map((player: { jersey_number: string | number; player_name: string; order_number: number; }) => {
            // Ensure jersey_number is always a string
            const jerseyNum = typeof player.jersey_number === 'number' 
              ? player.jersey_number.toString() 
              : player.jersey_number;
            
            return {
              jersey_number: jerseyNum,
              name: player.player_name,
              order_number: player.order_number,
              inning_number: inningNumber, // Set to the new inning number
              home_or_away: teamChoice
            };
          });
          
          console.log(`Transformed ${sourcePlayers.length} players for inning ${inningNumber}:`, sourcePlayers);
          
          // ATOMIC UPDATE: First completely remove any existing players for this inning
          let currentLineup;
          if (teamChoice === 'home') {
            currentLineup = [...homeLineup];
            // Remove all players from this inning
            currentLineup = currentLineup.filter(p => p.inning_number !== inningNumber);
            // Add all the new players at once
            currentLineup = [...currentLineup, ...sourcePlayers];
            console.log(`Setting homeLineup with ${currentLineup.length} players (${sourcePlayers.length} for inning ${inningNumber})`);
            setHomeLineup(currentLineup);
          } else {
            currentLineup = [...awayLineup];
            // Remove all players from this inning
            currentLineup = currentLineup.filter(p => p.inning_number !== inningNumber);
            // Add all the new players at once
            currentLineup = [...currentLineup, ...sourcePlayers];
            console.log(`Setting awayLineup with ${currentLineup.length} players (${sourcePlayers.length} for inning ${inningNumber})`);
            setAwayLineup(currentLineup);
          }
          
          // Mark the lineup as changed
          setLineupChanged(true);
          
          // Set current inning to the populated inning
          setCurrentInning(inningNumber);
          
          console.log(`Successfully populated inning ${inningNumber} with ${sourcePlayers.length} players`);
          return true;
        } else {
          console.log(`No lineup data returned from the server for inning ${inningNumber - 1}`);
          return false;
        }
      } else {
        console.error(`Error fetching lineup template: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('Error fetching previous inning lineup:', error);
      return false;
    } finally {
      // Ensure lineupOperationInProgress is reset
      setLineupOperationInProgress(false);
      console.log('Lineup operation complete');
    }
  };
  
  // Helper function to get players for the current inning and tab
  const getCurrentInningPlayers = (): Player[] => {
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    console.log(`Filtering players for ${activeTab} team, inning ${currentInning}`);
    console.log(`Total players in lineup: ${currentLineup.length}`);
    
    // Filter players for the current inning
    const inningPlayers = currentLineup.filter(player => player.inning_number === currentInning);
    console.log(`Found ${inningPlayers.length} players for inning ${currentInning}`);
    
    return inningPlayers;
  };
  
  const currentPlayers = getCurrentInningPlayers();
  
  // Use useEffect to log when the current players change
  useEffect(() => {
    console.log(`Current players updated: ${currentPlayers.length} players for inning ${currentInning}`);
  }, [currentPlayers, currentInning]);
  
  // Get previous inning players
  const getPreviousInningPlayers = (): Player[] => {
    if (currentInning <= 1) return [];
    
    const prevInning = currentInning - 1;
    const prevLineup = activeTab === 'home' ? homeLineup : awayLineup;
    
    // Filter players for the previous inning
    return prevLineup.filter(player => player.inning_number === prevInning);
  };
  
  const previousPlayers = getPreviousInningPlayers();
  
  return (
    <div className="container mx-auto px-1 py-1">
      <div className="mb-0">
        <h1 className="text-2xl font-bold mb-1">Offensive Lineup Manager</h1>
        
        {/* InningSelector moved above tabs */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Inning Actions</h2>
          <InningSelector 
            currentInning={currentInning}
            setCurrentInning={setCurrentInning}
            availableInnings={availableInnings}
            handleCopyPreviousInning={handleCopyPreviousInning}
            handleAddInning={handleAddInning}
            saveLineups={saveLineups}
            lineupChanged={lineupChanged}
            activeTab={activeTab}
            homeLineup={homeLineup}
            awayLineup={awayLineup}
            handleDeleteLineup={handleDeleteLineup}
            fetchPreviousInningLineup={fetchPreviousInningLineup}
          />
        </div>
      </div>
      
      {/* Team tabs with inline add player form for both teams */}
      <div className="border-b border-gray-200 bg-white shadow-sm rounded-t-lg">
        <nav className="flex items-center px-4">
          <button
            onClick={() => setActiveTab('away')}
            className={`mr-2 py-3 px-8 font-medium text-sm transition-colors rounded-t-lg ${
              activeTab === 'away'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600 font-semibold -mb-px'
                : 'bg-gray-50 text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {myTeamHa === 'away' ? 'My Team (Away)' : 'Away Team'}
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`mr-2 py-3 px-8 font-medium text-sm transition-colors rounded-t-lg ${
              activeTab === 'home'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600 font-semibold -mb-px'
                : 'bg-gray-50 text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {myTeamHa === 'home' ? 'My Team (Home)' : 'Home Team'}
          </button>
          
          {/* Add player form for all teams */}
          <AddPlayerForm
            currentInning={currentInning}
            nextOrderNumber={getNextOrderNumber()}
            onAddPlayer={handleAddPlayer}
            activeTab={activeTab}
            myTeamHa={myTeamHa}
            activePlayers={activePlayersList}
            lineupChanged={lineupChanged}
          />
        </nav>
      </div>
      
      {/* Current team lineup - all innings horizontally */}
      <div className="bg-white shadow-sm rounded-b-lg overflow-hidden mb-6 border border-gray-200 border-t-0">
        <div className="p-4">
          {/* Get unique innings from the current team's lineup */}
          {(() => {
            const currentTeamLineup = activeTab === 'home' ? homeLineup : awayLineup;
            
            // Get all innings that have lineup data
            const existingInnings = Array.from(new Set(currentTeamLineup.map(p => p.inning_number))).sort((a, b) => a - b);
            
            // Ensure we have the current inning and the next inning in our display
            let inningsToDisplay = [...existingInnings];
            
            // Add current inning if not already in the list
            if (!inningsToDisplay.includes(currentInning)) {
              inningsToDisplay.push(currentInning);
            }
            
            // Add next inning if not already in the list
            const nextInning = currentInning + 1;
            if (!inningsToDisplay.includes(nextInning) && availableInnings.includes(nextInning)) {
              inningsToDisplay.push(nextInning);
            }
            
            // Sort the innings to ensure they're in order
            inningsToDisplay = inningsToDisplay.sort((a, b) => a - b);
            
            if (inningsToDisplay.length === 0) {
              return (
                <p className="text-gray-500 py-4">No innings found for this team. Add players to create lineup.</p>
              );
            }
            
            return (
              <div className="overflow-x-auto pb-4">
                <div className="flex space-x-6">
                  {inningsToDisplay.map(inning => (
                    <div 
                      key={inning} 
                      className={`flex-none ${inning === currentInning ? 'border-2 border-indigo-300 rounded-lg' : ''}`}
                    >
                      <LineupTable
                        players={currentTeamLineup.filter(player => player.inning_number === inning)}
                        isLoading={loading}
                        showActions={inning === currentInning}
                        onRemovePlayer={inning === currentInning ? (player: Player) => {
                          if (activeTab === 'home') {
                            setHomeLineup(homeLineup.filter(p => 
                              !(p.inning_number === player.inning_number && 
                                p.jersey_number === player.jersey_number &&
                                p.order_number === player.order_number)
                            ));
                          } else {
                            setAwayLineup(awayLineup.filter(p => 
                              !(p.inning_number === player.inning_number && 
                                p.jersey_number === player.jersey_number &&
                                p.order_number === player.order_number)
                            ));
                          }
                          setLineupChanged(true);
                        } : undefined}
                        onMovePlayer={inning === currentInning ? handleMovePlayer : undefined}
                        isReadOnly={inning !== currentInning}
                        emptyMessage={`No players for inning ${inning}`}
                        inningNumber={inning}
                        currentInning={currentInning}
                        onInningClick={setCurrentInning}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* Legend for color coding */}
      {currentInning > 1 && (
        <div className="text-xs text-gray-600 mt-4 bg-white p-2 rounded-md border border-gray-200 flex flex-wrap gap-3">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-50 border border-green-200 mr-1"></div>
            <span className="text-green-700 font-medium">New player</span> - added in current inning
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-50 border border-yellow-200 mr-1"></div>
            <span className="text-amber-700 font-medium">Moved</span> - position changed from previous inning
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-50 border border-red-200 mr-1"></div>
            <span className="text-red-600 font-medium">Removed</span> - not in current inning lineup
          </div>
        </div>
      )}
    </div>
  );
} 