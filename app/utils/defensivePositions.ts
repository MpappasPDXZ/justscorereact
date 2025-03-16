// Define the defensive position data structure
export interface DefensivePosition {
  id: string;
  shortName: string;
  fullName: string;
}

// Create a constant array of defensive positions
export const DEFENSIVE_POSITIONS: DefensivePosition[] = [
  { id: '1', shortName: 'P', fullName: 'Pitcher' },
  { id: '2', shortName: 'C', fullName: 'Catcher' },
  { id: '3', shortName: '1B', fullName: 'First Base' },
  { id: '4', shortName: '2B', fullName: 'Second Base' },
  { id: '5', shortName: '3B', fullName: 'Third Base' },
  { id: '6', shortName: 'SS', fullName: 'Shortstop' },
  { id: '7', shortName: 'LF', fullName: 'Left Field' },
  { id: '8', shortName: 'CF', fullName: 'Center Field' },
  { id: '9', shortName: 'RF', fullName: 'Right Field' },
  { id: '10', shortName: 'DH', fullName: 'Designated Hitter' },
  { id: '11', shortName: 'EH', fullName: 'Extra Hitter' },
  { id: '12', shortName: 'FX', fullName: 'Flex' },
];

// Helper function to get position by ID
export const getPositionById = (id: string): DefensivePosition | undefined => {
  return DEFENSIVE_POSITIONS.find(position => position.id === id);
};

// Helper function to get position display text (for select options)
export const getPositionDisplayText = (id: string): string => {
  const position = getPositionById(id);
  return position ? `${position.id} - ${position.shortName}` : '';
};

// Helper function to get full position display text
export const getFullPositionDisplayText = (id: string): string => {
  const position = getPositionById(id);
  return position ? `${position.id} - ${position.fullName}` : '';
};

// Helper function to get position options as an array of objects for select elements
export const getPositionOptions = () => {
  return DEFENSIVE_POSITIONS.map(position => ({
    value: position.id,
    label: `${position.id} - ${position.shortName}`
  }));
}; 