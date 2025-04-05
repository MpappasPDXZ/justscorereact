"use client"

import { useEffect, useState, useRef } from "react";

// Helper function to convert MM-DD-YYYY to YYYY-MM-DD
const convertToHtmlDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Check if the date is already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Convert from MM-DD-YYYY to YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  
  return dateString;
};

// Helper function to convert YYYY-MM-DD to MM-DD-YYYY
const convertToDisplayDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Check if the date is already in MM-DD-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Convert from YYYY-MM-DD to MM-DD-YYYY
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  }
  
  return dateString;
};

interface GameDetail {
  user_team: number;
  coach: string;
  away_team_name: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  field_name: string;
  field_location: string;
  field_type: string;
  field_temperature: number;
  game_status: string;
  my_team_ha: string;
  game_id?: string;
}

interface EditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  gameData: GameDetail;
  teamId: string;
  gameId: string;
  isCreating?: boolean;
}

export default function EditGameModal({ isOpen, onClose, onSave, gameData, teamId, gameId, isCreating = false }: EditGameModalProps) {
  const [gameDetail, setGameDetail] = useState<GameDetail>({
    user_team: parseInt(teamId) || 0,
    coach: gameData.coach || '',
    away_team_name: gameData.away_team_name || '',
    event_date: gameData.event_date || '',
    event_hour: gameData.event_hour || 0,
    event_minute: gameData.event_minute || 0,
    field_name: gameData.field_name || '',
    field_location: gameData.field_location || '',
    field_type: gameData.field_type || '',
    field_temperature: gameData.field_temperature || 0,
    game_status: gameData.game_status || 'open',
    my_team_ha: gameData.my_team_ha || 'home',
    game_id: gameData.game_id || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    setGameDetail({
      user_team: parseInt(teamId) || 0,
      coach: gameData.coach || '',
      away_team_name: gameData.away_team_name || '',
      event_date: gameData.event_date || '',
      event_hour: gameData.event_hour || 0,
      event_minute: gameData.event_minute || 0,
      field_name: gameData.field_name || '',
      field_location: gameData.field_location || '',
      field_type: gameData.field_type || '',
      field_temperature: gameData.field_temperature || 0,
      game_status: gameData.game_status || 'open',
      my_team_ha: gameData.my_team_ha || 'home',
      game_id: gameData.game_id || ''
    });
  }, [gameData, teamId]);

  useEffect(() => {
    const fetchGameDetails = async () => {
      if (!isCreating && isOpen && !dataFetchedRef.current) {
        try {
          dataFetchedRef.current = true;
          console.log(`Fetching game details for team ${teamId}, game ${gameId}`);
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}/get_one_game`);
          if (!response.ok) throw new Error("Failed to fetch game details");
          const responseData = await response.json();
          console.log("API response data:", responseData);
          
          // Extract the game data from the nested structure
          const data = responseData.game_data || {};
          
          console.log("Extracted game data:", data);
          console.log("API response data types:", {
            user_team: typeof data.user_team,
            event_hour: typeof data.event_hour,
            event_minute: typeof data.event_minute,
            field_temperature: typeof data.field_temperature
          });
          
          // Ensure we have all required fields with proper types
          const updatedGameDetail = {
            user_team: parseInt(teamId) || 0,
            coach: data.coach || '',
            away_team_name: data.away_team_name || '',
            event_date: convertToHtmlDate(data.event_date) || '',
            event_hour: parseInt(data.event_hour) || 0,
            event_minute: parseInt(data.event_minute) || 0,
            field_name: data.field_name || '',
            field_location: data.field_location || '',
            field_type: data.field_type || '',
            field_temperature: parseInt(data.field_temperature) || 0,
            game_status: data.game_status || 'open',
            my_team_ha: data.my_team_ha || 'home',
            game_id: data.game_id || gameId
          };
          
          console.log("Setting game detail to:", updatedGameDetail);
          setGameDetail(updatedGameDetail);
        } catch (error) {
          console.error("Error fetching game details:", error);
          setError("Failed to load game details. Please try again.");
        }
      }
    };

    fetchGameDetails();
    
    // Reset the ref when the modal is closed
    if (!isOpen) {
      dataFetchedRef.current = false;
    }
  }, [isOpen, isCreating, teamId, gameId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Don't allow changes to user_team or game_id
    if (name !== 'user_team' && name !== 'game_id') {
      // Convert numeric fields to numbers
      if (name === 'event_hour' || name === 'event_minute' || name === 'field_temperature') {
        setGameDetail(prev => ({
          ...prev,
          [name]: parseInt(value) || 0
        }));
      } else if (name === 'event_date') {
        // Convert YYYY-MM-DD to MM-DD-YYYY for display
        const parts = value.split('-');
        if (parts.length === 3) {
          const displayDate = `${parts[1]}-${parts[2]}-${parts[0]}`;
          setGameDetail(prev => ({
            ...prev,
            [name]: displayDate
          }));
        }
      } else if (name === 'game_status') {
        // Ensure game_status is always lowercase
        setGameDetail(prev => ({
          ...prev,
          [name]: value.toLowerCase()
        }));
      } else {
        setGameDetail(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Create a copy of gameDetail for submission
      const dataToSubmit = {
        ...gameDetail,
        // Convert date back to MM-DD-YYYY format for API
        event_date: convertToDisplayDate(gameDetail.event_date),
        // Keep user_team as a string for the API
        user_team: teamId,
        // Only include game_id for updates, not for creation
        ...(isCreating ? {} : { game_id: gameId })
      };
      
      const url = isCreating 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/create_game` 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}/edit_game`;
      
      console.log("Submitting to URL:", url);
      console.log("Data being submitted:", dataToSubmit);
      
      const response = await fetch(url, {
        method: isCreating ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSubmit),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save game");
      }
      
      setSuccessMessage(isCreating ? "Game created successfully!" : "Game updated successfully!");
      
      // Notify parent component that save was successful
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (error) {
      console.error("Error saving game:", error);
      setError("Failed to save game. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete game ${gameId}?`)) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}/delete_game`;
      console.log("Deleting game at URL:", url);
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete game");
      }
      
      setSuccessMessage("Game deleted successfully!");
      
      // Notify parent component that save was successful
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (error) {
      console.error("Error deleting game:", error);
      setError("Failed to delete game. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 z-50">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
        {/* Header with Save/Delete buttons */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center border-b border-gray-700 shadow-md">
          <h2 className="text-xl font-bold">Edit</h2>
          <div className="flex space-x-2">
            {!isCreating && gameId && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center justify-center px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center justify-center py-1.5 px-3 rounded-lg shadow-sm text-xs font-medium border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Home/Away Selection and Game Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your team is
                </label>
                <select
                  name="my_team_ha"
                  value={gameDetail.my_team_ha}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Game Date
                </label>
                <input
                  type="date"
                  name="event_date"
                  value={convertToHtmlDate(gameDetail.event_date)}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            {/* Time (Hour and Minute) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hour
                </label>
                <input
                  type="number"
                  name="event_hour"
                  value={gameDetail.event_hour}
                  onChange={handleInputChange}
                  min="0"
                  max="23"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minute
                </label>
                <input
                  type="number"
                  name="event_minute"
                  value={gameDetail.event_minute}
                  onChange={handleInputChange}
                  min="0"
                  max="59"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            {/* Opponent Team Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opponent Team Name
              </label>
              <input
                type="text"
                name="away_team_name"
                value={gameDetail.away_team_name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Type team name"
                required
              />
            </div>

            {/* Opponent Coach Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opponent Coach Name
              </label>
              <input
                type="text"
                name="coach"
                value={gameDetail.coach}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Type coach name"
                required
              />
            </div>

            {/* Field Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field
              </label>
              <input
                type="text"
                name="field_name"
                value={gameDetail.field_name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Type field name"
                required
              />
            </div>

            {/* Temperature and Field Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temp. (°F)
                </label>
                <input
                  type="number"
                  name="field_temperature"
                  value={gameDetail.field_temperature}
                  onChange={handleInputChange}
                  min="0"
                  max="150"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Infield surface
                </label>
                <select
                  name="field_type"
                  value={gameDetail.field_type}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="dirt">Dirt</option>
                  <option value="turf">Turf</option>
                  <option value="grass">Grass</option>
                </select>
              </div>
            </div>

            {/* Field Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Location
              </label>
              <input
                type="text"
                name="field_location"
                value={gameDetail.field_location}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Type field location"
                required
              />
            </div>

            {/* Game Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Game Status
              </label>
              <select
                name="game_status"
                value={gameDetail.game_status}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </form>
        </div>

        {/* Footer with IDs */}
        <div className="p-2 border-t text-xs text-gray-500 flex justify-between">
          <div>Team ID: {teamId}</div>
          <div>Game ID: {gameId || 'New Game'}</div>
        </div>
      </div>
    </div>
  );
} 