'use client';

import { ScoreBookEntry } from '@/app/types/scoreTypes';
import BaseballField from './BaseballField';

interface BaseballDiamondCellProps {
  pa: ScoreBookEntry | null;
  onClick?: () => void;
  isInteractive?: boolean;
  fieldKey?: string;
  canAddPA?: boolean;
}

const BaseballDiamondCell = ({ pa, onClick, isInteractive = true, fieldKey, canAddPA = false }: BaseballDiamondCellProps) => {
  // Generate a unique key for the BaseballField component
  const uniqueKey = `${fieldKey}-${Date.now()}`;
  
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ height: '60px' }}>
      <BaseballField 
        key={uniqueKey}
        fieldKey={fieldKey}
        pa={pa}
        onClick={onClick}
        isInteractive={isInteractive}
        canAddPA={canAddPA}
      />
    </div>
  );
};

export default BaseballDiamondCell; 