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

function checkKetoneBadges(level: number, stats: any) {
  const badges: string[] = JSON.parse(stats.badges || '[]');
  const newBadges: string[] = [];

  if (level >= 0.5 && !badges.includes('keto_confirmed')) {
    badges.push('keto_confirmed');
    newBadges.push('keto_confirmed');
  }
  if (level >= 1.5 && !badges.includes('deep_ketosis')) {
    badges.push('deep_ketosis');
    newBadges.push('deep_ketosis');
  }

  if (newBadges.length > 0) {
    db.prepare('UPDATE user_stats SET badges = ? WHERE id = 1').run(JSON.stringify(badges));
  }
  return newBadges;
}

// GET /api/ketones?days=30
router.get('/', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const ketones = db.prepare(`
    SELECT * FROM ketones
    WHERE date >= date('now', '-${days} days')
    ORDER BY date ASC, time ASC
  `).all();
  return res.json(ketones);
});

// POST /api/ketones
router.post('/', (req: Request, res: Response) => {
  const { date, time, level, notes } = req.body;

  if (!date || !time || level === undefined || level === null) {
    return res.status(400).json({ error: 'date, time, level are required' });
  }

  const result = db.prepare(`
    INSERT INTO ketones (date, time, level, notes)
    VALUES (?, ?, ?, ?)
  `).run(date, time, level, notes || null);

  const ketone = db.prepare('SELECT * FROM ketones WHERE id = ?').get(result.lastInsertRowid);

  // Award XP
  const stats = getOrCreateStats();
  let xp_gained = 5;
  if (level >= 1.5 && level <= 3.0) {
    xp_gained += 20; // bonus for optimal ketosis
  }
  const new_xp = stats.xp + xp_gained;
  const new_level = calcLevel(new_xp);
  db.prepare('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1').run(new_xp, new_level);

  const newBadges = checkKetoneBadges(level, { ...stats, xp: new_xp });

  return res.json({ ketone, xp_gained, new_xp, level: new_level, new_badges: newBadges });
});

// DELETE /api/ketones/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM ketones WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;
