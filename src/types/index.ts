export interface Meal {
  id: number;
  date: string;
  time: string;
  category: string;
  name: string;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
  fiber: number;
  notes?: string;
  image_data?: string;
  created_at: string;
}

export interface Exercise {
  id: number;
  date: string;
  time: string;
  type: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
}

export interface Ketone {
  id: number;
  date: string;
  time: string;
  level: number;
  notes?: string;
  created_at: string;
}

export interface UserStats {
  id: number;
  xp: number;
  level: number;
  streak_days: number;
  last_log_date?: string;
  badges: string; // JSON array string
}

export interface MacroResult {
  name: string;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
  fiber: number;
  description?: string;
}

export interface CalendarDay {
  meals: boolean;
  exercise: boolean;
  ketones: boolean;
}

export interface CalendarData {
  [date: string]: CalendarDay;
}
