export interface ScoreBookEntry {
  order_number: number;
  batter_jersey_number: string;
  batter_name: string;
  batter_seq_id: number;
  bases_reached: string;
  why_base_reached: string;
  pa_result: string;
  result_type: string;
  detailed_result: string;
  base_running: string;
  balls_before_play: number;
  strikes_before_play: number;
  strikes_watching: number;
  strikes_swinging: number;
  strikes_unsure: number;
  fouls_after_two_strikes: number;
  base_running_stolen_base: number;
  team_id: string;
  game_id: string;
  inning_number: number;
  home_or_away: string;
  out_at: number;
  pitch_count: number;
  wild_pitch?: number;
  passed_ball?: number;
  fouls?: number;
  ball_swinging?: number;
  error_on?: string;
  br_result?: number;
  br_error_on?: any[];
  hit_around?: number;
  stolen_bases?: any[];
  hit_around_bases?: any[];
  [key: string]: any; // Index signature to allow dynamic property access
} 