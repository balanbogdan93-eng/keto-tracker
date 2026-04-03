export const LEVELS = [
  { level: 1, name: 'Keto Beginner', minXP: 0, color: '#6b7280' },
  { level: 2, name: 'Fat Burner', minXP: 100, color: '#10b981' },
  { level: 3, name: 'Ketone Warrior', minXP: 300, color: '#3b82f6' },
  { level: 4, name: 'Keto Adept', minXP: 600, color: '#8b5cf6' },
  { level: 5, name: 'Metabolic Master', minXP: 1000, color: '#f59e0b' },
  { level: 6, name: 'Keto Legend', minXP: 1500, color: '#ef4444' },
];

export const BADGES = [
  { id: 'first_meal', name: 'First Steps', icon: '🥑', desc: 'Log your first meal' },
  { id: 'streak_3', name: 'Consistent', icon: '🔥', desc: '3-day logging streak' },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚡', desc: '7-day streak' },
  { id: 'keto_confirmed', name: 'Keto Confirmed', icon: '🩸', desc: 'Ketones > 0.5 mmol/L' },
  { id: 'deep_ketosis', name: 'Deep Ketosis', icon: '💎', desc: 'Ketones > 1.5 mmol/L' },
  { id: 'gym_rat', name: 'Gym Rat', icon: '💪', desc: 'Log 5 workouts' },
  { id: 'macro_master', name: 'Macro Master', icon: '🎯', desc: 'Log all meals 3 days' },
  { id: 'calorie_goal', name: 'Full Tank', icon: '⚡', desc: 'Hit 3000 cal goal in a day' },
  { id: 'carb_control', name: 'Carb Control', icon: '🛡️', desc: 'Stay under 30g carbs 3 days' },
];

export function getLevelInfo(level: number) {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

export function getNextLevel(level: number) {
  return LEVELS.find(l => l.level === level + 1);
}

export function getXPProgress(xp: number, level: number) {
  const current = LEVELS.find(l => l.level === level);
  const next = LEVELS.find(l => l.level === level + 1);
  if (!current || !next) return { progress: 100, needed: 0, xpInLevel: xp - (current?.minXP || 0) };
  const xpInLevel = xp - current.minXP;
  const xpNeeded = next.minXP - current.minXP;
  const progress = Math.min(100, (xpInLevel / xpNeeded) * 100);
  return { progress, needed: next.minXP - xp, xpInLevel };
}

export function getKetoneStatus(level: number): { label: string; color: string; bg: string } {
  if (level < 0.5) return { label: 'Not in Ketosis', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (level < 1.5) return { label: 'Light Ketosis', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (level <= 3.0) return { label: 'Optimal Ketosis', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
  return { label: 'High Ketosis', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
}

export const MACRO_GOALS = {
  calories: 3000,
  fat: 140,
  protein: 80,
  carbs: 30,
  fiber: 15,
};
