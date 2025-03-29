"use client"

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DefensiveLineupTable, { DefensivePlayer, DEFENSIVE_POSITIONS, getPositionName } from "../components/DefensiveLineupTable";
import InningSelector from "../components/InningSelector";
import PositionSelect from "../components/PositionSelect";
import Toast from '../components/Toast';

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

// Helper function to process defensive lineup data
const processDefensiveLineupData = (data: any, homeOrAway: 'home' | 'away'): DefensivePlayer[] => {
  let lineupData: DefensivePlayer[] = [];
  
  if (data && data.innings_data) {
    Object.entries(data.innings_data).forEach(([inning, players]) => {
      const inningNumber = parseInt(inning);
      
      // Check if players is an array before processing
      if (Array.isArray(players)) {
        (players as any[]).forEach(player => {
          lineupData.push({
            jersey_number: player.jersey_number,
            name: player.player_name,
            order_number: player.position_number, // Using position_number instead of order_number
            inning_number: inningNumber,
            home_or_away: homeOrAway,
            batter_seq_id: player.batter_seq_id || 1, // Default to 1 if not provided
            batter_seq_id_to: player.batter_seq_id_to || 999 // Default to 999 if not provided
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

export default function DefensiveLineup() {
  const params = useParams();
  const router = useRouter();
  const [homeLineup, setHomeLineup] = useState<DefensivePlayer[]>([]);
  const [awayLineup, setAwayLineup] = useState<DefensivePlayer[]>([]);
  const [myTeamHa, setMyTeamHa] = useState<'home' | 'away'>('home');
  const [currentInning, setCurrentInning] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('away');
  const [lineupChanged, setLineupChanged] = useState(false);
  const [rosterPlayers, setRosterPlayers] = useState<{
    jersey_number: string;
    player_name: string;
    position?: string;
  }[]>([]);
  const [lineupOperationInProgress, setLineupOperationInProgress] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number>(0); // Default to BENCH
  
  // Create refs inside the component
  const isInitialRender = React.useRef(true);
  
  // Default 7 innings with ability to add more
  const [availableInnings, setAvailableInnings] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [maxInning, setMaxInning] = useState<number>(7);
  
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
  const handleCopyPreviousInning = async () => {
    if (currentInning <= 1) return; // Can't copy if we're on inning 1
    
    try {
      const prevInning = currentInning - 1;
      
      // Check if the current inning already has players
      const currentInningPlayers = getCurrentInningPlayers();
      if (currentInningPlayers.length > 0) {
        if (!confirm(`Inning ${currentInning} already has players. Do you want to continue? This operation will first delete existing players.`)) {
          return;
        }
      }
      
      // Show confirmation dialog
      if (!confirm(`Are you sure you want to copy the ${activeTab} defensive lineup from inning ${prevInning} to inning ${currentInning}?`)) {
        return;
      }
      
      setLineupOperationInProgress(true);
      
      // Show toast notification for starting the copy operation
      showToast(`Copying players from inning ${prevInning} to ${currentInning}...`, 'info');
      
      // Parse teamId and gameId from params
      const teamId = parseInt(params.teamId as string);
      const gameId = parseInt(params.gameId as string);
      
      // Build the endpoint URL for the copy operation
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/defense/${teamId}/${gameId}/${activeTab}/copy/${prevInning}/${currentInning}`;
      
      console.log('Copy inning API endpoint:', endpoint);
      
      // Call the API to copy the inning
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        try {
          const responseData = await response.json().catch(() => null);
          console.log('Copy response:', responseData);
          
          const successMessage = responseData?.message || `Players copied from inning ${prevInning} to ${currentInning}`;
          showToast(successMessage, 'success');
          
          // Re-fetch the defensive lineups to get the updated data
          await fetchDefensiveLineups();
          
          // Set the lineup as changed to reflect the new state
          setLineupChanged(true);
        } catch (error) {
          console.error('Error processing copy response:', error);
          showToast(`Players copied from inning ${prevInning} to ${currentInning}`, 'success');
          
          // Re-fetch the defensive lineups even if processing the response failed
          await fetchDefensiveLineups();
          setLineupChanged(true);
        }
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to copy lineup from inning ${prevInning} to ${currentInning}`;
        
        showToast(errorMessage, 'error');
        console.error('Error copying inning:', errorData || response.status);
      }
    } catch (error) {
      console.error('Error in copy inning operation:', error);
      showToast('An error occurred while copying the inning. Please try again.', 'error');
    } finally {
      // Reset the operation flag after copying
      setTimeout(() => {
        setLineupOperationInProgress(false);
      }, 300);
    }
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
      
      // Update available innings state - ensure no duplicates
      setAvailableInnings(prev => {
        if (prev.includes(nextInning)) return prev;
        const newInnings = [...prev, nextInning].sort((a, b) => a - b);
        return newInnings;
      });
      
      // Set current inning to the new one and mark lineup as changed
      setCurrentInning(nextInning);
      setLineupChanged(true);
      
      // Use the copy endpoint to copy the previous inning's data
      showToast(`Copying lineup from inning ${lastSavedInning} to inning ${nextInning}...`, 'info');
      
      // Make sure we're using the correct API URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
      
      const copyResponse = await fetch(
        `${apiBaseUrl}/defense/${params.teamId}/${params.gameId}/${activeTab}/copy/${lastSavedInning}/${nextInning}`,
        { method: 'POST' }
      );
      
      if (copyResponse.ok) {
        showToast(`Added inning ${nextInning} with data from inning ${lastSavedInning}`, 'success');
        
        // Refresh defensive lineup data to show the copied players
        await fetchDefensiveLineups();
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
  
  // Fetch defensive lineups
  const fetchDefensiveLineups = async () => {
    try {
      // Validate required parameters
      if (!params.teamId || !params.gameId || params.teamId === 'undefined' || params.gameId === 'undefined') {
        console.error('Invalid teamId or gameId parameters', { teamId: params.teamId, gameId: params.gameId });
        setHomeLineup([]);
        setAwayLineup([]);
        return;
      }
      
      // Log the URLs we're fetching for debugging purposes
      const homeEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/defense/${params.teamId}/${params.gameId}/home`;
      const awayEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/defense/${params.teamId}/${params.gameId}/away`;
      
      console.log('Fetching defensive lineups from:', { homeEndpoint, awayEndpoint });
      
      // Fetch both lineups concurrently for efficiency
      const [homeResponse, awayResponse] = await Promise.all([
        fetch(homeEndpoint),
        fetch(awayEndpoint)
      ]);
      
      // Process home lineup data
      let homeLineupData: DefensivePlayer[] = [];
      if (homeResponse.ok) {
        try {
          const responseText = await homeResponse.text();
          console.log('Raw home response:', responseText);
          const homeData = JSON.parse(responseText);
          console.log('Parsed home data:', homeData);
          homeLineupData = processDefensiveLineupData(homeData, 'home');
          console.log('Processed home lineup:', homeLineupData);
          setHomeLineup(homeLineupData);
        } catch (error) {
          console.error('Error processing home defensive lineup:', error);
          setHomeLineup([]);
        }
      } else {
        console.error('Error fetching home defensive lineup:', homeResponse.status);
        setHomeLineup([]);
      }
      
      // Process away lineup data
      let awayLineupData: DefensivePlayer[] = [];
      if (awayResponse.ok) {
        try {
          const responseText = await awayResponse.text();
          console.log('Raw away response:', responseText);
          const awayData = JSON.parse(responseText);
          console.log('Parsed away data:', awayData);
          awayLineupData = processDefensiveLineupData(awayData, 'away');
          console.log('Processed away lineup:', awayLineupData);
          setAwayLineup(awayLineupData);
        } catch (error) {
          console.error('Error processing away defensive lineup:', error);
          setAwayLineup([]);
        }
      } else {
        console.error('Error fetching away defensive lineup:', awayResponse.status);
        setAwayLineup([]);
      }
      
      // Update innings after both lineups are loaded
      const allInningNumbers = [
        ...homeLineupData.map(p => p.inning_number),
        ...awayLineupData.map(p => p.inning_number)
      ];
      
      // Ensure we have at least innings 1-7 available plus any additional innings with data
      const baseInnings = [1, 2, 3, 4, 5, 6, 7];
      
      if (allInningNumbers.length > 0) {
        // Get unique inning numbers
        const uniqueInnings = Array.from(new Set(allInningNumbers)).sort((a, b) => a - b);
        const mergedInnings = Array.from(new Set([...baseInnings, ...uniqueInnings])).sort((a, b) => a - b);
        
        setAvailableInnings(mergedInnings);
        setMaxInning(Math.max(...mergedInnings));
      }
    } catch (error) {
      console.error('Error fetching defensive lineups:', error);
      setHomeLineup([]);
      setAwayLineup([]);
    }
  };
  
  // Fetch roster players for the current team
  const fetchRosterPlayers = async () => {
    try {
      // Validate required parameters
      if (!params.teamId || params.teamId === 'undefined') {
        console.error('Invalid teamId parameter', { teamId: params.teamId });
        setRosterPlayers(getDefaultPlayers());
        return;
      }
      
      // Use the active_players endpoint for my team's data
      const teamActivePlayersEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/teams/${params.teamId}/active_players`;
      console.log('Fetching roster players from:', teamActivePlayersEndpoint);
      
      // Only fetch roster players for the user's team, use default players for opponent
      if (myTeamHa === activeTab) {
        // Fetch active players for my team
        try {
          const response = await fetch(teamActivePlayersEndpoint);
          
          if (response.ok) {
            const rawText = await response.text();
            console.log('Raw response:', rawText);
            const data = JSON.parse(rawText);
            console.log('Parsed roster data:', data);
            
            // Handle the new active_players endpoint format
            if (data.active_players && Array.isArray(data.active_players)) {
              // Transform the active_players format to our roster player format
              const transformedPlayers = data.active_players.map((player: { 
                jersey_number: number | string; 
                player_name: string; 
                position: string 
              }) => ({
                jersey_number: player.jersey_number.toString(),
                player_name: player.player_name,
                position: player.position // we'll keep this additional data
              }));
              
              console.log('Setting active players list:', transformedPlayers);
              // Store active players separately for use elsewhere in the UI
              setActivePlayersList(transformedPlayers);
              setRosterPlayers(transformedPlayers);
            } 
            // Fall back to handling the traditional roster format
            else if (Array.isArray(data)) {
              console.log('Setting active players from array data:', data);
              setRosterPlayers(data);
              setActivePlayersList(data);
            } else {
              console.warn('Unexpected roster data format, using defaults');
              setRosterPlayers(getDefaultPlayers());
            }
          } else {
            console.warn(`Failed to fetch roster players: ${response.status}`);
            setRosterPlayers(getDefaultPlayers());
          }
        } catch (error) {
          console.error('Error fetching roster players:', error);
          setRosterPlayers(getDefaultPlayers());
        }
      } else {
        // For opponent team, use empty roster since we'll add players manually
        console.log('Using empty roster for opponent team');
        setRosterPlayers([]);
        // Clear active players list for opponent team
        setActivePlayersList([]);
      }
    } catch (error) {
      console.error('Error in fetchRosterPlayers:', error);
      setRosterPlayers(getDefaultPlayers());
    }
  };
  
  // Function to add a player to the defensive lineup
  const handleAddPlayer = (player: {
    jersey_number: string;
    player_name: string;
    position?: string;
  }, inning: number, positionNumber: number) => {
    const teamType = activeTab;
    const existingLineup = teamType === 'home' ? homeLineup : awayLineup;
    const setLineup = teamType === 'home' ? setHomeLineup : setAwayLineup;
    
    // Get the batter sequence ID from the input field
    const batterSeqInput = document.getElementById('batterSeqInput') as HTMLInputElement;
    const batterSeqId = batterSeqInput?.value ? parseInt(batterSeqInput.value) : 1; // Default to 1 if not provided
    
    // Get the batter sequence ID TO from the input field
    const batterSeqToInput = document.getElementById('batterSeqToInput') as HTMLInputElement;
    const batterSeqIdTo = batterSeqToInput?.value ? parseInt(batterSeqToInput.value) : 999; // Default to 999 if not provided
    
    // Check if we already have a player in this position for this inning
    // except for position 0 (bench) which can have multiple players
    if (positionNumber !== 0) {
      // Find current player(s) in this position
      const playersInThisPosition = existingLineup.filter(p => 
        p.inning_number === inning && 
        p.order_number === positionNumber
      );
      
      if (playersInThisPosition.length > 0) {
        // Check if any players have a batter_seq_id_to of 999 (still active)
        const activePlayer = playersInThisPosition.find(p => p.batter_seq_id_to === 999);
        
        if (activePlayer) {
          // Check that the new player's batter_seq_id is greater than the active player's batter_seq_id
          if (batterSeqId <= activePlayer.batter_seq_id) {
            showToast(`New player's batter sequence ID must be greater than ${activePlayer.batter_seq_id}`, 'error');
            return;
          }
          
          // Update the active player's batter_seq_id_to to be one less than the new player's batter_seq_id
          const updatedLineup = existingLineup.map(p => {
            if (
              p.inning_number === inning && 
              p.order_number === positionNumber && 
              p.jersey_number === activePlayer.jersey_number &&
              p.batter_seq_id === activePlayer.batter_seq_id
            ) {
              return {
                ...p,
                batter_seq_id_to: batterSeqId - 1
              };
            }
            return p;
          });
          
          // Update the lineup state with the updated player
          if (teamType === 'home') {
            setHomeLineup(updatedLineup);
          } else {
            setAwayLineup(updatedLineup);
          }
        }
      }
    }
    
    // Create a new defensive player
    const newPlayer: DefensivePlayer = {
      jersey_number: player.jersey_number,
      name: player.player_name,
      order_number: positionNumber, // Position number 1-9 (or 0 for bench)
      inning_number: inning,
      home_or_away: teamType,
      batter_seq_id: batterSeqId,
      batter_seq_id_to: batterSeqIdTo
    };
    
    // Add the new player to the lineup
    if (teamType === 'home') {
      setHomeLineup(prev => [...prev, newPlayer]);
    } else {
      setAwayLineup(prev => [...prev, newPlayer]);
    }
    
    // Show a toast notification
    showToast(`Player ${player.player_name} (#${player.jersey_number}) added to ${teamType} defense at ${getPositionName(positionNumber)}`, 'success');
    
    setLineupChanged(true);
  };
  
  // Save defensive lineups
  const saveDefensiveLineups = async () => {
    try {
      // Parse teamId and gameId from params
      const teamId = parseInt(params.teamId as string);
      const gameId = parseInt(params.gameId as string);
      
      // Only format and save data for the active tab and current inning
      let lineupData;
      let endpoint;
      
      // Filter for only the current inning's players to avoid duplication
      const currentInningPlayers = getCurrentInningPlayers();
      
      // Check if there are any players to save
      if (currentInningPlayers.length === 0) {
        showToast(`No players found for inning ${currentInning} to save`, 'warning');
        return;
      }
      
      // Format the data we're going to send to the API
      const dataToSend = currentInningPlayers.map(player => ({
        team_id: teamId,
        game_id: gameId,
        home_or_away: activeTab,
        inning_number: player.inning_number,
        position_number: player.order_number, // Using the order_number as position_number
        jersey_number: player.jersey_number,
        player_name: player.name,
        batter_seq_id: player.batter_seq_id || 1, // Default to 1 if not set
        batter_seq_id_to: player.batter_seq_id_to || 999 // Default to 999 (end of inning) if not set
      }));
      
      // Console log the JSON data being sent to the API
      console.log('DEFENSIVE LINEUP DATA:');
      console.log(JSON.stringify(dataToSend, null, 2));
      
      // Determine endpoint based on active tab
      endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/defense/${teamId}/${gameId}/${activeTab}/${currentInning}`;
      console.log('API Endpoint:', endpoint);
      
      // Show saving toast
      showToast(`Saving ${activeTab} defensive lineup for inning ${currentInning}...`, 'info');
      
      // Save lineup for active tab only
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (response.ok) {
        try {
          // Try to parse the response for any additional info
          const responseData = await response.json().catch(() => null);
          console.log('Save response:', responseData);
          
          // Update lineup state to reflect it's saved
          setLineupChanged(false);
          
          // Show success toast
          showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} defensive lineup for inning ${currentInning} saved successfully`, 'success');
          
          // Refresh the data to ensure we have the latest from the server
          await fetchDefensiveLineups();
        } catch (error) {
          console.error('Error processing save response:', error);
          setLineupChanged(false);
          showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} defensive lineup saved`, 'success');
        }
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to save ${activeTab} defensive lineup. Please try again.`;
        console.error('Error saving lineup:', errorData || response.status);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error in saveDefensiveLineups:', error);
      showToast('An error occurred while saving the defensive lineup.', 'error');
    }
  };
  
  // Delete defensive lineup for the current inning and active tab
  const handleDeleteLineup = async () => {
    try {
      // Parse teamId and gameId from params
      const teamId = parseInt(params.teamId as string);
      const gameId = parseInt(params.gameId as string);
      
      // Check if there are any players to delete
      const currentInningPlayers = getCurrentInningPlayers();
      if (currentInningPlayers.length === 0) {
        showToast(`No players found for inning ${currentInning} to delete`, 'warning');
        return;
      }
      
      // Show confirmation dialog
      if (!confirm(`Are you sure you want to delete the ${activeTab} defensive lineup for inning ${currentInning}?`)) {
        return;
      }
      
      // Show loading toast
      showToast(`Deleting ${activeTab} defensive lineup for inning ${currentInning}...`, 'info');
      
      // Determine the endpoint based on active tab
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/defense/${teamId}/${gameId}/${activeTab}/${currentInning}`;
      console.log('Delete API Endpoint:', endpoint);
      
      // Make DELETE request to the API
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        try {
          // Try to parse the response for any additional info
          const responseData = await response.json().catch(() => null);
          console.log('Delete response:', responseData);
          
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
          showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} defensive lineup for inning ${currentInning} deleted`, 'success');
          
          // Mark as changed
          setLineupChanged(true);
          
          // Refresh the data to ensure we have the latest from the server
          await fetchDefensiveLineups();
        } catch (error) {
          console.error('Error processing delete response:', error);
          
          // Still update local state even if processing the response failed
          if (activeTab === 'home') {
            setHomeLineup(homeLineup.filter(p => p.inning_number !== currentInning));
          } else {
            setAwayLineup(awayLineup.filter(p => p.inning_number !== currentInning));
          }
          
          showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} defensive lineup deleted`, 'success');
          setLineupChanged(true);
        }
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to delete defensive lineup. Server returned: ${response.status}`;
        console.error('Error deleting lineup:', errorData || response.status);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error in handleDeleteLineup:', error);
      showToast('An error occurred while deleting the defensive lineup', 'error');
    }
  };
  
  // Helper function to get players for the current inning and tab
  const getCurrentInningPlayers = (): DefensivePlayer[] => {
    const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
    
    // Filter players for the current inning
    const inningPlayers = currentLineup.filter(player => player.inning_number === currentInning);
    
    return inningPlayers;
  };
  
  // Function to handle moving a player's position
  const handlePositionChange = (player: DefensivePlayer, newPosition: number) => {
    const teamType = player.home_or_away;
    const existingLineup = teamType === 'home' ? homeLineup : awayLineup;
    const setLineup = teamType === 'home' ? setHomeLineup : setAwayLineup;
    
    // Check if we already have a player in this position for this inning
    // except for position 0 (bench) which can have multiple players
    if (newPosition !== 0) {
      const existingPlayerInPosition = existingLineup.find(p => 
        p.inning_number === player.inning_number && 
        p.order_number === newPosition &&
        // Make sure it's not the same player
        !(p.jersey_number === player.jersey_number && p.order_number === player.order_number)
      );
      
      if (existingPlayerInPosition) {
        showToast(`Position ${getPositionName(newPosition)} already filled. Remove existing player first.`, 'warning');
        return;
      }
    }
    
    // Update the player's position
    const updatedLineup = existingLineup.map(p => {
      if (p.inning_number === player.inning_number && 
          p.jersey_number === player.jersey_number &&
          p.order_number === player.order_number) {
        return { ...p, order_number: newPosition };
      }
      return p;
    });
    
    // Update the lineup
    setLineup(updatedLineup);
    setLineupChanged(true);
    showToast(`Player ${player.name} (#${player.jersey_number}) moved to ${getPositionName(newPosition)}`, 'info');
  };
  
  // Function to check if a batter sequence ID is valid for a position
  const checkBatterSequenceAvailability = (inning: number, positionNumber: number, batterSeqId: number): boolean => {
    if (positionNumber === 0) return true; // Bench position can have any batter_seq_id
    
    const existingLineup = activeTab === 'home' ? homeLineup : awayLineup;
    
    // Find players in this position for this inning
    const playersInPosition = existingLineup.filter(p => 
      p.inning_number === inning && 
      p.order_number === positionNumber
    );
    
    // Check if any player is active at this batter sequence
    const overlappingPlayer = playersInPosition.find(p => 
      batterSeqId >= p.batter_seq_id && batterSeqId <= p.batter_seq_id_to
    );
    
    return !overlappingPlayer; // If no overlapping player, the sequence is available
  };
  
  // Function to get the current highest batter sequence ID for this position
  const getNextAvailableBatterSeqId = (inning: number, positionNumber: number): number => {
    if (positionNumber === 0) return 1; // Bench position can start at 1
    
    const existingLineup = activeTab === 'home' ? homeLineup : awayLineup;
    
    // Find players in this position for this inning
    const playersInPosition = existingLineup.filter(p => 
      p.inning_number === inning && 
      p.order_number === positionNumber
    );
    
    if (playersInPosition.length === 0) return 1; // First player starts at 1
    
    // Find the highest batter_seq_id_to value
    const highestEndSeq = Math.max(...playersInPosition.map(p => p.batter_seq_id_to));
    
    // If someone is still active (has 999), find their batter_seq_id
    const activePlayer = playersInPosition.find(p => p.batter_seq_id_to === 999);
    
    if (activePlayer) {
      return activePlayer.batter_seq_id + 1; // Next available is one more than current active player's start
    } else if (highestEndSeq < 999) {
      return highestEndSeq + 1; // Next available is after the highest end sequence
    } else {
      return 1; // Default to 1 if no players or only inactive players
    }
  };
  
  // Effect to ensure player list is loaded when activeTab changes
  useEffect(() => {
    // Check if we're on the user's team tab and if the player list is empty
    if (activeTab === myTeamHa && activePlayersList.length === 0) {
      console.log('Player list is empty for my team tab. Re-fetching roster data.');
      fetchRosterPlayers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, myTeamHa, activePlayersList.length]);
  
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
        
        // 3. Fetch defensive lineup data
        await fetchDefensiveLineups();
        
        // 4. Fetch roster players after setting the active tab
        console.log('Initial load: fetching roster players for', teamType);
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
            <h1 className="text-2xl font-bold">Defensive Lineup</h1>
            {/* Team → Game → Offense → Defense*/}
          </div>
          
          {/* Action buttons next to the title */}
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <button
              onClick={() => router.push(`/score-game/${params.teamId}/lineup/${params.gameId}`)}
              className="flex items-center justify-center py-2 px-3 rounded-md shadow-sm text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Offense
            </button>
            
            {/* Save Lineup button */}
            <button 
              onClick={saveDefensiveLineups}
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
        
        {/* InningSelector with position input form */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
            <div className="w-full md:w-auto">
              <label className="block text-xs text-gray-500 mb-1">Innings</label>
              <div className="mt-1">
                <InningSelector 
                  currentInning={currentInning}
                  setCurrentInning={setCurrentInning}
                  availableInnings={availableInnings}
                  handleCopyPreviousInning={handleCopyPreviousInning}
                  handleAddInning={handleAddInning}
                  saveLineups={saveDefensiveLineups}
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
            
            {/* Position selection and player inputs */}
            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
              <div className="relative w-20">
                <div className="h-6 mb-1 flex items-end">
                  <label className="block text-xs text-gray-500">Position</label>
                </div>
                <PositionSelect
                  value={selectedPosition}
                  onChange={(position) => {
                    setSelectedPosition(position);
                    
                    // Auto-populate the batter sequence input with the next available ID
                    const nextAvailableId = getNextAvailableBatterSeqId(currentInning, position);
                    
                    // Update the "From Batter" input field
                    const batterSeqInput = document.getElementById('batterSeqInput') as HTMLInputElement;
                    if (batterSeqInput) {
                      batterSeqInput.value = nextAvailableId.toString();
                    }
                    
                    // Reset the "To Batter" input field to 999 (active)
                    const batterSeqToInput = document.getElementById('batterSeqToInput') as HTMLInputElement;
                    if (batterSeqToInput) {
                      batterSeqToInput.value = '999';
                    }
                  }}
                />
              </div>
              
              {activeTab === myTeamHa ? (
                <div className="relative w-32">
                  <div className="h-6 mb-1 flex items-end">
                    <label className="block text-xs text-gray-500">Player</label>
                  </div>
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
                    <div className="h-6 mb-1 flex items-end">
                      <label className="block text-xs text-gray-500">Jersey #</label>
                    </div>
                    <input
                      type="text"
                      id="jerseyInput"
                      placeholder="#"
                      className="w-full py-2 px-2 text-center border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="relative w-32">
                    <div className="h-6 mb-1 flex items-end">
                      <label className="block text-xs text-gray-500">Name</label>
                    </div>
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
                <div className="h-6 mb-1 flex items-end">
                  <label className="block text-xs text-gray-500">Inning</label>
                </div>
                <input
                  type="text"
                  value={currentInning}
                  disabled
                  className="w-full py-2 px-2 text-center border border-gray-300 bg-gray-100 rounded-md shadow-sm text-gray-600 text-xs focus:outline-none"
                />
              </div>
              
              <div className="relative w-16">
                <div className="h-6 mb-1 flex items-end">
                  <label className="block text-xs text-gray-500 flex items-center">
                    From Batter
                    <div className="relative ml-1 group cursor-help">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        Next available: {getNextAvailableBatterSeqId(currentInning, selectedPosition)}
                      </div>
                    </div>
                  </label>
                </div>
                <input
                  type="number"
                  id="batterSeqInput"
                  placeholder="1"
                  defaultValue="1"
                  min="1"
                  className="w-full py-2 px-2 text-center border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    // Check if this batter sequence ID is available
                    if (value >= 1) {
                      const isAvailable = checkBatterSequenceAvailability(currentInning, selectedPosition, value);
                      if (!isAvailable) {
                        showToast(`Batter sequence ID ${value} is already taken for this position`, 'warning');
                      }
                    }
                  }}
                />
              </div>
              
              <div className="relative w-16">
                <div className="h-6 mb-1 flex items-end">
                  <label className="block text-xs text-gray-500 flex items-center">
                    To Batter
                    <div className="relative ml-1 group cursor-help">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 w-40 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        Use 999 for active players
                      </div>
                    </div>
                  </label>
                </div>
                <input
                  type="number"
                  id="batterSeqToInput"
                  placeholder="999"
                  defaultValue="999"
                  min="1"
                  className="w-full py-2 px-2 text-center border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="relative flex self-end mt-[22px]">
                <button
                  onClick={() => {
                    // Check if we're on the user's team tab but have no players loaded
                    if (activeTab === myTeamHa && activePlayersList.length === 0) {
                      console.log('Trying to add player but roster is empty. Re-fetching roster data.');
                      fetchRosterPlayers();
                      return; // Wait for roster to load before adding player
                    }
                    
                    if (activeTab === myTeamHa) {
                      const selectElem = document.getElementById('playerSelect') as HTMLSelectElement;
                      const selectedPlayerId = selectElem?.value;
                      if (selectedPlayerId) {
                        const selectedPlayer = activePlayersList.find(p => p.jersey_number === selectedPlayerId);
                        if (selectedPlayer) {
                          handleAddPlayer({
                            jersey_number: selectedPlayer.jersey_number,
                            player_name: selectedPlayer.player_name
                          }, currentInning, selectedPosition);
                          
                          // Reset the select element
                          selectElem.value = "";
                          
                          // Reset the batter sequence input fields
                          const batterSeqInput = document.getElementById('batterSeqInput') as HTMLInputElement;
                          if (batterSeqInput) {
                            batterSeqInput.value = '1';
                          }
                          
                          const batterSeqToInput = document.getElementById('batterSeqToInput') as HTMLInputElement;
                          if (batterSeqToInput) {
                            batterSeqToInput.value = '999';
                          }
                        }
                      }
                    } else {
                      const jerseyInput = document.getElementById('jerseyInput') as HTMLInputElement;
                      const nameInput = document.getElementById('nameInput') as HTMLInputElement;
                      if (jerseyInput && nameInput && jerseyInput.value && nameInput.value) {
                        handleAddPlayer({
                          jersey_number: jerseyInput.value,
                          player_name: nameInput.value
                        }, currentInning, selectedPosition);
                        
                        // Reset the input fields
                        jerseyInput.value = '';
                        nameInput.value = '';
                        
                        // Reset the batter sequence input fields
                        const batterSeqInput = document.getElementById('batterSeqInput') as HTMLInputElement;
                        if (batterSeqInput) {
                          batterSeqInput.value = '1';
                        }
                        
                        const batterSeqToInput = document.getElementById('batterSeqToInput') as HTMLInputElement;
                        if (batterSeqToInput) {
                          batterSeqToInput.value = '999';
                        }
                      }
                    }
                  }}
                  className="h-[34px] px-3 border rounded-md shadow-sm text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 border-indigo-600 text-indigo-600 bg-transparent hover:bg-indigo-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Team tabs - kept separate from position form */}
      <div className="border-b border-gray-200 bg-gray-100 shadow-sm rounded-t-lg mt-2">
        <nav className="flex items-center px-4">
          <button
            onClick={() => {
              if (activeTab !== 'away') {
                setActiveTab('away');
                setCurrentInning(1); // Reset to inning 1 when switching tabs
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
              if (activeTab !== 'home') {
                setActiveTab('home');
                setCurrentInning(1); // Reset to inning 1 when switching tabs
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
                <p className="text-gray-500 py-4">No innings found for this team. Add players to create defensive lineup.</p>
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
                      <DefensiveLineupTable
                        players={currentTeamLineup.filter(player => player.inning_number === inning)}
                        isLoading={loading}
                        showActions={inning === currentInning}
                        onRemovePlayer={inning === currentInning ? (player: DefensivePlayer) => {
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
                          showToast(`Player ${player.name} (#${player.jersey_number}) removed from defensive lineup`, 'info');
                          setLineupChanged(true);
                        } : undefined}
                        onMovePlayer={inning === currentInning ? (player: DefensivePlayer, direction: 'up' | 'down' | 'bench') => {
                          // Get current team lineup
                          const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
                          const setLineup = activeTab === 'home' ? setHomeLineup : setAwayLineup;
                          
                          // Handle benching a player
                          if (direction === 'bench') {
                            // Skip if player is already on bench
                            if (player.order_number === 0) return;
                            
                            // Create a copy of the player with position changed to bench (0)
                            const updatedLineup = currentLineup.map(p => {
                              if (p.inning_number === player.inning_number && 
                                  p.jersey_number === player.jersey_number &&
                                  p.order_number === player.order_number) {
                                return { ...p, order_number: 0 }; // 0 = bench position
                              }
                              return p;
                            });
                            
                            setLineup(updatedLineup);
                            setLineupChanged(true);
                            showToast(`Moved ${player.name} from ${getPositionName(player.order_number)} to Bench`, 'info');
                            return; // Exit early after handling bench action
                          }
                          
                          // Skip if player is on bench (position 0) for up/down actions
                          if (player.order_number === 0) return;
                          
                          // Calculate the target position number
                          // Position order: P(1) -> C(2) -> 1B(3) -> 2B(4) -> 3B(5) -> SS(6) -> LF(7) -> CF(8) -> RF(9)
                          let targetPositionNumber;
                          if (direction === 'up') {
                            // Moving up means decreasing position number
                            targetPositionNumber = player.order_number - 1;
                            // Can't go lower than position 1 (pitcher)
                            if (targetPositionNumber < 1) return;
                          } else {
                            // Moving down means increasing position number
                            targetPositionNumber = player.order_number + 1;
                            // Can't go higher than position 9 (right field)
                            if (targetPositionNumber > 9) return;
                          }
                          
                          // Find a player in the target position for the same inning
                          const targetPlayer = currentLineup.find(p => 
                            p.inning_number === player.inning_number && 
                            p.order_number === targetPositionNumber
                          );
                          
                          // If no player in target position, just move this player
                          if (!targetPlayer) {
                            // Update only this player's position
                            const updatedLineup = currentLineup.map(p => {
                              if (p.inning_number === player.inning_number && 
                                  p.jersey_number === player.jersey_number &&
                                  p.order_number === player.order_number) {
                                return { ...p, order_number: targetPositionNumber };
                              }
                              return p;
                            });
                            
                            setLineup(updatedLineup);
                            setLineupChanged(true);
                            showToast(`Moved ${player.name} from ${getPositionName(player.order_number)} to ${getPositionName(targetPositionNumber)}`, 'info');
                          } else {
                            // Swap positions between the two players
                            const updatedLineup = currentLineup.map(p => {
                              if (p.inning_number === player.inning_number && 
                                  p.jersey_number === player.jersey_number &&
                                  p.order_number === player.order_number) {
                                // Current player gets target position
                                return { ...p, order_number: targetPositionNumber };
                              } else if (p.inning_number === targetPlayer.inning_number && 
                                        p.jersey_number === targetPlayer.jersey_number &&
                                        p.order_number === targetPositionNumber) {
                                // Target player gets current position
                                return { ...p, order_number: player.order_number };
                              }
                              return p;
                            });
                            
                            setLineup(updatedLineup);
                            setLineupChanged(true);
                            showToast(
                              `Swapped: ${player.name} from ${getPositionName(player.order_number)} to ${getPositionName(targetPositionNumber)} ` +
                              `with ${targetPlayer.name}`, 
                              'info'
                            );
                          }
                        } : undefined}
                        isReadOnly={inning !== currentInning}
                        emptyMessage={`No defensive players for inning ${inning}`}
                        inningNumber={inning}
                        currentInning={currentInning}
                        onInningClick={setCurrentInning}
                        allPlayers={currentTeamLineup}
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