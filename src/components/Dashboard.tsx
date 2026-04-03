import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, Activity, Droplets, UtensilsCrossed, Dumbbell, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { UserStats, Meal, Ketone, Exercise, CalendarData } from '../types';
import { getLevelInfo, getNextLevel, getXPProgress, getKetoneStatus, MACRO_GOALS, BADGES } from '../utils/gamification';
import { Page } from '../App';

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TODAY = new Date().toISOString().split('T')[0];

interface DashboardProps {
  onNavigate: (p: Page) => void;
  statsVersion: number;
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

function MacroRing({ label, value, goal, color, unit, warn }: {
  label: string; value: number; goal: number; color: string; unit: string; warn?: boolean;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, (value / goal) * 100);
  const offset = circumference - (pct / 100) * circumference;
  const isOver = value > goal;
  const ringColor = warn ? (isOver ? '#ef4444' : value / goal > 0.8 ? '#f59e0b' : color) : color;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="8" />
          <motion.circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color: isOver && warn ? '#ef4444' : 'white' }}>
            {Math.round(value)}
          </span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-gray-300">{label}</p>
        <p className="text-xs text-gray-600">/ {goal}{unit}</p>
        {warn && isOver && <p className="text-xs text-red-400 font-medium">over!</p>}
      </div>
    </div>
  );
}

function MiniCalendar({ selectedDate, onSelect, calData }: {
  selectedDate: string;
  onSelect: (date: string) => void;
  calData: CalendarData;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const prevMonth = () => {
    if (viewDate.month === 1) setViewDate({ year: viewDate.year - 1, month: 12 });
    else setViewDate(v => ({ ...v, month: v.month - 1 }));
  };
  const nextMonth = () => {
    if (viewDate.month === 12) setViewDate({ year: viewDate.year + 1, month: 1 });
    else setViewDate(v => ({ ...v, month: v.month + 1 }));
  };

  const firstDay = new Date(viewDate.year, viewDate.month - 1, 1).getDay();
  const daysInMonth = new Date(viewDate.year, viewDate.month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDotColor = (dateStr: string) => {
    const d = calData[dateStr];
    if (!d) return null;
    const score = (d.meals ? 1 : 0) + (d.exercise ? 1 : 0) + (d.ketones ? 1 : 0);
    if (score === 3) return '#10b981';
    if (score >= 1) return '#f59e0b';
    return '#4b5563';
  };

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1e1e2e] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-white">
          {MONTHS[viewDate.month - 1]} {viewDate.year}
        </span>
        <button onClick={nextMonth} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1e1e2e] transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d, i) => (
          <div key={i} className="text-center text-xs text-gray-600 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${viewDate.year}-${String(viewDate.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === TODAY;
          const dotColor = getDotColor(dateStr);

          return (
            <motion.button
              key={dateStr}
              whileHover={{ scale: 0.9 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => onSelect(dateStr)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white'
                  : isToday
                  ? 'bg-purple-900/40 text-purple-300'
                  : 'text-gray-400 hover:bg-[#1e1e2e] hover:text-white'
              }`}
            >
              <span className="text-xs font-medium leading-none">{day}</span>
              {dotColor && !isSelected && (
                <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: dotColor }} />
              )}
              {isSelected && dotColor && (
                <div className="w-1 h-1 rounded-full mt-0.5 bg-white/60" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1e1e2e]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs text-gray-500">All logged</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-xs text-gray-500">Partial</span></div>
      </div>
    </div>
  );
}

function XPFloater({ xp }: { xp: number }) {
  return (
    <div className="xp-float fixed top-20 right-6 z-50 text-2xl font-black text-yellow-400 drop-shadow-lg">
      +{xp} XP
    </div>
  );
}

export default function Dashboard({ onNavigate, statsVersion, selectedDate, onDateSelect }: DashboardProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [latestKetone, setLatestKetone] = useState<Ketone | null>(null);
  const [dayExercise, setDayExercise] = useState<Exercise[]>([]);
  const [showXP, setShowXP] = useState<number | null>(null);
  const [calData, setCalData] = useState<CalendarData>({});
  const prevXP = useRef<number>(0);

  const isToday = selectedDate === TODAY;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  // Format selected date nicely
  const displayDate = isToday
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then((s: UserStats) => {
      if (prevXP.current > 0 && s.xp > prevXP.current) {
        setShowXP(s.xp - prevXP.current);
        setTimeout(() => setShowXP(null), 2000);
      }
      prevXP.current = s.xp;
      setStats(s);
    }).catch(() => {});
  }, [statsVersion]);

  useEffect(() => {
    fetch(`/api/meals?date=${selectedDate}`).then(r => r.json()).then(setDayMeals).catch(() => {});
    fetch(`/api/exercise?date=${selectedDate}`).then(r => r.json()).then(setDayExercise).catch(() => {});
    fetch('/api/ketones?days=365').then(r => r.json()).then((k: Ketone[]) => {
      const forDay = k.filter(e => e.date === selectedDate);
      setLatestKetone(forDay.length > 0 ? forDay[forDay.length - 1] : null);
    }).catch(() => {});
  }, [selectedDate, statsVersion]);

  // Load calendar data for current month view
  useEffect(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    // Load a wide range so mini calendar has data
    const fetchMonth = (y: number, m: number) =>
      fetch(`/api/calendar?year=${y}&month=${m}`).then(r => r.json()).catch(() => ({}));

    Promise.all([
      fetchMonth(year, month),
      fetchMonth(year, month - 1 || 12),
      fetchMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1),
    ]).then(([cur, prev]) => {
      setCalData({ ...prev, ...cur });
    });
  }, [selectedDate]);

  const totalMacros = dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      fat: acc.fat + (m.fat || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fiber: acc.fiber + (m.fiber || 0),
    }),
    { calories: 0, fat: 0, protein: 0, carbs: 0, fiber: 0 }
  );

  const levelInfo = stats ? getLevelInfo(stats.level) : null;
  const nextLevel = stats ? getNextLevel(stats.level) : null;
  const xpProgress = stats ? getXPProgress(stats.xp, stats.level) : null;
  const ketoneStatus = latestKetone ? getKetoneStatus(latestKetone.level) : null;
  const earnedBadges = stats ? JSON.parse(stats.badges || '[]') as string[] : [];

  const caloriePct = Math.min(100, (totalMacros.calories / MACRO_GOALS.calories) * 100);
  const carbsOver = totalMacros.carbs > MACRO_GOALS.carbs;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' }
    })
  };

  return (
    <div className="space-y-5">
      <AnimatePresence>{showXP && <XPFloater xp={showXP} />}</AnimatePresence>

      {/* Greeting + Level */}
      <motion.div
        custom={0} variants={cardVariants} initial="hidden" animate="visible"
        className="rounded-2xl p-5 border border-[#1e1e2e] bg-gradient-to-br from-[#12121a] to-[#1a1a2e]"
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isToday ? `${greeting}! ${greetingEmoji}` : `📅 ${displayDate}`}
            </h2>
            {levelInfo && (
              <p className="text-sm text-gray-400 mt-0.5">
                {isToday ? 'You are a' : 'Viewing as'}{' '}
                <span className="font-semibold" style={{ color: levelInfo.color }}>{levelInfo.name}</span>
              </p>
            )}
          </div>
          {stats && levelInfo && (
            <div className="flex items-center gap-3 bg-[#0d0d15] rounded-xl px-3 py-2 border border-[#2d2d44]">
              <div className="text-xl">
                {levelInfo.level === 6 ? '👑' : levelInfo.level === 5 ? '🏆' : levelInfo.level === 4 ? '💜' : '⚡'}
              </div>
              <div>
                <p className="text-xs text-gray-500">Level {stats.level}</p>
                <p className="text-sm font-bold" style={{ color: levelInfo.color }}>{levelInfo.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* XP Bar */}
        {stats && xpProgress && levelInfo && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span className="text-white font-medium">{stats.xp.toLocaleString()} XP</span>
              <span>{nextLevel ? `${xpProgress.needed} XP to ${nextLevel.name}` : '🎉 Max Level!'}</span>
            </div>
            <div className="h-2.5 bg-[#1e1e2e] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}99)` }}
                initial={{ width: '0%' }}
                animate={{ width: `${xpProgress.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                <div className="absolute inset-0 bg-white/10 rounded-full" />
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-3 border border-[#1e1e2e] bg-[#12121a] col-span-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame size={15} className="text-orange-400" />
            <span className="text-xs text-gray-400">Streak</span>
          </div>
          <p className="text-2xl font-black text-white">{stats?.streak_days ?? 0}</p>
          <p className="text-xs text-gray-500">days 🔥</p>
        </motion.div>

        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-3 border border-[#1e1e2e] bg-[#12121a] cursor-pointer hover:border-purple-600/40 transition-colors"
          onClick={() => onNavigate('meals')}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <UtensilsCrossed size={15} className="text-purple-400" />
            <span className="text-xs text-gray-400">Meals</span>
          </div>
          <p className="text-2xl font-black text-white">{dayMeals.length}</p>
          <p className="text-xs text-gray-500">{displayDate}</p>
        </motion.div>

        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-3 border border-[#1e1e2e] bg-[#12121a] cursor-pointer hover:border-green-600/40 transition-colors"
          onClick={() => onNavigate('exercise')}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Dumbbell size={15} className="text-green-400" />
            <span className="text-xs text-gray-400">Workouts</span>
          </div>
          <p className="text-2xl font-black text-white">{dayExercise.length}</p>
          <p className="text-xs text-gray-500">{displayDate}</p>
        </motion.div>

        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-3 border border-[#1e1e2e] bg-[#12121a] cursor-pointer hover:border-blue-600/40 transition-colors"
          onClick={() => onNavigate('ketones')}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Droplets size={15} className="text-blue-400" />
            <span className="text-xs text-gray-400">Ketones</span>
          </div>
          {latestKetone ? (
            <>
              <p className="text-2xl font-black text-white">{latestKetone.level.toFixed(1)}</p>
              <p className="text-xs mt-0.5" style={{ color: ketoneStatus?.color }}>{ketoneStatus?.label}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-gray-600">—</p>
              <p className="text-xs text-gray-600">no reading</p>
            </>
          )}
        </motion.div>
      </div>

      {/* Macro Rings + Goals */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible"
        className="rounded-2xl p-5 border border-[#1e1e2e] bg-[#12121a]">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={16} className="text-purple-400" />
          <h3 className="font-semibold text-white text-sm">
            {displayDate === 'Today' ? "Today's" : displayDate} Macros
          </h3>
          <span className="ml-auto text-xs text-gray-500">{dayMeals.length} meals</span>
        </div>

        {/* Calorie goal bar */}
        <div className="mb-4 bg-[#0d0d15] rounded-xl p-3 border border-[#1e1e2e]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Daily Calorie Goal</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{Math.round(totalMacros.calories)}</span>
              <span className="text-xs text-gray-500">/ {MACRO_GOALS.calories} kcal</span>
              {caloriePct >= 100 && <span className="text-xs text-emerald-400 font-bold">✓ Goal hit!</span>}
            </div>
          </div>
          <div className="h-3 bg-[#1e1e2e] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: caloriePct >= 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : caloriePct > 66
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #7c3aed, #a855f7)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${caloriePct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0</span>
            <span>1000</span>
            <span>2000</span>
            <span>3000 kcal</span>
          </div>
        </div>

        {/* Carbs warning */}
        {carbsOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 bg-red-900/20 border border-red-600/30 rounded-xl px-4 py-2 flex items-center gap-2"
          >
            <span className="text-base">⚠️</span>
            <p className="text-xs text-red-300">
              Carbs over limit! <span className="font-bold">{Math.round(totalMacros.carbs)}g</span> / 30g goal
            </p>
          </motion.div>
        )}

        <div className="flex flex-wrap justify-around gap-3">
          <MacroRing label="Calories" value={totalMacros.calories} goal={MACRO_GOALS.calories} color="#f59e0b" unit="" />
          <MacroRing label="Fat" value={totalMacros.fat} goal={MACRO_GOALS.fat} color="#10b981" unit="g" />
          <MacroRing label="Protein" value={totalMacros.protein} goal={MACRO_GOALS.protein} color="#3b82f6" unit="g" />
          <MacroRing label="Carbs" value={totalMacros.carbs} goal={MACRO_GOALS.carbs} color="#ef4444" unit="g" warn />
          <MacroRing label="Fiber" value={totalMacros.fiber} goal={MACRO_GOALS.fiber} color="#8b5cf6" unit="g" />
        </div>
      </motion.div>

      {/* Mini Calendar + Ketone side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mini Calendar */}
        <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-5 border border-[#1e1e2e] bg-[#12121a]">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-purple-400" />
            <h3 className="font-semibold text-white text-sm">Calendar</h3>
            {!isToday && (
              <button
                onClick={() => onDateSelect(TODAY)}
                className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Back to Today
              </button>
            )}
          </div>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={onDateSelect}
            calData={calData}
          />
        </motion.div>

        {/* Ketone Status */}
        <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-5 border border-[#1e1e2e] bg-[#12121a] cursor-pointer hover:border-blue-600/20 transition-colors"
          onClick={() => onNavigate('ketones')}>
          <div className="flex items-center gap-2 mb-4">
            <Droplets size={16} className="text-blue-400" />
            <h3 className="font-semibold text-white text-sm">Ketone Status</h3>
          </div>
          {latestKetone && ketoneStatus ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-black text-white">{latestKetone.level.toFixed(1)}</p>
                  <p className="text-sm text-gray-400">mmol/L</p>
                </div>
                <div className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: ketoneStatus.bg, color: ketoneStatus.color, border: `1px solid ${ketoneStatus.color}33` }}>
                  {ketoneStatus.label}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Logged at {latestKetone.time}</p>
              <div className="mt-3 h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, (latestKetone.level / 4) * 100)}%`,
                    background: ketoneStatus.color,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0</span><span>0.5</span><span>1.5</span><span>3.0</span><span>4+</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No ketone reading for {displayDate}</p>
              <p className="text-xs text-gray-600 mt-1">Tap to log a reading</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Badges */}
      <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible"
        className="rounded-2xl p-5 border border-[#1e1e2e] bg-[#12121a] cursor-pointer hover:border-yellow-600/20 transition-colors"
        onClick={() => onNavigate('badges')}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-yellow-400" />
          <h3 className="font-semibold text-white text-sm">Badges & Goals</h3>
          <span className="ml-auto text-xs text-gray-500">{earnedBadges.length}/{BADGES.length}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                title={`${badge.name}: ${badge.desc}`}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                  earned ? 'bg-[#1a1a2e] border border-purple-600/30' : 'bg-[#0d0d15] grayscale opacity-30'
                }`}
              >
                {badge.icon}
              </div>
            );
          })}
        </div>

        {/* Gamified goal progress */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-[#0d0d15] rounded-xl p-3 border border-[#1e1e2e]">
            <p className="text-xs text-gray-500 mb-1">🔥 Calorie Goal</p>
            <p className="text-sm font-bold text-white">{Math.round(caloriePct)}%</p>
            <div className="h-1.5 bg-[#1e1e2e] rounded-full mt-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${caloriePct}%` }} />
            </div>
          </div>
          <div className={`bg-[#0d0d15] rounded-xl p-3 border ${carbsOver ? 'border-red-600/30' : 'border-[#1e1e2e]'}`}>
            <p className="text-xs text-gray-500 mb-1">🛡️ Carb Limit</p>
            <p className={`text-sm font-bold ${carbsOver ? 'text-red-400' : 'text-white'}`}>
              {Math.round(totalMacros.carbs)}g / 30g
            </p>
            <div className="h-1.5 bg-[#1e1e2e] rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, (totalMacros.carbs / MACRO_GOALS.carbs) * 100)}%`,
                  background: carbsOver ? '#ef4444' : totalMacros.carbs / MACRO_GOALS.carbs > 0.7 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Activity for selected date */}
      {(dayMeals.length > 0 || dayExercise.length > 0) && (
        <motion.div custom={9} variants={cardVariants} initial="hidden" animate="visible"
          className="rounded-2xl p-5 border border-[#1e1e2e] bg-[#12121a]">
          <h3 className="font-semibold text-white text-sm mb-3">{displayDate}'s Activity</h3>
          <div className="space-y-2">
            {dayMeals.slice(-4).map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-[#0d0d15] rounded-xl px-3 py-2.5">
                <span>🍽️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.category} · {m.time}</p>
                </div>
                <div className="text-xs text-gray-400">{m.calories} cal</div>
              </div>
            ))}
            {dayExercise.slice(-2).map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-[#0d0d15] rounded-xl px-3 py-2.5">
                <span>💪</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{e.type}</p>
                  <p className="text-xs text-gray-500">Exercise · {e.time}</p>
                </div>
                {e.duration_minutes && <div className="text-xs text-gray-400">{e.duration_minutes}m</div>}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
