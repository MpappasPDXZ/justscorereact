"use client"

import React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LineupTable, { Player } from "./components/LineupTable";
import InningSelector from "./components/InningSelector";
import AddPlayerDropdown, { RosterPlayer } from "./components/AddPlayerDropdown";
import AddPlayerForm, { PlayerFormInput } from "./components/AddPlayerForm";
import Toast from './components/Toast';

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
  
  // Create refs inside the component
  const isInitialRender = React.useRef(true);
  
  // Default to just showing inning 1 initially
  const [availableInnings, setAvailableInnings] = useState<number[]>([1]);
  const [maxInning, setMaxInning] = useState<number>(1);
  
  // Update the state to include the active players separately
  const [activePlayersList, setActivePlayersList] = useState<{
    jersey_number: string;
    player_name: string;
    position: string;
  }[]>([]);
  
  // Toast notification state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });
  
  // Function to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({
      visible: true,
      message,
      type
    });
  };

  // Function to hide toast
  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      visible: false
    }));
  };
  
  // Fetch my_team_ha value
  const fetchMyTeamHa = async () => {
    try {
      // Ensure we have valid teamId and gameId
      if (!params.teamId || !params.gameId || params.teamId === 'undefined' || params.gameId === 'undefined') {
        console.error('Invalid teamId or gameId', { teamId: params.teamId, gameId: params.gameId });
        setMyTeamHa('home'); // default
        return 'home';
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${params.teamId}/${params.gameId}/my_team_ha`);
      
      let result = 'home'; // Default value
      
      if (response.ok) {
        // Get the raw response text
        const rawResponse = await response.text();
        
        // Standardize and clean response
        const cleanResponse = rawResponse.trim().toLowerCase();
        
        // Parse the response
        if (cleanResponse === 'away' || cleanResponse.includes('"away"') || cleanResponse.includes("'away'")) {
          result = 'away';
        } else if (cleanResponse === 'home' || cleanResponse.includes('"home"') || cleanResponse.includes("'home'")) {
          result = 'home';
        } else {
          // Try to parse JSON if it's a JSON string
          try {
            const jsonResponse = JSON.parse(rawResponse);
            if (jsonResponse === 'away' || (typeof jsonResponse === 'object' && jsonResponse.value === 'away')) {
              result = 'away';
            } else if (jsonResponse === 'home' || (typeof jsonResponse === 'object' && jsonResponse.value === 'home')) {
              result = 'home';
            }
          } catch (jsonError) {
            // Not a valid JSON, continue with fallback
            result = 'home';
          }
        }
      }
      
      // Update state with the result
      setMyTeamHa(result as 'home' | 'away');
      return result;
    } catch (error) {
      // Fallback to 'home' if there's an exception
      setMyTeamHa('home');
      return 'home';
    }
  };
  
  // Function to copy lineup from previous inning to current inning
  const handleCopyPreviousInning = () => {
    if (currentInning <= 1) return; // Can't copy if we're on inning 1
    
    setLineupOperationInProgress(true);
    const prevInning = currentInning - 1;
    let madeChanges = false;
    
    // Show toast notification for starting the copy operation
    showToast(`Copying players from inning ${prevInning}...`, 'info');
    
    // Copy home lineup
    const prevInningHomePlayers = homeLineup.filter(p => p.inning_number === prevInning);
    if (prevInningHomePlayers.length > 0) {
      // Only copy if current inning doesn't already have players
      const currentInningHomePlayers = homeLineup.filter(p => p.inning_number === currentInning);
      
      if (currentInningHomePlayers.length === 0) {
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
      setLineupChanged(true);
      showToast(`Players copied from inning ${prevInning} to ${currentInning}`, 'success');
    } else {
      // If current inning already has players
      const hasHomePlayers = homeLineup.some(p => p.inning_number === currentInning);
      const hasAwayPlayers = awayLineup.some(p => p.inning_number === currentInning);
      
      if (hasHomePlayers || hasAwayPlayers) {
        showToast(`Inning ${currentInning} already has players`, 'warning');
      } else {
        showToast(`No players found in inning ${prevInning} to copy`, 'warning');
      }
    }
    
    // Reset the operation flag after copying
    setTimeout(() => {
      setLineupOperationInProgress(false);
    }, 300);
  };
  
  // Add a new inning
  const handleAddInning = async () => {
    try {
      setLoading(true);
      
      // Get the current lineup for this tab
      const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
      
      // Check if inning 1 has been saved (has players)
      const inning1HasPlayers = currentLineup.some(p => p.inning_number === 1);
      if (!inning1HasPlayers) {
        showToast('You must save inning 1 before adding more innings', 'warning');
        setLoading(false);
        return;
      }
      
      // Find the highest inning with data
      const savedInnings = Array.from(new Set(
        currentLineup.map(player => player.inning_number)
      )).sort((a, b) => a - b);
      
      // Determine what inning to copy from
      const lastSavedInning = savedInnings.length > 0 ? savedInnings[savedInnings.length - 1] : 0;
      
      // If we don't have any innings saved, can't continue
      if (lastSavedInning === 0) {
        showToast('Cannot find any saved innings', 'error');
        setLoading(false);
        return;
      }
      
      // Determine the next inning number
      const nextInning = lastSavedInning + 1;
      
      // Add the new inning to UI immediately
      setAvailableInnings(prev => {
        if (prev.includes(nextInning)) return prev;
        const newInnings = [...prev, nextInning].sort((a, b) => a - b);
        return newInnings;
      });
      
      // Set current inning to the new one
      setCurrentInning(nextInning);
      
      // Use the copy endpoint to copy the previous inning's data
      showToast(`Copying lineup from inning ${lastSavedInning} to inning ${nextInning}...`, 'info');
      
      // Make sure we're using the correct API URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
      
      const copyResponse = await fetch(
        `${apiBaseUrl}/lineup/${params.teamId}/${params.gameId}/${activeTab}/copy/${lastSavedInning}/${nextInning}`,
        { method: 'POST' }
      );
      
      if (copyResponse.ok) {
        showToast(`Added inning ${nextInning} with data from inning ${lastSavedInning}`, 'success');
        
        // Refresh lineup data to show the copied players
        await fetchLineups();
      } else {
        const errorText = await copyResponse.text();
        console.error('Copy inning response error:', errorText);
        showToast(`Failed to copy data from inning ${lastSavedInning}`, 'error');
      }
    } catch (error) {
      console.error('Error adding inning:', error);
      showToast('Error adding inning', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch lineups
  const fetchLineups = async () => {
    try {
      // Validate required parameters
      if (!params.teamId || !params.gameId || params.teamId === 'undefined' || params.gameId === 'undefined') {
        console.error('Invalid teamId or gameId parameters', { teamId: params.teamId, gameId: params.gameId });
        setHomeLineup([]);
        setAwayLineup([]);
        return;
      }
      
      // Log the URLs we're fetching for debugging purposes
      const homeEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${params.teamId}/${params.gameId}/home`;
      const awayEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${params.teamId}/${params.gameId}/away`;
      
      // Fetch both lineups concurrently for efficiency
      const [homeResponse, awayResponse] = await Promise.all([
        fetch(homeEndpoint),
        fetch(awayEndpoint)
      ]);
      
      // Process home lineup data
      let homeLineupData: Player[] = [];
      if (homeResponse.ok) {
        try {
          const homeData = JSON.parse(await homeResponse.text());
          homeLineupData = processLineupData(homeData, 'home');
          setHomeLineup(homeLineupData);
        } catch (error) {
          setHomeLineup([]);
        }
      } else {
        setHomeLineup([]);
      }
      
      // Process away lineup data
      let awayLineupData: Player[] = [];
      if (awayResponse.ok) {
        try {
          const awayData = JSON.parse(await awayResponse.text());
          awayLineupData = processLineupData(awayData, 'away');
          setAwayLineup(awayLineupData);
        } catch (error) {
          setAwayLineup([]);
        }
      } else {
        setAwayLineup([]);
      }
      
      // Update innings after both lineups are loaded
      const allInningNumbers = [
        ...homeLineupData.map(p => p.inning_number),
        ...awayLineupData.map(p => p.inning_number)
      ];
      
      if (allInningNumbers.length > 0) {
        // Get unique inning numbers
        const uniqueInnings = Array.from(new Set(allInningNumbers)).sort((a, b) => a - b);
        
        // Always include inning 1 if not already present
        if (!uniqueInnings.includes(1)) {
          uniqueInnings.unshift(1);
        }
        
        setAvailableInnings(uniqueInnings);
        setMaxInning(Math.max(...uniqueInnings));
      }
    } catch (error) {
      console.error('Error fetching lineups:', error);
      setHomeLineup([]);
      setAwayLineup([]);
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
      // Validate required parameters
      if (!params.teamId || params.teamId === 'undefined') {
        setRosterPlayers(getDefaultPlayers());
        return;
      }
      
      // Use the active_players endpoint for my team's data
      const teamActivePlayersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${params.teamId}/active_players`;
      
      // Only fetch roster players for the user's team, use default players for opponent
      if (activeTab === myTeamHa) {
        // Show toast notification
        showToast('Loading roster players...', 'info');
        
        // Fetch active players for my team
        try {
          const response = await fetch(teamActivePlayersEndpoint);
          
          if (response.ok) {
            const rawText = await response.text();
            const data = JSON.parse(rawText);
            
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
              
              // Store active players separately for use elsewhere in the UI
              setActivePlayersList(transformedPlayers);
              setRosterPlayers(transformedPlayers);
              
              showToast(`Loaded ${transformedPlayers.length} players`, 'success');
            } 
            // Fall back to handling the traditional roster format
            else if (Array.isArray(data)) {
              setRosterPlayers(data);
              setActivePlayersList(data);
              showToast(`Loaded ${data.length} players`, 'success');
            } else {
              setRosterPlayers(getDefaultPlayers());
              showToast('Unable to load roster players (format error)', 'warning');
            }
          } else {
            setRosterPlayers(getDefaultPlayers());
            showToast(`Failed to load roster players: ${response.status}`, 'error');
          }
        } catch (error) {
          setRosterPlayers(getDefaultPlayers());
          showToast('Error loading roster players', 'error');
        }
      } else {
        // For opponent team, use empty roster since we'll add players manually.
        setRosterPlayers([]);
        // Clear active players list for opponent team
        setActivePlayersList([]);
      }
    } catch (error) {
      setRosterPlayers(getDefaultPlayers());
      showToast('Error loading roster players', 'error');
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
    
    // Show a toast notification
    showToast(`Player ${player.player_name} (#${player.jersey_number}) added to ${teamType} lineup`, 'success');
    
    setLineupChanged(true);
    setIsAddPlayerModalOpen(false);
  };
  
  // Refresh lineup data for a specific team
  const refreshLineupData = async () => {
    // Skip API refresh if:
    // 1. Lineup operation is in progress
    // 2. Lineup has changed but not saved
    // 3. Still in initial loading phase
    // 4. First mount (prevents double-fetch)
    if (loading || lineupChanged || lineupOperationInProgress) {
      return;
    }
    
    setLineupOperationInProgress(true);
    
    try {
      if (params.teamId && params.gameId) {
        // Refresh only the lineup data, not the roster players
        const homeEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${params.teamId}/${params.gameId}/home`;
        const awayEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${params.teamId}/${params.gameId}/away`;
        
        // Only fetch the lineup for the active tab to minimize API calls
        const endpoint = activeTab === 'home' ? homeEndpoint : awayEndpoint;
        const response = await fetch(endpoint);
        
        if (response.ok) {
          try {
            const data = JSON.parse(await response.text());
            const processedLineup = processLineupData(data, activeTab);
            
            if (activeTab === 'home') {
              setHomeLineup(processedLineup);
            } else {
              setAwayLineup(processedLineup);
            }
          } catch (error) {
            console.error(`Error processing ${activeTab} lineup:`, error);
            if (activeTab === 'home') {
              setHomeLineup([]);
            } else {
              setAwayLineup([]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing lineup data:', error);
    } finally {
      setLineupOperationInProgress(false);
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
        endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${gameId}/home/${currentInning}`;
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
        endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${gameId}/away/${currentInning}`;
      }
      
      // Save lineup for active tab only
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lineupData),
      });
      
      if (response.ok) {
        // Remove the separate lineup availability API call/update
        setLineupChanged(false);
        showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} lineup for inning ${currentInning} saved successfully`, 'success');
      } else {
        showToast(`Failed to save ${activeTab} lineup. Please try again.`, 'error');
      }
    } catch (error) {
      showToast('An error occurred while saving the lineup.', 'error');
    }
  };
  
  // Update lineup display immediately after lineup changes
  useEffect(() => {
    // This will trigger UI update when lineups change
  }, [homeLineup, awayLineup]);

  // Initial data loading effect
  useEffect(() => {
    // Create a flag to track if component is mounted
    let isMounted = true;
    
    const loadInitialData = async () => {
      // Validate parameters first
      if (!params.teamId || params.teamId === 'undefined' || 
          !params.gameId || params.gameId === 'undefined') {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // 1. First get the team home/away status
        const teamType = await fetchMyTeamHa();
        
        // Guard against unmounted component
        if (!isMounted) return;
        
        // 2. Set active tab to the user's team type
        setActiveTab(teamType as 'home' | 'away');
        
        // 3. Fetch lineup data
        await fetchLineups();
        
        // 4. Fetch roster players after setting the active tab
        await fetchRosterPlayers();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        // Final cleanup
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadInitialData();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - this effect runs only once on component mount

  // Add an effect to update roster players when activeTab changes
  useEffect(() => {
    // Only fetch roster players if we know myTeamHa
    if (myTeamHa && activeTab === myTeamHa) {
      fetchRosterPlayers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, myTeamHa]); // Re-run if activeTab or myTeamHa changes

  // Helper function to update available innings
  const updateAvailableInnings = (homeLineupData: Player[], awayLineupData: Player[]) => {
    // Get all innings that have lineup data
    const homeInnings = Array.from(new Set(homeLineupData.map(p => p.inning_number)));
    const awayInnings = Array.from(new Set(awayLineupData.map(p => p.inning_number)));
    
    // Combine all inning numbers
    const allInningNumbers = [...homeInnings, ...awayInnings];
    
    if (allInningNumbers.length > 0) {
      // Get unique inning numbers
      const uniqueInnings = Array.from(new Set(allInningNumbers)).sort((a, b) => a - b);
      
      // Always include inning 1 if not already present
      if (!uniqueInnings.includes(1)) {
        uniqueInnings.unshift(1);
      }
      
      setAvailableInnings(uniqueInnings);
      setMaxInning(Math.max(...uniqueInnings));
    }
  };

  // Helper function to process roster players
  const processRosterPlayers = (data: any) => {
    if (data.active_players && Array.isArray(data.active_players)) {
      // Transform the active_players format to our RosterPlayer format
      const transformedPlayers = data.active_players.map((player: { 
        jersey_number: number | string; 
        player_name: string; 
        position: string 
      }) => ({
        jersey_number: player.jersey_number.toString(),
        player_name: player.player_name,
        position: player.position
      }));
      
      setActivePlayersList(transformedPlayers);
      setRosterPlayers(transformedPlayers);
    } else if (Array.isArray(data)) {
      setRosterPlayers(data);
      setActivePlayersList(data);
    } else {
      setRosterPlayers(getDefaultPlayers());
    }
  };
  
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
  const handleDeleteLineup = async () => {
    try {
      // Parse teamId and gameId from params
      const teamId = parseInt(params.teamId as string);
      const gameId = parseInt(params.gameId as string);
      
      // Show loading toast
      showToast(`Deleting ${activeTab} lineup for inning ${currentInning}...`, 'info');
      
      // Determine the endpoint based on active tab
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${teamId}/${gameId}/${activeTab}/${currentInning}`;
      
      // Make DELETE request to the API
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Update local state to reflect the deletion
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
        
        // Show success toast
        showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} lineup for inning ${currentInning} deleted`, 'success');
        
        // Mark as changed
        setLineupChanged(true);
      } else {
        showToast(`Failed to delete lineup. Server returned: ${response.status}`, 'error');
      }
    } catch (error) {
      showToast('An error occurred while deleting the lineup', 'error');
    }
  };
  
  // Fetch previous inning lineup data from server for creating a new inning
  const fetchPreviousInningLineup = async (inningNumber: number) => {
    setLineupOperationInProgress(true);
    try {
      // Fetch data for the current active tab team
      const teamChoice = activeTab; // 'home' or 'away'
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/${params.teamId}/${params.gameId}/${teamChoice}/${inningNumber - 1}/new_inning`;
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        // Parse the raw text to JSON
        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
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
          
          // ATOMIC UPDATE: First completely remove any existing players for this inning
          let currentLineup;
          if (teamChoice === 'home') {
            currentLineup = [...homeLineup];
            // Remove all players from this inning
            currentLineup = currentLineup.filter(p => p.inning_number !== inningNumber);
            // Add all the new players at once
            currentLineup = [...currentLineup, ...sourcePlayers];
            setHomeLineup(currentLineup);
          } else {
            currentLineup = [...awayLineup];
            // Remove all players from this inning
            currentLineup = currentLineup.filter(p => p.inning_number !== inningNumber);
            // Add all the new players at once
            currentLineup = [...currentLineup, ...sourcePlayers];
            setAwayLineup(currentLineup);
          }
          
          // Mark the lineup as changed
          setLineupChanged(true);
          
          // Set current inning to the populated inning
          setCurrentInning(inningNumber);
          
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      return false;
    } finally {
      // Ensure lineupOperationInProgress is reset
      setLineupOperationInProgress(false);
    }
  };
  
  // Helper function to get players for the current inning and tab
  const getCurrentInningPlayers = (): Player[] => {
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    
    // Filter players for the current inning
    const inningPlayers = currentLineup.filter(player => player.inning_number === currentInning);
    
    return inningPlayers;
  };
  
  const currentPlayers = getCurrentInningPlayers();
  
  // Use useEffect to log when the current players change
  useEffect(() => {
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
  
  // Start new inning - using server-side data
  const handleStartNewInning = async () => {
    // Calculate the next inning number
    const nextInning = currentInning + 1;
    
    // Check if the next inning exists in available innings
    const nextInningExists = availableInnings.includes(nextInning);
    
    if (!nextInningExists) {
      // If next inning doesn't exist yet, add it first
      handleAddInning();
      
      // Show toast notification
      showToast(`Starting new inning ${nextInning}`, 'info');
      
      // Delay fetching data so UI can update first
      setTimeout(async () => {
        const success = await fetchPreviousInningLineup(nextInning);
        if (!success) {
          showToast(`Failed to populate inning ${nextInning}`, 'error');
        } else {
          showToast(`Inning ${nextInning} created successfully`, 'success');
        }
      }, 300);
    } else {
      // The inning already exists, let's check if it has data
      const hasNextInningData = (activeTab === 'home' ? homeLineup : awayLineup).some(p => p.inning_number === nextInning);
      
      if (!hasNextInningData) {
        // First navigate to the next inning
        // First set the current inning, then populate
        setCurrentInning(nextInning);
        
        // Show toast notification
        showToast(`Populating inning ${nextInning}...`, 'info');
        
        // Delay fetching data so UI can update first
        setTimeout(async () => {
          const success = await fetchPreviousInningLineup(nextInning);
          if (!success) {
            showToast(`Failed to populate inning ${nextInning}`, 'error');
          } else {
            showToast(`Inning ${nextInning} populated successfully`, 'success');
          }
        }, 300);
      } else {
        // Just navigate to the next inning, it already has data
        setCurrentInning(nextInning);
        showToast(`Navigated to inning ${nextInning}`, 'info');
      }
    }
  };
  
  // Confirm delete lineup in InningSelector - this will be passed to the component
  const confirmDeleteLineup = () => {
    handleDeleteLineup();
  };
  
  return (
    <div className="container mx-auto px-1 py-0 max-w-full">
      {/* Toast Component */}
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={hideToast}
        duration={2000}
      />
      
      <div className="mb-0 mt-[-10px]">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-1 gap-2">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Offensive Lineup</h1>
          </div>
          
          {/* Action buttons next to the title */}
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            {/* Back button */}
            <button
              onClick={() => router.push(`/score-game/${params.teamId}`)}
              className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            {/* Defensive Positions button */}
            <button
              onClick={() => router.push(`/score-game/${params.teamId}/lineup/${params.gameId}/defense`)}
              className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
              <span>Defensive Positions</span>
            </button>
            
            {/* Save Lineup button */}
            <button 
              onClick={saveLineups}
              className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Save</span>
            </button>
            
            {/* Delete Lineup button */}
            <button 
              onClick={handleDeleteLineup}
              className={`flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium transition-colors ${
                (activeTab === 'home' ? homeLineup : awayLineup)?.some(p => p.inning_number === currentInning)
                  ? 'text-red-700 border-red-500 hover:bg-red-50 border'
                  : 'text-gray-400 border-gray-300 cursor-not-allowed border'
              }`}
              disabled={!(activeTab === 'home' ? homeLineup : awayLineup)?.some(p => p.inning_number === currentInning)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Inning</span>
            </button>
          </div>
        </div>
        
        {/* InningSelector with add player form inline */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
            <div className="w-full md:w-auto">
              <label className="block text-xs text-gray-500 mb-1">Innings</label>
              <div className="mt-1">
                <InningSelector 
                  currentInning={currentInning}
                  setCurrentInning={setCurrentInning}
                  availableInnings={availableInnings}
                  handleAddInning={handleAddInning}
                  saveLineups={saveLineups}
                  lineupChanged={lineupChanged}
                  activeTab={activeTab}
                  homeLineup={homeLineup}
                  awayLineup={awayLineup}
                  handleDeleteLineup={handleDeleteLineup}
                  hideActionButtons={true}
                  isLoading={loading}
                  key={`inning-selector-${homeLineup.length}-${awayLineup.length}-${activeTab}`}
                />
              </div>
            </div>
            
            {/* Add player form - show if we have valid lineup */}
            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
              {activeTab === myTeamHa ? (
                <div className="relative w-48">
                  <label className="block text-xs text-gray-500 mb-1">Player</label>
                  <select
                    id="playerSelect"
                    className="w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    onChange={(e) => {
                      // Store selected player ID in a data attribute
                      e.currentTarget.dataset.selectedPlayerId = e.currentTarget.value;
                    }}
                  >
                    <option value="">Select a player...</option>
                    {activePlayersList.map(player => (
                      <option key={player.jersey_number} value={player.jersey_number}>
                        #{player.jersey_number} - {player.player_name} {player.position ? `(${player.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="relative w-16">
                    <label className="block text-xs text-gray-500 mb-1">Jersey #</label>
                    <input
                      type="text"
                      id="jerseyInput"
                      placeholder="#"
                      className="w-full py-2 px-2 text-center border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => {
                        // Always update the name field to match the current jersey number
                        const nameInput = document.getElementById('nameInput') as HTMLInputElement;
                        if (nameInput) {
                          nameInput.value = e.target.value;
                        }
                      }}
                    />
                  </div>
                  
                  <div className="relative w-32">
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      id="nameInput"
                      placeholder="Player Name"
                      className="w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
              
              <div className="relative w-16">
                <label className="block text-xs text-gray-500 mb-1">Order #</label>
                <input
                  type="text"
                  value={getNextOrderNumber()}
                  disabled
                  className="w-full py-2 px-2 text-center border border-gray-300 bg-gray-100 rounded-md shadow-sm text-gray-600 text-xs focus:outline-none"
                />
              </div>
              
              <div className="relative w-16">
                <label className="block text-xs text-gray-500 mb-1">Inning</label>
                <input
                  type="text"
                  value={currentInning}
                  disabled
                  className="w-full py-2 px-2 text-center border border-gray-300 bg-gray-100 rounded-md shadow-sm text-gray-600 text-xs focus:outline-none"
                />
              </div>
              
              <div className="mt-5">
                <button
                  onClick={() => {
                    if (activeTab === myTeamHa) {
                      const selectElem = document.getElementById('playerSelect') as HTMLSelectElement;
                      const selectedPlayerId = selectElem?.value;
                      if (selectedPlayerId) {
                        const selectedPlayer = activePlayersList.find(p => p.jersey_number === selectedPlayerId);
                        if (selectedPlayer) {
                          handleAddPlayer({
                            jersey_number: selectedPlayer.jersey_number,
                            player_name: selectedPlayer.player_name
                          }, currentInning);
                          
                          // Reset the select element
                          selectElem.value = "";
                        }
                      }
                    } else {
                      const jerseyInput = document.getElementById('jerseyInput') as HTMLInputElement;
                      const nameInput = document.getElementById('nameInput') as HTMLInputElement;
                      if (jerseyInput && nameInput && jerseyInput.value && nameInput.value) {
                        handleAddPlayer({
                          jersey_number: jerseyInput.value,
                          player_name: nameInput.value
                        }, currentInning);
                        
                        // Reset the input fields
                        jerseyInput.value = '';
                        nameInput.value = '';
                      }
                    }
                  }}
                  className="py-2 px-3 border rounded-md shadow-sm text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 border-indigo-600 text-indigo-600 bg-transparent hover:bg-indigo-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Team tabs - kept separate from AddPlayerForm */}
      <div className="border-b border-gray-200 bg-gray-100 shadow-sm rounded-t-lg mt-2">
        <nav className="flex items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => {
                // Only change tab if it's different
                if (activeTab !== 'away') {
                  setActiveTab('away');
                  setCurrentInning(1);
                  
                  // Load roster players if this is "my team"
                  if (myTeamHa === 'away') {
                    // Simple inline timeout to allow state to update first
                    setTimeout(() => {
                      fetchRosterPlayers();
                    }, 50);
                  } else {
                    // For opponent, clear roster
                    setRosterPlayers([]);
                    setActivePlayersList([]);
                  }
                }
              }}
              className={`relative mr-4 py-3.5 px-6 font-medium text-sm transition-all duration-200 focus:outline-none ${
                activeTab === 'away'
                  ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600 font-semibold -mb-px rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              {myTeamHa === 'away' ? 'My Team (Away)' : 'Away Team'}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t transform transition-transform duration-200 ${activeTab === 'away' ? 'scale-x-100' : 'scale-x-0'}`}></div>
            </button>
            <button
              onClick={() => {
                // Only change tab if it's different
                if (activeTab !== 'home') {
                  setActiveTab('home');
                  setCurrentInning(1);
                  
                  // Load roster players if this is "my team"
                  if (myTeamHa === 'home') {
                    // Simple inline timeout to allow state to update first
                    setTimeout(() => {
                      fetchRosterPlayers();
                    }, 50);
                  } else {
                    // For opponent, clear roster
                    setRosterPlayers([]);
                    setActivePlayersList([]);
                  }
                }
              }}
              className={`relative mr-4 py-3.5 px-6 font-medium text-sm transition-all duration-200 focus:outline-none ${
                activeTab === 'home'
                  ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600 font-semibold -mb-px rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              {myTeamHa === 'home' ? 'My Team (Home)' : 'Home Team'}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t transform transition-transform duration-200 ${activeTab === 'home' ? 'scale-x-100' : 'scale-x-0'}`}></div>
            </button>
          </div>
          
          {/* Score Game button - only shows when My Team has at least one inning saved */}
          {((myTeamHa === 'home' && homeLineup.some(p => p.inning_number > 0)) || 
            (myTeamHa === 'away' && awayLineup.some(p => p.inning_number > 0))) && !lineupChanged && (
            <button 
              onClick={() => router.push(`/score-game/${params.teamId}/score/${params.gameId}`)}
              className="flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 transition-all duration-300 shadow-sm animate-fadeIn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Score Game</span>
            </button>
          )}
        </nav>
      </div>
      
      {/* Current team lineup - all innings horizontally */}
      <div className="bg-white shadow-sm rounded-b-lg overflow-hidden mb-6 border border-gray-200 border-t-0">
        <div className="p-4">
          {(() => {
            const currentTeamLineup = activeTab === 'home' ? homeLineup : awayLineup;
            
            // Get all innings that have lineup data
            const existingInnings = Array.from(new Set(currentTeamLineup.map(p => p.inning_number))).sort((a, b) => a - b);
            
            // Ensure we have the current inning and the next inning in our display
            let inningsToDisplay = [...existingInnings];
            
            // Always include the current inning if not already in the list
            if (!inningsToDisplay.includes(currentInning)) {
              inningsToDisplay.push(currentInning);
            }
            
            // Maybe include the next inning if it's available
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
              <div className="overflow-x-auto pb-4 w-full">
                <div className="flex space-x-6 min-w-max">
                  {inningsToDisplay.map(inning => (
                    <div 
                      key={inning} 
                      className={`flex-none ${inning === currentInning ? 'border border-indigo-600 rounded-lg' : ''}`}
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
                          showToast(`Player ${player.name} (#${player.jersey_number}) removed from lineup`, 'info');
                          setLineupChanged(true);
                        } : undefined}
                        onMovePlayer={inning === currentInning ? (player: Player, direction: 'up' | 'down') => {
                          handleMovePlayer(player, direction);
                          showToast(`Player ${player.name} moved ${direction}`, 'info');
                        } : undefined}
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
    </div>
  );
} 