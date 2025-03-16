'use client';

import { ScoreBookEntry } from '@/app/types/scoreTypes';
import BaseballField from './BaseballField';

interface BaseballDiamondCellProps {
  pa: ScoreBookEntry | null;
  onClick?: () => void;
  isInteractive?: boolean;
}

const BaseballDiamondCell = ({ pa, onClick, isInteractive = true }: BaseballDiamondCellProps) => {
  // Always make cells interactive by default
  
  if (!pa) {
    // Return an empty cell that's clickable
    return (
      <div className="w-full h-full" style={{ maxHeight: '48px' }}>
        <BaseballField 
          onClick={onClick}
          isInteractive={isInteractive}
        />
      </div>
    );
  }

  // For cells with data, pass the PA data to BaseballField
  return (
    <div className="w-full h-full" style={{ maxHeight: '60px' }}>
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