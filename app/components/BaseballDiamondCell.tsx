'use client';

import { ScoreBookEntry } from '@/app/types/scoreTypes';
import BaseballField from './BaseballField';
import { useEffect } from 'react';

interface BaseballDiamondCellProps {
  pa: ScoreBookEntry | null;
  onClick?: () => void;
  isInteractive?: boolean;
}

const BaseballDiamondCell = ({ pa, onClick, isInteractive = true }: BaseballDiamondCellProps) => {
  // Remove the debug log useEffect
  // useEffect(() => {
  //   if (pa && pa.br_result !== undefined) {
  //     console.log("BaseballDiamondCell passing br_result:", pa.br_result, typeof pa.br_result);
  //   }
  // }, [pa]);

  // Always make cells interactive by default
  
  if (!pa) {
    // Return an empty cell with a baseball diamond and a small green plus button
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ height: '60px' }}>
        {isInteractive ? (
          <div
            onClick={onClick}
            className="relative w-24 h-12 flex items-center justify-center cursor-pointer hover:bg-gray-50 active:bg-gray-100"
            title="Add plate appearance"
            data-component="EmptyBaseballField"
          >
            {/* Diamond shape - same as in BaseballField */}
            <div className="absolute transform rotate-45 w-6 h-6 border border-gray-400 bottom-1"></div>
            
            {/* Very small text plus instead of SVG */}
            <div 
              className="absolute text-[10px] font-bold text-red-500"
              style={{
                top: '65%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              NEW
            </div>
          </div>
        ) : (
          <BaseballField 
            onClick={onClick}
            isInteractive={isInteractive}
          />
        )}
      </div>
    );
  }

  // For cells with data, pass the PA data to BaseballField
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ height: '60px' }}>
      <BaseballField 
        pa={pa}
        onClick={onClick}
        isInteractive={isInteractive}
      />
      {/* Add a debug display that will be visible */}
      {pa && pa.batter_seq_id && (
        <div className="hidden">Debug: Seq ID {pa.batter_seq_id}</div>
      )}
    </div>
  );
};

export default BaseballDiamondCell; 