'use client';

import { useState, useEffect } from 'react';
import BaseballDiamondCell from '@/app/components/BaseballDiamondCell';
import BattingOrderTable from '@/app/components/BattingOrderTable';
import { ScoreBookEntry } from '@/app/types/scoreTypes';

interface ScoreCardGridProps {
  teamId: string;
  gameId: string;
  inningNumber: string;
  teamChoice: 'home' | 'away';
  scorebookEntries: ScoreBookEntry[];
  onPlateAppearanceClick: (pa: ScoreBookEntry | null, orderNumber: number, columnIndex: number) => void;
  showPrecedingInnings?: boolean;
}

const ScoreCardGrid = ({ 
  teamId, 
  gameId, 
  inningNumber,
  teamChoice, 
  scorebookEntries,
  onPlateAppearanceClick,
  showPrecedingInnings = false
}: ScoreCardGridProps) => {
  const [numberOfPAColumns, setNumberOfPAColumns] = useState(1);
  const [visiblePAColumns, setVisiblePAColumns] = useState(1); // Start with only 1 PA column visible

  useEffect(() => {
    // Calculate number of columns based on scorebook entries
    if (scorebookEntries && scorebookEntries.length > 0) {
      const maxBatterSeqId = Math.max(...scorebookEntries.map(entry => entry.batter_seq_id || 0));
      // Determine the number of columns based on max batter sequence ID
      // Assuming a 9-player lineup, we need to divide by 9 and round up
      const columnsNeeded = Math.ceil(maxBatterSeqId / 9) + 1;
      const totalColumns = Math.max(columnsNeeded, 1); // Show at least 1 column
      setNumberOfPAColumns(totalColumns);
      
      // Set visible columns to the maximum of current visible columns and actual used columns
      const actualUsedColumns = Math.ceil(maxBatterSeqId / 9);
      setVisiblePAColumns(Math.max(visiblePAColumns, actualUsedColumns));
    } else {
      setNumberOfPAColumns(1); // Default to 1 column if no entries
      setVisiblePAColumns(1);
    }
  }, [scorebookEntries]);

  // Group scorebook entries by order number
  const getPlayerPAs = (orderNumber: number) => {
    if (!scorebookEntries) return [];
    return scorebookEntries
      .filter(entry => entry.order_number === orderNumber)
      .sort((a, b) => (a.batter_seq_id || 0) - (b.batter_seq_id || 0));
  };

  // Render a cell for a plate appearance
  const renderPACell = (playerPAs: ScoreBookEntry[], columnIndex: number, orderNumber: number) => {
    // Find PA based on the column index
    const lineupSize = 9; // Default lineup size
    const expectedSeqId = (columnIndex * lineupSize) + orderNumber;
    
    // Find the PA with the matching batter_seq_id, if any
    const pa = playerPAs.find(pa => pa.batter_seq_id === expectedSeqId);
    
    return (
      <td key={`pa-${columnIndex}`} className="border p-0 text-xs text-center align-top" style={{ height: '60px' }}>
        <BaseballDiamondCell 
          pa={pa || null}
          onClick={() => onPlateAppearanceClick(pa || null, orderNumber, columnIndex)}
          isInteractive={true}
        />
      </td>
    );
  };

  // Add a new PA column
  const handleAddPAColumn = () => {
    setVisiblePAColumns(prev => Math.min(prev + 1, numberOfPAColumns + 1));
  };

  return (
    <div className="flex">
      {/* Left side: Batting Order Table */}
      <div style={{ flexShrink: 0 }}>
        <BattingOrderTable 
          teamId={teamId} 
          gameId={gameId} 
          teamChoice={teamChoice} 
        />
      </div>
      
      {/* Right side: BaseballDiamondCell Grid */}
      <div className="overflow-x-auto border-l-0">
        <table className="border-collapse border border-gray-200 border-l-0 min-w-max">
          <thead className="bg-gray-50">
            <tr>
              {Array.from(new Set(Array.from({ length: visiblePAColumns }).map((_, i) => {
                const lineupSize = 9;
                const inningNumber = Math.floor(i / lineupSize) + 1;
                return inningNumber;
              }))).map((inningNum, idx, arr) => {
                const lineupSize = 9;
                const columnsInInning = Math.min(
                  lineupSize,
                  visiblePAColumns - (inningNum - 1) * lineupSize
                );
                
                return (
                  <th 
                    key={`inning-header-${inningNum}`}
                    className="border p-1 text-center text-xs font-medium text-gray-500 normal-case tracking-wider"
                    colSpan={columnsInInning}
                    style={{ 
                      height: '25px',
                      verticalAlign: 'bottom' 
                    }}
                  >
                    <div className="flex items-center justify-center px-1">
                      <span>Inning {inningNum}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
            
            <tr>
              {Array.from({ length: visiblePAColumns }).map((_, i) => (
                <th 
                  key={`pa-header-${i+1}`}
                  className="border p-1 text-center text-xs font-medium text-gray-500 normal-case tracking-wider"
                  style={{ 
                    width: '60px', 
                    height: '26px',
                    verticalAlign: 'bottom'
                  }}
                >
                  <div className="flex items-center justify-center">
                    PA {i+1}
                    {i === 0 && (
                      <button 
                        onClick={handleAddPAColumn}
                        className="bg-green-500 hover:bg-green-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center ml-1 focus:outline-none"
                        title="Add plate appearance"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 16a.5.5 0 0 1-.5-.5v-1.293l-.646.647a.5.5 0 0 1-.707-.708L7.5 12.793V8.866l-3.4 1.963-.496 1.85a.5.5 0 1 1-.966-.26l.237-.882-1.12.646a.5.5 0 0 1-.5-.866l1.12-.646-.883-.237a.5.5 0 1 1 .258-.966l1.85.495L5 8 1.6 6.037l-1.85.495a.5.5 0 0 1-.258-.966l.883-.237-1.12-.646a.5.5 0 0 1 .5-.866l1.12.646-.237-.883a.5.5 0 1 1 .966-.258l.495 1.85L5.134 7.133V3.207L3.78 1.854a.5.5 0 0 1 .707-.708l.646.647V.5a.5.5 0 0 1 1 0v1.293l.647-.647a.5.5 0 1 1 .707.708L6.134 3.207v3.927l3.4-1.963.496-1.85a.5.5 0 1 1 .966.26l-.236.882 1.12-.646a.5.5 0 0 1 .5.866l-1.12.646.883.237a.5.5 0 1 1-.26.966l-1.848-.495L8 8l3.4 1.963 1.849-.495a.5.5 0 0 1 .259.966l-.883.237 1.12.646a.5.5 0 0 1-.5.866l-1.12-.646.236.883a.5.5 0 1 1-.966.258l-.495-1.85-3.4-1.963v3.927l1.353 1.353a.5.5 0 0 1-.707.708l-.647-.647V15.5a.5.5 0 0 1-.5.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 9 }).map((_, index) => {
              const orderNumber = index + 1;
              const playerPAs = getPlayerPAs(orderNumber);
              
              return (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  style={{ height: '61px' }}
                >
                  {/* Render PA cells for this player by column index */}
                  {Array.from({ length: visiblePAColumns }).map((_, i) => {
                    return renderPACell(playerPAs, i, orderNumber);
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScoreCardGrid; 