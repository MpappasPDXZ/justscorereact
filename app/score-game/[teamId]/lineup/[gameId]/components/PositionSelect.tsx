import React from 'react';
import { DEFENSIVE_POSITIONS } from './DefensiveLineupTable';

interface PositionSelectProps {
  value: number;
  onChange: (position: number) => void;
  disabled?: boolean;
}

const PositionSelect: React.FC<PositionSelectProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      disabled={disabled}
      className="w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
    >
      {DEFENSIVE_POSITIONS.map((position) => (
        <option key={position.id} value={position.id}>
          {position.id === 0 ? 'BENCH' : `${position.id} - ${position.shortName}`}
        </option>
      ))}
    </select>
  );
};

export default PositionSelect; 