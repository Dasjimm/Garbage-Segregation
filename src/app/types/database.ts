// app/types/database.ts
export interface DailyRecycling {
  id: number;
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  total: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface DailyRecyclingInput {
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  notes?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}