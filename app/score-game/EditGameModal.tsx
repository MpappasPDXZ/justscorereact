"use client"

import { useEffect, useState } from "react";

interface GameDetail {
  user_team: string;
  coach: string;
  away_team_name: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  field_name: string;
  field_location: string;
  field_type: string;
  field_temperature: string;
  game_status: string;
  my_team_ha: string;
  game_id: string;
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
    ...gameData,
    user_team: teamId,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Update the form data when gameData changes, but ensure user_team is always teamId
    setGameDetail({
      ...gameData,
      user_team: teamId
    });
  }, [gameData, teamId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Don't allow changes to user_team or game_id
    if (name !== 'user_team' && name !== 'game_id') {
      setGameDetail(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Ensure user_team is set to teamId before submitting
      const dataToSubmit = {
        ...gameDetail,
        user_team: teamId,
        // Only include game_id for updates, not for creation
        ...(isCreating ? {} : { game_id: gameId })
      };
      
      const url = isCreating 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}` 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}`;
      
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{isCreating ? "Create New Game" : "Edit Game"}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> {successMessage}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Team Information</h3>
                
                {/* Hidden Game ID field */}
                <input
                  type="hidden"
                  name="game_id"
                  value={gameId}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="user_team">
                      Team ID
                    </label>
                    <input
                      id="user_team"
                      name="user_team"
                      type="text"
                      value={teamId}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 leading-tight focus:outline-none"
                      disabled
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="game_id_display">
                      Game ID
                    </label>
                    <input
                      id="game_id_display"
                      type="text"
                      value={(gameDetail as any).game_id}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 leading-tight focus:outline-none"
                      disabled
                      readOnly
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="away_team_name">
                    Opponent Team Name
                  </label>
                  <input
                    id="away_team_name"
                    name="away_team_name"
                    type="text"
                    value={gameDetail.away_team_name}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="coach">
                    Coach
                  </label>
                  <input
                    id="coach"
                    name="coach"
                    type="text"
                    value={gameDetail.coach}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="my_team_ha">
                    My Team Position
                  </label>
                  <select
                    id="my_team_ha"
                    name="my_team_ha"
                    value={gameDetail.my_team_ha}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                  </select>
                </div>
              </div>
              
              {/* Game Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Game Details</h3>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event_date">
                    Date
                  </label>
                  <input
                    id="event_date"
                    name="event_date"
                    type="text"
                    value={gameDetail.event_date}
                    onChange={handleInputChange}
                    placeholder="MM-DD-YYYY"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event_hour">
                      Hour
                    </label>
                    <input
                      id="event_hour"
                      name="event_hour"
                      type="number"
                      min="0"
                      max="23"
                      value={gameDetail.event_hour}
                      onChange={handleInputChange}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event_minute">
                      Minute
                    </label>
                    <input
                      id="event_minute"
                      name="event_minute"
                      type="number"
                      min="0"
                      max="59"
                      value={gameDetail.event_minute}
                      onChange={handleInputChange}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="game_status">
                    Game Status
                  </label>
                  <select
                    id="game_status"
                    name="game_status"
                    value={gameDetail.game_status}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Field Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Field Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="field_name">
                    Field Name
                  </label>
                  <input
                    id="field_name"
                    name="field_name"
                    type="text"
                    value={gameDetail.field_name}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="field_location">
                    Field Location
                  </label>
                  <input
                    id="field_location"
                    name="field_location"
                    type="text"
                    value={gameDetail.field_location}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="field_type">
                    Field Type
                  </label>
                  <input
                    id="field_type"
                    name="field_type"
                    type="text"
                    value={gameDetail.field_type}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="field_temperature">
                    Temperature (°F)
                  </label>
                  <input
                    id="field_temperature"
                    name="field_temperature"
                    type="text"
                    value={gameDetail.field_temperature}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {saving ? "Saving..." : "Save Game"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 