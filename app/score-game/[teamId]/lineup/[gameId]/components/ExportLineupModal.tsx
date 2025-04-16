'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getPositionName } from './DefensiveLineupTable';
import { Dialog } from '@headlessui/react';

interface BattingOrderData {
  batting_order: {
    [key: string]: {
      [key: string]: {
        player_name: string;
        jersey_number: string;
      }
    }
  }
}

interface DefensiveRotationPlayer {
  jersey_number: string;
  player_name: string;
  display: string;
  positions: {
    [key: string]: number;
  };
}

interface DefensiveRotationsData {
  team_id: number;
  game_id: number;
  team_choice: string;
  column_headers: string[];
  players: DefensiveRotationPlayer[];
}

interface DefensivePositionsData {
  team_id: number;
  game_id: number;
  team_choice: string;
  max_inning: number;
  positions: {
    position: number;
    position_name: string;
    inning_1?: string;
    inning_2?: string;
    inning_3?: string;
    inning_4?: string;
    inning_5?: string;
    inning_6?: string;
    inning_7?: string;
    inning_8?: string;
    inning_9?: string;
    inning_10?: string;
    inning_11?: string;
    inning_12?: string;
    inning_13?: string;
    inning_14?: string;
    inning_15?: string;
  }[];
}

interface PlayerInPosition {
  jersey_number: string;
  player_name: string;
}

interface PositionData {
  position: number;
  position_name: string;
  inning_1?: string;
  inning_2?: string;
  inning_3?: string;
  inning_4?: string;
  inning_5?: string;
  inning_6?: string;
  inning_7?: string;
  inning_8?: string;
  inning_9?: string;
  inning_10?: string;
  inning_11?: string;
  inning_12?: string;
  inning_13?: string;
  inning_14?: string;
  inning_15?: string;
}

interface PositionsResponseData {
  team_id: number;
  game_id: number;
  team_choice: string;
  max_inning: number;
  positions: {
    [key: string]: PositionData;
  };
}

interface PositionsResponse {
  endpoint_url: string;
  request_timestamp: string;
  response: PositionsResponseData;
}

interface ExportLineupModalProps {
  teamId: string;
  gameId: string;
  teamChoice: string;
  battingOrderData: BattingOrderData;
  defensiveRotationsData: DefensiveRotationsData;
  defensivePositionsData: DefensivePositionsData;
  isOpen: boolean;
  onClose: () => void;
  opponentName: string;
  gameDate: string;
}

// Interface for ModalContent props
interface ModalContentProps {
  opponentName: string;
  gameDate: string;
  gameId: string;
  teamId: string;
  teamChoice: string;
  battingOrderData: BattingOrderData;
  defensiveRotationsData: DefensiveRotationsData;
  defensivePositionsData: DefensivePositionsData;
  onClose: () => void;
  handlePrint: () => void;
}

const ExportLineupModal: React.FC<ExportLineupModalProps> = ({
  teamId,
  gameId,
  teamChoice,
  battingOrderData,
  defensiveRotationsData,
  defensivePositionsData,
  isOpen,
  onClose,
  opponentName,
  gameDate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handlePrint = () => {
    // Create a print-only div
    const printDiv = document.createElement('div');
    printDiv.className = 'print-only';
    printDiv.style.position = 'absolute';
    printDiv.style.left = '-9999px';
    printDiv.style.top = '-9999px';
    
    // Clone the modal content
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      const contentClone = modalContent.cloneNode(true) as HTMLElement;
      
      // Remove elements we don't want to print
      const noPrintElements = contentClone.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());
      
      // Add the cloned content to our print div
      printDiv.appendChild(contentClone);
      document.body.appendChild(printDiv);
    }

    const printStyles = `
      @page { 
        size: landscape;
        margin: 1cm;
      }

      @media print {
        /* Hide everything except our print div */
        body > *:not(.print-only) {
          display: none !important;
        }

        .print-only {
          position: static !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        .print-only .modal-content {
          box-shadow: none !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Clean up header section */
        .print-only .modal-content > div:first-child {
          background-color: transparent !important;
          border: none !important;
          padding: 0.5rem !important;
          margin-bottom: 0.5rem !important;
        }

        .print-only .modal-content > div:first-child h2 {
          margin: 0 !important;
          padding: 0 !important;
          font-size: 1rem !important;
          font-weight: bold !important;
        }

        .print-only .modal-content > div:first-child div {
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Ensure tables don't break across pages */
        table {
          page-break-inside: avoid !important;
          border-collapse: collapse !important;
        }

        /* Remove all backgrounds */
        .bg-white,
        .bg-gray-50,
        .bg-gray-100,
        .bg-gray-200,
        .bg-gray-300,
        .bg-gray-400,
        .bg-gray-500,
        .bg-gray-600,
        .bg-gray-700,
        .bg-gray-800,
        .bg-gray-900 {
          background-color: transparent !important;
        }

        /* Clean up borders */
        .border,
        .border-b,
        .border-t,
        .border-l,
        .border-r,
        .border-gray-200,
        .border-gray-300,
        .border-gray-400,
        .border-gray-500,
        .border-gray-600,
        .border-gray-700,
        .border-gray-800,
        .border-gray-900 {
          border-color: #e5e7eb !important;
          border-width: 1px !important;
        }

        /* Ensure text is visible */
        .text-gray-400,
        .text-gray-500,
        .text-gray-600,
        .text-gray-700,
        .text-gray-900 {
          color: black !important;
        }

        /* Remove any shadows */
        * {
          box-shadow: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Clean up table headers */
        th {
          background-color: transparent !important;
          border-bottom: 2px solid #e5e7eb !important;
        }

        /* Clean up table cells */
        td {
          background-color: transparent !important;
        }

        /* Clean up table rows */
        tr {
          background-color: transparent !important;
        }
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);

    // Print and clean up
    window.print();
    
    // Remove our print div and styles after printing
    setTimeout(() => {
      document.head.removeChild(styleElement);
      document.body.removeChild(printDiv);
    }, 100);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-root">
      {/* Modal overlay */}
      <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Modal content */}
        <div className="modal-content bg-white rounded-lg shadow-xl w-full max-w-[800px] mx-4">
          <ModalContent
            opponentName={opponentName}
            gameDate={gameDate}
            gameId={gameId}
            teamId={teamId}
            teamChoice={teamChoice}
            battingOrderData={battingOrderData}
            defensiveRotationsData={defensiveRotationsData}
            defensivePositionsData={defensivePositionsData}
            onClose={onClose}
            handlePrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
};

const ModalContent: React.FC<ModalContentProps> = ({
  opponentName,
  gameDate,
  gameId,
  teamId,
  teamChoice,
  battingOrderData,
  defensiveRotationsData,
  defensivePositionsData,
  onClose,
  handlePrint
}) => {
  // Move all the helper functions here
  const calculatePositionStats = (positions: { [key: string]: number }) => {
    const totalPositions = Object.values(positions).length;
    if (totalPositions === 0) return { infield: 0, outfield: 0, bench: 0 };

    const counts = Object.values(positions).reduce((acc, pos) => {
      // Infield: P(1), C(2), 1B(3), 2B(4), 3B(5), SS(6)
      if ([1, 2, 3, 4, 5, 6].includes(pos)) {
        acc.infield++;
      }
      // Outfield: LF(7), CF(8), RF(9)
      else if ([7, 8, 9].includes(pos)) {
        acc.outfield++;
      }
      // Bench: 0
      else if (pos === 0) {
        acc.bench++;
      }
      return acc;
    }, { infield: 0, outfield: 0, bench: 0 });

    return {
      infield: Math.round((counts.infield / totalPositions) * 100),
      outfield: Math.round((counts.outfield / totalPositions) * 100),
      bench: Math.round((counts.bench / totalPositions) * 100)
    };
  };

  const getPositionDisplay = (position: number) => {
    if (position === 0) {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 border border-gray-700 rounded-full">
          B
        </span>
      );
    }
    return getPositionName(position);
  };

  const getPlayerInfo = (orderNumber: string) => {
    const inningOneData = battingOrderData.batting_order[orderNumber]?.['1'];
    if (!inningOneData) return null;

    // Find matching player in defensive data
    const defensivePlayer = defensiveRotationsData.players.find(
      p => p.jersey_number === inningOneData.jersey_number
    );

    return {
      orderNumber,
      name: inningOneData.player_name,
      jerseyNumber: inningOneData.jersey_number,
      positions: defensivePlayer?.positions || {}
    };
  };

  // Create sorted player list
  const players = Object.keys(battingOrderData?.batting_order || {})
    .map(order => {
      const inningOneData = battingOrderData.batting_order[order]?.['1'];
      if (!inningOneData) return null;

      // Find matching player in defensive data
      const defensivePlayer = defensiveRotationsData.players.find(
        p => p.jersey_number === inningOneData.jersey_number
      );

      return {
        orderNumber: order,
        name: inningOneData.player_name,
        jerseyNumber: inningOneData.jersey_number,
        positions: defensivePlayer?.positions || {}
      };
    })
    .filter(player => player !== null);

  const hasConsecutiveBench = (player: any, inning: number) => {
    if (inning === 1) return false;
    return player.positions[inning.toString()] === 0 && player.positions[(inning - 1).toString()] === 0;
  };

  const shouldHighlightEmptyPosition = (positionData: PositionData, inning: number) => {
    const playerInfo = positionData[`inning_${inning}` as keyof PositionData] as string | undefined;
    // Check if any player is playing in this inning (by checking all positions)
    const hasPlayersInInning = defensivePositionsData.positions.some(
      (pos: PositionData) => {
        const inningData = pos[`inning_${inning}` as keyof PositionData] as string | undefined;
        return inningData && inningData.trim() !== '';
      }
    );
    return hasPlayersInInning && (!playerInfo || playerInfo.trim() === '');
  };

  const renderPositionLookTable = () => {
    if (!defensivePositionsData?.positions) return null;

    return (
      <div className="mt-4">
        <div className="overflow-hidden border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr>
                <th colSpan={8} className="p-0">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-50 px-2 py-0.5 text-gray-600 text-base font-bold text-left border-b-2 border-gray-200">
                      Position Look
                    </div>
                  </div>
                </th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-2 py-0.5 text-left text-sm font-semibold text-gray-700">Position</th>
                {Array.from({ length: 7 }, (_, i) => i + 1).map(inning => (
                  <th key={inning} className="px-1 py-0.5 text-center text-sm font-semibold text-gray-700">
                    {inning}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {defensivePositionsData.positions.map((positionData: PositionData, index: number) => (
                <tr key={positionData.position} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-0.5 text-sm text-left">
                    {positionData.position_name}
                  </td>
                  {Array.from({ length: 7 }, (_, i) => i + 1).map(inning => {
                    const playerInfo = positionData[`inning_${inning}` as keyof PositionData] as string | undefined;
                    const isEmpty = shouldHighlightEmptyPosition(positionData, inning);
                    
                    return (
                      <td 
                        key={`${positionData.position}-${inning}`} 
                        className={`px-1 py-0.5 text-sm text-center relative ${
                          isEmpty ? 'text-red-600' : ''
                        }`}
                      >
                        {isEmpty ? (
                          <>
                            <span className="text-gray-400">-</span>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 border border-red-600 rounded-full"></div>
                            </div>
                          </>
                        ) : (
                          playerInfo || <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Game Info Header */}
      <div className="p-2 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">vs. {opponentName}</h2>
            <div className="text-xs text-gray-500">
              <span>{new Date(gameDate).toLocaleDateString()}</span>
              <span className="mx-2">•</span>
              <span>Game ID: {gameId}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 no-print"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        <div className="flex space-x-4">
          {/* Batting Order Table */}
          <div className="w-[256px]">
            <div className="overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr>
                    <th colSpan={2} className="p-0">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-50 px-2 py-0.5 text-emerald-600 text-base font-bold text-left border-b-2 border-emerald-200">
                          Offense
                        </div>
                      </div>
                    </th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    <th style={{ width: '24px' }} className="px-1 py-0.5 text-left text-sm font-semibold text-gray-700">#</th>
                    <th className="px-2 py-0.5 text-left text-sm font-semibold text-gray-700">Player</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map(player => player && (
                    <tr key={player.orderNumber}>
                      <td style={{ width: '24px' }} className="px-1 py-0.5 text-sm text-left">{player.orderNumber}</td>
                      <td className="px-2 py-0.5 text-sm text-left">{player.name} ({player.jerseyNumber})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Defensive Rotations Table */}
          <div className="w-[570px]">
            <div className="overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr>
                    <th colSpan={7} className="bg-gray-50 text-emerald-600 text-base font-bold px-2 py-0.5 text-left border-b-2 border-emerald-200">
                      Innings
                    </th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    {[1, 2, 3, 4, 5, 6, 7].map(inning => (
                      <th key={inning} style={{ width: '81px' }} className="px-1 py-0.5 text-center text-sm font-semibold text-gray-700">
                        {inning}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map(player => player && (
                    <tr key={player.orderNumber}>
                      {[1, 2, 3, 4, 5, 6, 7].map(inning => {
                        const isConsecutiveBench = hasConsecutiveBench(player, inning);
                        return (
                          <td 
                            key={inning} 
                            style={{ width: '81px' }} 
                            className={`px-1 py-0.5 text-sm text-center ${
                              isConsecutiveBench ? 'text-red-600' : ''
                            }`}
                          >
                            {getPositionDisplay(player.positions[inning.toString()])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analysis Columns */}
          <div className="w-[150px] print:hidden">
            <div className="overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr>
                    <th colSpan={3} className="bg-gray-50 text-emerald-600 text-base font-bold px-2 py-0.5 text-left border-b-2 border-emerald-200">
                      %
                    </th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    <th style={{ width: '50px' }} className="px-1 py-0.5 text-center text-sm font-semibold text-gray-700">IF</th>
                    <th style={{ width: '50px' }} className="px-1 py-0.5 text-center text-sm font-semibold text-gray-700">OF</th>
                    <th style={{ width: '50px' }} className="px-1 py-0.5 text-center text-sm font-semibold text-gray-700">
                      <span className="inline-flex items-center justify-center w-5 h-5 border border-gray-700 rounded-full">
                        B
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map(player => {
                    if (!player) return null;
                    const stats = calculatePositionStats(player.positions);
                    return (
                      <tr key={player.orderNumber}>
                        <td style={{ width: '50px' }} className="px-1 py-0.5 text-sm text-center">{stats.infield}</td>
                        <td style={{ width: '50px' }} className="px-1 py-0.5 text-sm text-center">{stats.outfield}</td>
                        <td style={{ width: '50px' }} className="px-1 py-0.5 text-sm text-center">{stats.bench}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Position Look Table */}
        {renderPositionLookTable()}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between px-2">
          <span className="text-sm text-gray-600">Digital Scorekeeper v1.1</span>
          <button
            onClick={handlePrint}
            className="bg-white hover:bg-gray-50 border border-indigo-600 rounded px-4 py-1 text-sm text-indigo-600 flex items-center space-x-2 no-print"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-indigo-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>
    </>
  );
};

// Add display name for debugging
ExportLineupModal.displayName = 'ExportLineupModal';

export default ExportLineupModal;