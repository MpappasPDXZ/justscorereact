// Score-related type definitions

export interface ScoreBookEntry {
  // Identification and batting order
  order_number: number;
  batter_jersey_number: string;
  batter_name: string;
  batter_seq_id: number;
  batting_order_position?: number;
  round?: number;
  team_id: string;
  game_id: string;
  gameId?: string;
  teamId?: string;
  inning_number: number;
  home_or_away: string;
  my_team_ha?: string;
  
  // Result fields
  bases_reached?: string;      // 0-4 for bases reached
  why_base_reached?: string;   // H, HH, S, B, C, etc.
  pa_result?: any;            // Result can be number or string
  pa_why?: string;            // Legacy field - reason for result
  result_type?: string;       // Type of result
  detailed_result?: string;   // Fielder position
  hit_to?: string | number;   // Position hit to
  
  // Base running
  base_running?: string;      // Base running details
  br_result?: number;         // Final base reached
  br_error_on?: number[];
  br_stolen_bases?: number[];
  base_running_hit_around?: number[];
  base_running_stolen_base?: number;
  hit_around?: number;
  hit_around_bases?: number[];
  stolen_bases?: number[];
  
  // Out information
  out?: number;
  out_at?: number;            // Base out at (if any)
  
  // Pitch count and details
  pitch_count?: number;       // Make pitch_count optional
  balls_before_play?: number;
  strikes_before_play?: number;
  strikes_watching?: number;   
  strikes_swinging?: number;   
  strikes_unsure?: number;     // New field for strikes where type is unknown
  fouls_after_two_strikes?: number;
  fouls?: number;             // Total foul balls
  ball_swinging?: number;
  
  // Error information
  error_on?: string;
  pa_error_on?: number[];
  
  // Quality indicators and special stats
  qab?: number;
  hard_hit?: number;
  slap?: number;              // 1 if slap hit
  bunt?: number;              // 1 if bunt hit
  sac?: number;
  rbi?: number;
  late_swings?: number;       // Number of late swings
  wild_pitch?: number;
  passed_ball?: number;
  
  // Allow dynamic property access for backward compatibility
  [key: string]: any;
} 