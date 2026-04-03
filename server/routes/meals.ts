import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

function getOrCreateStats() {
  let stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
  if (!stats) {
    db.prepare('INSERT INTO user_stats (id, xp, level, streak_days, badges) VALUES (1, 0, 1, 0, \'[]\')').run();
    stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
  }
  return stats;
}

function calcLevel(xp: number): number {
  if (xp >= 1500) return 6;
  if (xp >= 1000) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

function checkAndAwardBadges(stats: any): string[] {
  const badges: string[] = JSON.parse(stats.badges || '[]');
  const newBadges: string[] = [];

  // first_meal badge
  const mealCount = (db.prepare('SELECT COUNT(*) as cnt FROM meals').get() as any).cnt;
  if (mealCount >= 1 && !badges.includes('first_meal')) {
    badges.push('first_meal');
    newBadges.push('first_meal');
  }

  // streak badges
  if (stats.streak_days >= 3 && !badges.includes('streak_3')) {
    badges.push('streak_3');
    newBadges.push('streak_3');
  }
  if (stats.streak_days >= 7 && !badges.includes('streak_7')) {
    badges.push('streak_7');
    newBadges.push('streak_7');
  }

  // gym_rat badge
  const exerciseCount = (db.prepare('SELECT COUNT(*) as cnt FROM exercise').get() as any).cnt;
  if (exerciseCount >= 5 && !badges.includes('gym_rat')) {
    badges.push('gym_rat');
    newBadges.push('gym_rat');
  }

  // keto_confirmed and deep_ketosis
  const latestKetone = db.prepare('SELECT level FROM ketones ORDER BY created_at DESC LIMIT 1').get() as any;
  if (latestKetone) {
    if (latestKetone.level >= 0.5 && !badges.includes('keto_confirmed')) {
      badges.push('keto_confirmed');
      newBadges.push('keto_confirmed');
    }
    if (latestKetone.level >= 1.5 && !badges.includes('deep_ketosis')) {
      badges.push('deep_ketosis');
      newBadges.push('deep_ketosis');
    }
  }

  if (newBadges.length > 0) {
    db.prepare('UPDATE user_stats SET badges = ? WHERE id = 1').run(JSON.stringify(badges));
  }

  return newBadges;
}

function updateStreak(stats: any, today: string) {
  const lastDate = stats.last_log_date;
  let newStreak = stats.streak_days;

  if (!lastDate) {
    newStreak = 1;
  } else if (lastDate === today) {
    // Already logged today, keep streak
  } else {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak = stats.streak_days + 1;
    } else {
      newStreak = 1;
    }
  }

  db.prepare('UPDATE user_stats SET last_log_date = ?, streak_days = ? WHERE id = 1').run(today, newStreak);
  return newStreak;
}

// GET /api/meals?date=YYYY-MM-DD
router.get('/', (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date query param required' });
  }
  const meals = db.prepare('SELECT * FROM meals WHERE date = ? ORDER BY time ASC').all(date as string);
  return res.json(meals);
});

// POST /api/meals
router.post('/', (req: Request, res: Response) => {
  const { date, time, category, name, calories, fat, protein, carbs, fiber, notes, image_data } = req.body;

  if (!date || !time || !category || !name) {
    return res.status(400).json({ error: 'date, time, category, name are required' });
  }

  const result = db.prepare(`
    INSERT INTO meals (date, time, category, name, calories, fat, protein, carbs, fiber, notes, image_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, time, category, name, calories || 0, fat || 0, protein || 0, carbs || 0, fiber || 0, notes || null, image_data || null);

  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid);

  // Award XP
  const stats = getOrCreateStats();
  const xp_gained = 10;
  const new_xp = stats.xp + xp_gained;
  const new_level = calcLevel(new_xp);
  const new_streak = updateStreak(stats, date);
  db.prepare('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1').run(new_xp, new_level);

  const newBadges = checkAndAwardBadges({ ...stats, xp: new_xp, streak_days: new_streak });

  return res.json({ meal, xp_gained, new_xp, level: new_level, new_streak, new_badges: newBadges });
});

// DELETE /api/meals/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM meals WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;
