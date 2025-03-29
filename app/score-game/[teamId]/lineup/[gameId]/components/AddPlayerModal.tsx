import React, { useState, useEffect } from 'react';
import { RosterPlayer } from './AddPlayerDropdown';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: RosterPlayer[];
  onAddPlayer: (player: RosterPlayer, inning: number) => void;
  loading: boolean;
  currentInning: number;
  nextOrderNumber: number;
  activeTab: 'home' | 'away';
  myTeamHa: 'home' | 'away';
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ 
  isOpen,
  onClose,
  availablePlayers, 
  onAddPlayer, 
  loading,
  currentInning,
  nextOrderNumber,
  activeTab,
  myTeamHa
}) => {
  
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);
  
  const isMyTeam = activeTab === myTeamHa;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Add {activeTab === 'home' ? 'Home' : 'Away'} Player (#{nextOrderNumber})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          {!isMyTeam && (
            <p className="text-xs text-amber-600 mb-4 p-2 bg-amber-50 rounded border border-amber-200">
              Note: Adding to non-team lineup. Will be saved on submit.
            </p>
          )}
          
          {loading ? (
            <div className="flex justify-center my-4 p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {availablePlayers.length === 0 ? (
                <p className="text-center text-gray-500 my-4 p-4">No available players found.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
                  {availablePlayers.map((player, index) => (
                    <button 
                      key={`${player.jersey_number}-${index}`} 
                      onClick={() => {
                        onAddPlayer(player, currentInning);
                        onClose();
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
      </div>
    </div>
  );
};

export default AddPlayerModal; 