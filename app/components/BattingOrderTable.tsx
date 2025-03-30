'use client';

import { useState, useEffect } from 'react';

interface BatterInfo {
  jersey_number: string;
  player_name: string;
  display: string;
}

interface BattingOrder {
  [orderNumber: string]: {
    [inningNumber: string]: BatterInfo;
  };
}

interface BattingOrderData {
  team_id: number;
  game_id: number;
  team_choice: string;
  batting_order_count: number;
  batting_order: BattingOrder;
}

interface BattingOrderTableProps {
  teamId: string;
  gameId: string;
  teamChoice: 'home' | 'away';
}

const BattingOrderTable = ({ teamId, gameId, teamChoice }: BattingOrderTableProps) => {
  const [battingOrderData, setBattingOrderData] = useState<BattingOrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBattingOrder();
  }, [teamId, gameId, teamChoice]);

  const fetchBattingOrder = async () => {
    try {
      if (!teamId || !gameId || teamId === 'undefined' || gameId === 'undefined') {
        console.error("Invalid parameters for fetchBattingOrder", { teamId, gameId, teamChoice });
        setLoading(false);
        return;
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/lineup/games/${teamId}/${gameId}/${teamChoice}/order_by_batter`;
      console.log("Fetching batting order from:", apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`Failed to fetch batting order: ${response.status} ${response.statusText}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log("Batting order data:", data);
      setBattingOrderData(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching batting order:", error);
      setLoading(false);
    }
  };

  // Helper to check if a batter is the same as in the previous inning
  const isSameAsPreviousBatter = (orderNumber: string, inningNumber: string): boolean => {
    if (!battingOrderData || !inningNumber || parseInt(inningNumber) <= 1) return false;
    
    const currentBatter = battingOrderData.batting_order[orderNumber][inningNumber];
    const prevInningNum = (parseInt(inningNumber) - 1).toString();
    const prevBatter = battingOrderData.batting_order[orderNumber][prevInningNum];
    
    if (!prevBatter) return false;
    
    return currentBatter.jersey_number === prevBatter.jersey_number && 
           currentBatter.player_name === prevBatter.player_name;
  };

  // Render batters for an order number, stacking them by inning
  const renderBatters = (orderNumber: string) => {
    if (!battingOrderData) return null;
    
    const battersForOrder = battingOrderData.batting_order[orderNumber];
    if (!battersForOrder) return null;
    
    const inningNumbers = Object.keys(battersForOrder).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Only show max 3 batters
    const maxDisplayBatters = 3;
    const visibleInnings = inningNumbers.filter(inningNum => !isSameAsPreviousBatter(orderNumber, inningNum));
    const hasMoreBatters = visibleInnings.length > maxDisplayBatters;
    const inningsToShow = hasMoreBatters ? visibleInnings.slice(0, maxDisplayBatters) : visibleInnings;
    
    const batterElements = inningsToShow.map((inningNum) => {
      const batter = battersForOrder[inningNum];
      // Use player_name directly from the data source instead of trying to parse display
      const jerseyNumber = batter.jersey_number || '';
      const playerName = batter.player_name || '';
      
      return (
        <div 
          key={`${orderNumber}-${inningNum}`} 
          className="text-[0.7rem] font-medium text-gray-900 py-0 whitespace-nowrap overflow-hidden text-ellipsis flex items-center"
          style={{ lineHeight: '1.3' }}
        >
          <span className="text-[0.65rem] text-gray-500 mr-1">{inningNum}:</span>
          <span className="min-w-[20px] h-5 rounded-full bg-gray-100 flex items-center justify-center text-[0.6rem] text-gray-600 mr-1 border border-gray-300 px-1">
            {jerseyNumber}
          </span>
          <span className="overflow-hidden text-ellipsis">{playerName}</span>
        </div>
      );
    });
    
    if (hasMoreBatters) {
      batterElements.push(
        <div 
          key={`${orderNumber}-more`}
          className="text-[0.7rem] font-medium text-gray-500 py-0"
          style={{ lineHeight: '1.3' }}
        >
          ...
        </div>
      );
    }
    
    return batterElements;
  };

  if (loading) {
    return (
      <div className="w-[150px] bg-white border border-gray-200 rounded">
        <div className="p-2 text-xs text-gray-500">Loading batting order...</div>
      </div>
    );
  }

  if (!battingOrderData) {
    return (
      <div className="w-[150px] bg-white border border-gray-200 rounded">
        <div className="p-2 text-xs text-gray-500">No batting order available</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-l-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="border p-1 text-center text-xs font-medium text-gray-500 normal-case tracking-wider" 
              style={{ 
                width: '30px', 
                height: '50px',
                verticalAlign: 'bottom', 
                textAlign: 'center'
              }}
            >
              #
            </th>
            <th 
              className="border p-1 text-center text-xs font-medium text-gray-500 normal-case tracking-wider" 
              style={{ 
                width: '120px', 
                height: '50px',
                verticalAlign: 'bottom', 
                textAlign: 'center'
              }}
            >
              Player
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.keys(battingOrderData.batting_order)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((orderNumber, index) => (
              <tr 
                key={orderNumber} 
                className={parseInt(orderNumber) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                style={{ height: '61px' }}
              >
                <td className="border p-0.5 text-xs text-gray-500 text-center align-top">
                  {orderNumber}
                </td>
                <td className="border p-0.5 align-top overflow-hidden">
                  <div className="flex flex-col max-h-[54px] overflow-hidden">
                    {renderBatters(orderNumber)}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default BattingOrderTable; 