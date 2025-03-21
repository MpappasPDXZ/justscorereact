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
  bases_reached: string;
  why_base_reached: string;
  pa_why?: string;
  pa_result: string;
  result_type: string;
  detailed_result: string;
  hit_to?: string;
  
  // Base running
  base_running: string;
  br_result?: number;
  br_error_on?: any[];
  br_stolen_bases?: any[];
  base_running_hit_around?: any[];
  base_running_stolen_base: number;
  hit_around?: number;
  hit_around_bases?: any[];
  stolen_bases?: any[];
  
  // Out information
  out?: number;
  out_at: number;
  
  // Pitch count and details
  pitch_count: number;
  balls_before_play: number;
  strikes_before_play: number;
  strikes_watching: number;
  strikes_swinging: number;
  strikes_unsure: number;
  fouls_after_two_strikes: number;
  fouls?: number;
  ball_swinging?: number;
  
  // Error information
  error_on?: string;
  pa_error_on?: any[];
  
  // Quality indicators and special stats
  qab?: number;
  hard_hit?: number;
  slap?: number;
  sac?: number;
  rbi?: number;
  late_swings?: number;
  wild_pitch?: number;
  passed_ball?: number;
  
  // Allow dynamic property access for backward compatibility
  [key: string]: any;
} 