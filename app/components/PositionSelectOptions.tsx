import React from 'react';
import { DEFENSIVE_POSITIONS } from '@/app/utils/defensivePositions';

const PositionSelectOptions: React.FC = () => {
  return (
    <>
      {DEFENSIVE_POSITIONS.map(position => (
        <option key={position.id} value={position.id}>
          {position.id} - {position.shortName}
        </option>
      ))}
    </>
  );
};

export default PositionSelectOptions; 