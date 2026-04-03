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

function checkGymRatBadge(stats: any) {
  const exerciseCount = (db.prepare('SELECT COUNT(*) as cnt FROM exercise').get() as any).cnt;
  const badges: string[] = JSON.parse(stats.badges || '[]');
  const newBadges: string[] = [];
  if (exerciseCount >= 5 && !badges.includes('gym_rat')) {
    badges.push('gym_rat');
    newBadges.push('gym_rat');
    db.prepare('UPDATE user_stats SET badges = ? WHERE id = 1').run(JSON.stringify(badges));
  }
  return newBadges;
}

// GET /api/exercise?date=YYYY-MM-DD
router.get('/', (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date query param required' });
  }
  const exercises = db.prepare('SELECT * FROM exercise WHERE date = ? ORDER BY time ASC').all(date as string);
  return res.json(exercises);
});

// POST /api/exercise
router.post('/', (req: Request, res: Response) => {
  const { date, time, type, duration_minutes, notes } = req.body;

  if (!date || !time || !type) {
    return res.status(400).json({ error: 'date, time, type are required' });
  }

  const result = db.prepare(`
    INSERT INTO exercise (date, time, type, duration_minutes, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(date, time, type, duration_minutes || null, notes || null);

  const exercise = db.prepare('SELECT * FROM exercise WHERE id = ?').get(result.lastInsertRowid);

  // Award XP
  const stats = getOrCreateStats();
  const xp_gained = 15;
  const new_xp = stats.xp + xp_gained;
  const new_level = calcLevel(new_xp);
  db.prepare('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1').run(new_xp, new_level);

  const newBadges = checkGymRatBadge({ ...stats, xp: new_xp });

  return res.json({ exercise, xp_gained, new_xp, level: new_level, new_badges: newBadges });
});

// DELETE /api/exercise/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM exercise WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;
