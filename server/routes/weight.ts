import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

function getOrCreateStats() {
  let stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
  if (!stats) {
    db.prepare("INSERT INTO user_stats (id, xp, level, streak_days, badges) VALUES (1, 0, 1, 0, '[]')").run();
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

// GET /api/weight?days=60
router.get('/', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 60;
  const entries = db.prepare(`
    SELECT * FROM weight
    WHERE date >= date('now', '-${days} days')
    ORDER BY date ASC, time_of_day ASC
  `).all();
  return res.json(entries);
});

// GET /api/weight/date/:date
router.get('/date/:date', (req: Request, res: Response) => {
  const entries = db.prepare(`
    SELECT * FROM weight WHERE date = ? ORDER BY time_of_day ASC
  `).all(req.params.date);
  return res.json(entries);
});

// POST /api/weight
router.post('/', (req: Request, res: Response) => {
  const { date, time_of_day, kg } = req.body;

  if (!date || !time_of_day || kg === undefined) {
    return res.status(400).json({ error: 'date, time_of_day, kg are required' });
  }
  if (!['morning', 'noon', 'night'].includes(time_of_day)) {
    return res.status(400).json({ error: 'time_of_day must be morning, noon, or night' });
  }

  // Upsert: replace if same date + time_of_day already exists
  db.prepare(`
    DELETE FROM weight WHERE date = ? AND time_of_day = ?
  `).run(date, time_of_day);

  const result = db.prepare(`
    INSERT INTO weight (date, time_of_day, kg) VALUES (?, ?, ?)
  `).run(date, time_of_day, kg);

  const entry = db.prepare('SELECT * FROM weight WHERE id = ?').get(result.lastInsertRowid);

  // Award XP
  const stats = getOrCreateStats();
  const xp_gained = 5;
  const new_xp = stats.xp + xp_gained;
  const new_level = calcLevel(new_xp);
  db.prepare('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1').run(new_xp, new_level);

  return res.json({ entry, xp_gained, new_xp, level: new_level });
});

// DELETE /api/weight/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM weight WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export default router;
