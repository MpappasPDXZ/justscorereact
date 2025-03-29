import React, { useState, useEffect } from 'react';

export interface PlayerFormInput {
  jersey_number: string;
  player_name: string;
}

interface AddPlayerFormProps {
  currentInning: number;
  nextOrderNumber: number;
  onAddPlayer: (player: PlayerFormInput, inning: number) => void;
  activeTab: 'home' | 'away';
  myTeamHa: 'home' | 'away';
  activePlayers: {
    jersey_number: string;
    player_name: string;
    position: string;
  }[];
  lineupChanged?: boolean;
}

const AddPlayerForm: React.FC<AddPlayerFormProps> = ({
  currentInning,
  nextOrderNumber,
  onAddPlayer,
  activeTab,
  myTeamHa,
  activePlayers,
  lineupChanged = false
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [jerseyNumber, setJerseyNumber] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  
  // Reset form fields when the activeTab changes
  useEffect(() => {
    setSelectedPlayerId('');
    setJerseyNumber('');
    setPlayerName('');
  }, [activeTab]);
  
  const isMyTeam = activeTab === myTeamHa;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMyTeam) {
      // My team - use dropdown selection
      // Basic validation
      if (!selectedPlayerId) {
        alert('Please select a player');
        return;
      }
      
      // Find selected player from active players
      const selectedPlayer = activePlayers.find(p => p.jersey_number === selectedPlayerId);
      
      if (!selectedPlayer) {
        alert('Invalid player selection');
        return;
      }
      
      // Send player data to parent component
      onAddPlayer({
        jersey_number: selectedPlayer.jersey_number,
        player_name: selectedPlayer.player_name
      }, currentInning);
      
      // Reset form
      setSelectedPlayerId('');
    } else {
      // Opponent team - use manual entry
      // Basic validation
      if (!jerseyNumber.trim() || !playerName.trim()) {
        alert('Please fill in both jersey number and player name');
        return;
      }
      
      // Send player data to parent component
      onAddPlayer({
        jersey_number: jerseyNumber.trim(),
        player_name: playerName.trim()
      }, currentInning);
      
      // Reset form
      setJerseyNumber('');
      setPlayerName('');
    }
  };
  
  return (
    <div className="flex ml-auto">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="flex items-center">
          {/* Unsaved indicator - moved to left of player column */}
          {lineupChanged && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 flex items-center mr-2 h-7">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Unsaved
            </span>
          )}
          
          {isMyTeam ? (
            // My team - show player dropdown
            <div className="relative w-48">
              <label className="block text-xs text-gray-500 mb-1">Player</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                title="Select Player"
              >
                <option value="">Select a player...</option>
                {activePlayers.map(player => (
                  <option key={player.jersey_number} value={player.jersey_number}>
                    #{player.jersey_number} - {player.player_name} {player.position ? `(${player.position})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            // Opponent team - show manual entry fields
            <>
              <div className="relative w-16">
                <label className="block text-xs text-gray-500 mb-1">Jersey #</label>
                <input
                  type="text"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="#"
                  className="w-full py-2 px-2 text-center border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  title="Jersey Number"
                />
              </div>
              
              <div className="relative w-32 ml-2">
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Player Name"
                  className="w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  title="Player Name"
                />
              </div>
            </>
          )}
          
          <div className="relative w-16 ml-2">
            <label className="block text-xs text-gray-500 mb-1">Order #</label>
            <input
              type="text"
              value={nextOrderNumber}
              disabled
              className="w-full py-2 px-2 text-center border border-gray-300 bg-gray-100 rounded-md shadow-sm text-gray-600 text-xs focus:outline-none"
              title="Order Number"
            />
          </div>
          
          <div className="relative w-16 ml-2">
            <label className="block text-xs text-gray-500 mb-1">Inning</label>
            <input
              type="text"
              value={currentInning}
              disabled
              className="w-full py-2 px-2 text-center border border-gray-300 bg-gray-100 rounded-md shadow-sm text-gray-600 text-xs focus:outline-none"
              title="Inning Number"
            />
          </div>
        </div>
        
        <button
          type="submit"
          className={`py-2 px-3 border rounded-md shadow-sm text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-2 ${
            (isMyTeam && selectedPlayerId) || (!isMyTeam && jerseyNumber && playerName)
              ? "border-transparent text-white bg-indigo-600 hover:bg-indigo-700" 
              : "border-indigo-600 text-indigo-600 bg-transparent hover:bg-indigo-50"
          }`}
          title="Add Player to Lineup"
        >
          Add
        </button>
      </form>
    </div>
  );
};

export default AddPlayerForm; 