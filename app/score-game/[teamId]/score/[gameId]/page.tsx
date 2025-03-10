'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Define types
interface Game {
  id: string;
  event_date: string;
  event_hour: number;
  event_minute: number;
  away_team_name: string;
  home_team_name: string;
  my_team_ha: string;
}

interface InningStats {
  runs: number;
  hits: number;
  errors: number;
  walks: number;
  outs: number;
}

interface BoxScoreData {
  away_team_name: string;
  home_team_name: string;
  innings: {
    [key: string]: {
      away_team: InningStats;
      home_team: InningStats;
    }
  };
  totals: {
    away_team: InningStats;
    home_team: InningStats;
  };
}

interface LineupEntry {
  jersey_number: string;
  name: string;
  position: string;
  order_number: number;
}

interface ScoreBookEntry {
  order_number: number;
  batter_jersey_number: string;
  batter_name: string;
  batter_seq_id: number;
  pa_result: string;
  detailed_result: string;
  base_running: string;
  balls_before_play: number;
  strikes_before_play: number;
  fouls_after_two_strikes: number;
  hard_hit: number;
  bunt_or_slap: number;
  base_running_stolen_base: number;
}

interface InningDetail {
  team_id: string;
  game_id: string;
  inning_number: number;
  my_team_ha: string;
  lineup_available: boolean;
  stats: {
    runs: number;
    hits: number;
    errors: number;
    walks: number;
    outs: number;
    total_plate_appearances: number;
  };
  lineup_entries: LineupEntry[];
  scorebook_entries: ScoreBookEntry[];
}

// Update the BaseballField component to include a foul counter
const BaseballField = ({ paResult, baseRunning, balls, strikes, fouls }: { 
  paResult: string, 
  baseRunning: string,
  balls: number,
  strikes: number,
  fouls: number
}) => {
  // Determine which bases to highlight based on the result
  const getBaseHighlights = () => {
    const result = paResult || '';
    const running = baseRunning || '';
    
    // Default - no bases reached
    const bases = {
      first: false,
      second: false,
      third: false,
      home: false,
      out: false
    };
    
    // Check for outs
    if (['K', 'KK', 'FO', 'GO', 'LO', 'DP', 'TP'].includes(result)) {
      bases.out = true;
      return bases;
    }
    
    // Check for hits and walks
    if (result.includes('1B') || result === 'BB' || result === 'HBP' || result === 'E' || result === 'FC') {
      bases.first = true;
    }
    
    if (result.includes('2B')) {
      bases.first = true;
      bases.second = true;
    }
    
    if (result.includes('3B')) {
      bases.first = true;
      bases.second = true;
      bases.third = true;
    }
    
    if (result.includes('HR')) {
      bases.first = true;
      bases.second = true;
      bases.third = true;
      bases.home = true;
    }
    
    // Check base running for additional advancement
    if (running) {
      if (running.includes('2B') || running.includes('4B')) {
        bases.second = true;
      }
      
      if (running.includes('3B') || running.includes('4B')) {
        bases.third = true;
      }
      
      if (running.includes('4B') || running.includes('HR')) {
        bases.home = true;
      }
    }
    
    return bases;
  };
  
  const bases = getBaseHighlights();
  
  // Determine if the result is an out
  const isOut = ['K', 'KK', 'FO', 'GO', 'LO', 'DP', 'TP'].includes(paResult);
  
  return (
    <div className="relative w-14 h-14 mx-0 ml-0 mb-0 p-0 overflow-visible">
      {/* Diamond shape */}
      <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible">
        {/* Outfield outline - faint arc moved up further */}
        <path 
          d="M5,25 Q30,-15 55,25" 
          fill="none" 
          stroke="#DDDDDD" 
          strokeWidth="1.5"
          strokeDasharray="2,1"
        />
        
        {/* Infield outline - faint square adjusted to match */}
        <path 
          d="M18,35 L42,35 L42,11 L18,11 Z" 
          fill="none" 
          stroke="#EEEEEE" 
          strokeWidth="1"
        />
        
        {/* Base paths */}
        {/* Home to first */}
        {bases.first && (
          <line 
            x1="30" y1="48" 
            x2="42" y2="36" 
            stroke="black" 
            strokeWidth="1.5"
          />
        )}
        
        {/* First to second */}
        {bases.second && (
          <line 
            x1="42" y1="36" 
            x2="30" y2="24" 
            stroke="black" 
            strokeWidth="1.5"
          />
        )}
        
        {/* Second to third */}
        {bases.third && (
          <line 
            x1="30" y1="24" 
            x2="18" y2="36" 
            stroke="black" 
            strokeWidth="1.5"
          />
        )}
        
        {/* Third to home */}
        {bases.home && (
          <line 
            x1="18" y1="36" 
            x2="30" y2="48" 
            stroke="black" 
            strokeWidth="1.5"
          />
        )}
        
        {/* Base markers */}
        {/* Home plate */}
        <rect x="28" y="46" width="4" height="4" fill="white" stroke="black" />
        
        {/* First base */}
        <rect 
          x="40" y="34" 
          width="4" height="4" 
          fill={bases.first ? "black" : "white"} 
          stroke="black" 
        />
        
        {/* Second base */}
        <rect 
          x="28" y="22" 
          width="4" height="4" 
          fill={bases.second ? "black" : "white"} 
          stroke="black" 
        />
        
        {/* Third base */}
        <rect 
          x="16" y="34" 
          width="4" height="4" 
          fill={bases.third ? "black" : "white"} 
          stroke="black" 
        />
        
        {/* Out indicator - top left with no padding */}
        {bases.out && (
          <circle 
            cx="5" 
            cy="5" 
            r="5" 
            fill="red" 
          />
        )}
        
        {/* Ball indicators - top right corner with no padding */}
        <rect x="54" y="0" width="6" height="6" fill={balls >= 1 ? "#888" : "white"} stroke="#888" strokeWidth="0.5" />
        <rect x="54" y="8" width="6" height="6" fill={balls >= 2 ? "#888" : "white"} stroke="#888" strokeWidth="0.5" />
        <rect x="54" y="16" width="6" height="6" fill={balls >= 3 ? "#888" : "white"} stroke="#888" strokeWidth="0.5" />
        
        {/* Strike indicators - moved up with no right padding */}
        <rect x="54" y="30" width="6" height="6" fill={strikes >= 1 ? "black" : "white"} stroke="black" strokeWidth="0.5" />
        <rect x="54" y="38" width="6" height="6" fill={strikes >= 2 ? "black" : "white"} stroke="black" strokeWidth="0.5" />
        
        {/* Foul counter - with outline in bottom right */}
        {fouls > 0 && (
          <g transform="translate(54, 54)">
            <circle 
              cx="0" 
              cy="0" 
              r="6" 
              fill="#FFF4E5" 
              stroke="#FF9800" 
              strokeWidth="1"
            />
            <text 
              x="0" 
              y="0" 
              fontSize="8" 
              textAnchor="middle" 
              alignmentBaseline="central" 
              dominantBaseline="central" 
              fill="#FF9800"
              fontWeight="bold"
            >
              {fouls}
            </text>
          </g>
        )}
        
        {/* Result badge in bottom left */}
        <g transform="translate(0, 60)">
          {/* Badge background - larger */}
          <rect 
            x="0" 
            y="-12" 
            width="20" 
            height="12" 
            rx="6" 
            fill="white" 
            stroke={paResult.includes('E') ? "#9333ea" : isOut ? "#FF0000" : "#888888"} 
            strokeWidth={paResult.includes('E') ? "1.5" : "1"}
          />
          
          {/* Badge text - perfectly centered and larger */}
          <text 
            x="10" 
            y="-6.5" 
            fontSize="7" 
            textAnchor="middle" 
            alignmentBaseline="central" 
            dominantBaseline="central" 
            fill="#666666"
            style={{ textAlign: 'center' }}
          >
            {paResult}
          </text>
        </g>
      </svg>
    </div>
  );
};

export default function ScoreGame() {
  const params = useParams();
  const teamId = params.teamId as string;
  const gameId = params.gameId as string;
  const router = useRouter();
  
  // Basic state
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Box score state
  const [boxScoreData, setBoxScoreData] = useState<BoxScoreData | null>(null);
  const [totalInnings, setTotalInnings] = useState(7);
  
  // Inning detail state
  const [selectedInning, setSelectedInning] = useState<string>('1');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('away');
  const [inningDetail, setInningDetail] = useState<InningDetail | null>(null);
  const [loadingInningDetail, setLoadingInningDetail] = useState(false);
  
  // Selected plate appearance for detail view
  const [selectedPA, setSelectedPA] = useState<ScoreBookEntry | null>(null);

  useEffect(() => {
    if (teamId && gameId) {
      fetchGameDetails();
      fetchBoxScore();
    }
  }, [teamId, gameId]);

  // When box score is loaded, fetch the first inning details
  useEffect(() => {
    if (boxScoreData) {
      fetchInningDetail('1', 'away');
    }
  }, [boxScoreData]);

  const fetchGameDetails = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${teamId}/${gameId}`);
      if (!response.ok) throw new Error("Failed to fetch game details");
      const data = await response.json();
      
      if (data && data.game_data) {
        setGame(data.game_data);
      } else {
        throw new Error("No game details found");
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
      setError("Failed to load game details. Please try again later.");
    }
  };

  const fetchBoxScore = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/summary`);
      if (!response.ok) throw new Error("Failed to fetch box score");
      const data = await response.json();
      
      setBoxScoreData(data);
      
      // Set the total innings based on the data
      if (data && data.innings) {
        setTotalInnings(Object.keys(data.innings).length);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching box score:", error);
      setError("Failed to load box score. Please try again later.");
      setLoading(false);
    }
  };

  const fetchInningDetail = async (inningNumber: string, teamChoice: 'home' | 'away') => {
    setLoadingInningDetail(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/scores/${teamId}/${gameId}/inning/${inningNumber}/scorebook/${teamChoice}`
      );
      
      if (!response.ok) throw new Error("Failed to fetch inning details");
      
      const data = await response.json();
      setInningDetail(data);
      setSelectedInning(inningNumber);
      setSelectedTeam(teamChoice);
    } catch (error) {
      console.error("Error fetching inning details:", error);
      setInningDetail(null);
    } finally {
      setLoadingInningDetail(false);
    }
  };

  // Function to get plate appearances for a specific player
  const getPlayerPAs = (orderNumber: number) => {
    if (!inningDetail?.scorebook_entries) return [];
    return inningDetail.scorebook_entries.filter(entry => entry.order_number === orderNumber);
  };

  // Function to get the maximum number of plate appearances for any player
  const getMaxPAs = () => {
    if (!inningDetail?.scorebook_entries) return 0;
    
    const paCountsByPlayer = new Map<number, number>();
    
    inningDetail.scorebook_entries.forEach(entry => {
      const count = paCountsByPlayer.get(entry.order_number) || 0;
      paCountsByPlayer.set(entry.order_number, count + 1);
    });
    
    return Math.max(...Array.from(paCountsByPlayer.values()), 0);
  };

  // Function to render a plate appearance cell with smaller padding
  const renderPACell = (pa: ScoreBookEntry | undefined, index: number) => {
    if (!pa) return <td key={`empty-pa-${index}`} className="border p-0 text-center text-gray-400" style={{ width: '30px' }}>-</td>;
    
    return (
      <td 
        key={`pa-${pa.batter_seq_id}`}
        className="border p-0 text-center cursor-pointer hover:bg-gray-100" 
        style={{ width: '30px' }}
        onClick={() => setSelectedPA(pa)}
      >
        <div className="flex flex-col items-center py-1">
          <div className="font-medium text-xs">{pa.pa_result}</div>
          {pa.detailed_result && <div className="text-xs text-gray-500">{pa.detailed_result}</div>}
        </div>
      </td>
    );
  };

  // Function to get the final base result for a player
  const getFinalBase = (playerPAs: ScoreBookEntry[]) => {
    if (!playerPAs || playerPAs.length === 0) return '-';
    
    // Look for the highest base reached
    const baseValues = {
      '4B': 4,
      'HR': 4,
      '3B': 3,
      '2B': 2,
      '1B': 1,
      'BB': 1,
      'E': 1,
      'FC': 1,
      'HBP': 1
    };
    
    let highestBase = 0;
    let highestBaseResult = '-';
    
    playerPAs.forEach(pa => {
      const baseRunning = pa.base_running;
      // Check if this is a base hit or advancement
      Object.entries(baseValues).forEach(([key, value]) => {
        if (baseRunning.includes(key) && value > highestBase) {
          highestBase = value;
          highestBaseResult = key;
        }
      });
    });
    
    return highestBaseResult;
  };

  if (loading) return <div className="p-4">Loading game data...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!boxScoreData) return <div className="p-4">No box score data available.</div>;

  return (
    <div className="container mx-auto px-3 py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Box Score</h1>
          {game && (
            <div className="text-xs text-gray-500 mt-1">
              {game.event_date} {game.event_hour}:{game.event_minute < 10 ? '0' + game.event_minute : game.event_minute}
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/score-game/${teamId}/lineup/${gameId}`)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
          >
            Back to Lineup
          </button>
          
          <button
            onClick={() => fetchBoxScore()}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Box Score Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                {Array.from({ length: totalInnings }).map((_, i) => (
                  <th 
                    key={`inning-header-${i}`}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => fetchInningDetail((i + 1).toString(), selectedTeam)}
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l-2 border-gray-300 font-bold">Runs</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider border-l-2 border-gray-300">Hits</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Walks</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Errors</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Away Team Row */}
              <tr>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => fetchInningDetail(selectedInning, 'away')}
                >
                  {boxScoreData.away_team_name}
                </td>
                {Array.from({ length: totalInnings }).map((_, i) => {
                  const inningKey = (i + 1).toString();
                  const inningData = boxScoreData.innings[inningKey]?.away_team || { runs: 0, hits: 0, errors: 0, walks: 0, outs: 0 };
                  
                  return (
                    <td 
                      key={`away-inning-${i}`}
                      className="px-3 py-4 whitespace-nowrap text-center text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() => fetchInningDetail(inningKey, 'away')}
                    >
                      {inningData.runs}
                    </td>
                  );
                })}
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium border-l-2 border-gray-300 font-bold">
                  {boxScoreData.totals.away_team.runs}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600 border-l-2 border-gray-300">
                  {boxScoreData.totals.away_team.hits}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                  {boxScoreData.totals.away_team.walks}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                  {boxScoreData.totals.away_team.errors}
                </td>
              </tr>
              
              {/* Home Team Row */}
              <tr>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => fetchInningDetail(selectedInning, 'home')}
                >
                  {boxScoreData.home_team_name}
                </td>
                {Array.from({ length: totalInnings }).map((_, i) => {
                  const inningKey = (i + 1).toString();
                  const inningData = boxScoreData.innings[inningKey]?.home_team || { runs: 0, hits: 0, errors: 0, walks: 0, outs: 0 };
                  
                  return (
                    <td 
                      key={`home-inning-${i}`}
                      className="px-3 py-4 whitespace-nowrap text-center text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() => fetchInningDetail(inningKey, 'home')}
                    >
                      {inningData.runs}
                    </td>
                  );
                })}
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium border-l-2 border-gray-300 font-bold">
                  {boxScoreData.totals.home_team.runs}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600 border-l-2 border-gray-300">
                  {boxScoreData.totals.home_team.hits}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                  {boxScoreData.totals.home_team.walks}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                  {boxScoreData.totals.home_team.errors}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Inning Details Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Inning {selectedInning} Details</h2>
          
          {/* Team Tabs */}
          <div className="flex">
            <button
              onClick={() => fetchInningDetail(selectedInning, 'away')}
              className={`px-6 py-2 text-sm font-medium ${
                selectedTeam === 'away'
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Away
            </button>
            <button
              onClick={() => fetchInningDetail(selectedInning, 'home')}
              className={`px-6 py-2 text-sm font-medium ${
                selectedTeam === 'home'
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Home
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {loadingInningDetail ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : inningDetail ? (
            <div>
              {inningDetail.lineup_entries && inningDetail.lineup_entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="border border-gray-200 table-fixed" style={{ width: 'auto' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border p-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20px' }}>
                          #
                        </th>
                        <th className="border p-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '60px' }}>
                          Player
                        </th>
                        <th className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '60px' }}>
                          Inning {selectedInning}
                        </th>
                        {Array.from({ length: getMaxPAs() - 1 }).map((_, i) => (
                          <th key={`pa-header-${i}`} className="border p-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30px' }}>
                            {i + 2}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inningDetail.lineup_entries.map((player, index) => {
                        const playerPAs = getPlayerPAs(player.order_number);
                        // Format player name - if name contains jersey number, just use name
                        const displayName = player.name.includes(player.jersey_number) 
                          ? player.name 
                          : `${player.jersey_number} ${player.name}`;
                        
                        // Get the last PA for this player to show in the Result column
                        const lastPA = playerPAs.length > 0 ? playerPAs[playerPAs.length - 1] : null;
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border p-1 text-xs text-gray-500 truncate text-center">
                              {player.order_number}
                            </td>
                            <td className="border p-1 text-xs font-medium text-gray-900 truncate">
                              {displayName}
                            </td>
                            <td className="border p-0 text-xs text-center" style={{ verticalAlign: 'bottom' }}>
                              <div className="flex justify-start items-end p-0 m-0">
                                {lastPA ? (
                                  <BaseballField 
                                    paResult={lastPA.pa_result} 
                                    baseRunning={lastPA.base_running}
                                    balls={lastPA.balls_before_play}
                                    strikes={lastPA.strikes_before_play}
                                    fouls={lastPA.fouls_after_two_strikes}
                                  />
                                ) : '-'}
                              </div>
                            </td>
                            {Array.from({ length: getMaxPAs() - 1 }).map((_, i) => {
                              // Render PAs starting from the second one (index 1)
                              const pa = playerPAs.find(pa => pa.batter_seq_id === i + 2);
                              return renderPACell(pa, i);
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded">
                  No lineup available for this inning.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No data available for this inning.
            </div>
          )}
        </div>
      </div>
      
      {/* Plate Appearance Detail Modal */}
      {selectedPA && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Plate Appearance Details - {selectedPA.batter_name} (#{selectedPA.batter_jersey_number})
              </h2>
              <button 
                onClick={() => setSelectedPA(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Result</div>
                  <div className="text-xl font-bold">{selectedPA.pa_result}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Detail</div>
                  <div className="text-xl font-bold">{selectedPA.detailed_result || "-"}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Base Running</div>
                  <div className="text-xl font-bold">{selectedPA.base_running}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Count</div>
                  <div className="text-xl font-bold">
                    {selectedPA.balls_before_play}-{selectedPA.strikes_before_play}
                    {selectedPA.fouls_after_two_strikes > 0 && ` (${selectedPA.fouls_after_two_strikes} fouls)`}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded flex items-center">
                  <div className="mr-2">
                    <div className="text-xs text-gray-500">Hard Hit</div>
                  </div>
                  {selectedPA.hard_hit === 1 ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-400">
                      -
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded flex items-center">
                  <div className="mr-2">
                    <div className="text-xs text-gray-500">Bunt/Slap</div>
                  </div>
                  {selectedPA.bunt_or_slap > 0 ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800">
                      {selectedPA.bunt_or_slap === 1 ? 'B' : 'S'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-400">
                      -
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded flex items-center">
                  <div className="mr-2">
                    <div className="text-xs text-gray-500">Stolen Base</div>
                  </div>
                  {selectedPA.base_running_stolen_base === 1 ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-purple-100 text-purple-800">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-400">
                      -
                    </span>
                  )}
                </div>
              </div>
              
              {/* Edit buttons would go here in a real implementation */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedPA(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 