export interface DailyRecycling {
  id: number;
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  total: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  notes?: string;
}

export interface DailyRecyclingInput {
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  notes?: string;
}