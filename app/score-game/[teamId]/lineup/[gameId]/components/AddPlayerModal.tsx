import React, { useState, useRef, useEffect } from 'react';

export interface RosterPlayer {
  jersey_number: string;
  player_name: string;
}

interface AddPlayerDropdownProps {
  availablePlayers: RosterPlayer[];
  onAddPlayer: (player: RosterPlayer, inning: number) => void;
  loading: boolean;
  currentInning: number;
  nextOrderNumber: number;
  activeTab: 'home' | 'away';
  myTeamHa: 'home' | 'away';
}

const AddPlayerDropdown: React.FC<AddPlayerDropdownProps> = ({ 
  availablePlayers, 
  onAddPlayer, 
  loading,
  currentInning,
  nextOrderNumber,
  activeTab,
  myTeamHa
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const isMyTeam = activeTab === myTeamHa;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="py-3 px-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-base flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Player #{nextOrderNumber}
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-1 w-72 bg-white shadow-lg rounded-md border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
            <h3 className="text-sm font-medium">Add {activeTab === 'home' ? 'Home' : 'Away'} Player (#{nextOrderNumber})</h3>
            {!isMyTeam && (
              <p className="text-xs text-amber-600 mt-1">
                Note: Adding to non-team lineup. Will be saved on submit.
              </p>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center my-4 p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {availablePlayers.length === 0 ? (
                <p className="text-center text-gray-500 my-4 p-4">No available players found.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {availablePlayers.map((player, index) => (
                    <button 
                      key={`${player.jersey_number}-${index}`} 
                      onClick={() => {
                        onAddPlayer(player, currentInning);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center"
                    >
                      <span className="bg-gray-200 text-gray-800 rounded-full w-7 h-7 flex items-center justify-center mr-2 text-xs font-semibold">
                        {player.jersey_number}
                      </span>
                      <span className="text-sm">{player.player_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AddPlayerDropdown;
export type { RosterPlayer }; 