import express from 'express';
import cors from 'cors';
import path from 'path';
import db from './db';
import mealsRouter from './routes/meals';
import exerciseRouter from './routes/exercise';
import ketonesRouter from './routes/ketones';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure user_stats row exists
const existing = db.prepare('SELECT id FROM user_stats WHERE id = 1').get();
if (!existing) {
  db.prepare("INSERT INTO user_stats (id, xp, level, streak_days, badges) VALUES (1, 0, 1, 0, '[]')").run();
}

// API routes
app.use('/api/meals', mealsRouter);
app.use('/api/exercise', exerciseRouter);
app.use('/api/ketones', ketonesRouter);
app.use('/api/ai', aiRouter);

app.get('/api/stats', (req, res) => {
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get();
  res.json(stats);
});

app.get('/api/calendar', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const mealDays = db.prepare("SELECT DISTINCT date FROM meals WHERE date LIKE ?").all(`${prefix}%`) as { date: string }[];
  const exerciseDays = db.prepare("SELECT DISTINCT date FROM exercise WHERE date LIKE ?").all(`${prefix}%`) as { date: string }[];
  const ketoneDays = db.prepare("SELECT DISTINCT date FROM ketones WHERE date LIKE ?").all(`${prefix}%`) as { date: string }[];

  const result: Record<string, { meals: boolean; exercise: boolean; ketones: boolean }> = {};
  for (const { date } of mealDays) {
    if (!result[date]) result[date] = { meals: false, exercise: false, ketones: false };
    result[date].meals = true;
  }
  for (const { date } of exerciseDays) {
    if (!result[date]) result[date] = { meals: false, exercise: false, ketones: false };
    result[date].exercise = true;
  }
  for (const { date } of ketoneDays) {
    if (!result[date]) result[date] = { meals: false, exercise: false, ketones: false };
    result[date].ketones = true;
  }
  return res.json(result);
});

// In production: serve the built React app
if (isProd) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  // All non-API routes serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`KetoTrack running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
});
