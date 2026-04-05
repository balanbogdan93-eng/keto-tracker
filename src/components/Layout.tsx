import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Calendar, UtensilsCrossed, Dumbbell, Droplets, Award, Zap, Scale
} from 'lucide-react';
import { Page } from '../App';
import { UserStats } from '../types';
import { getLevelInfo, getXPProgress, getNextLevel } from '../utils/gamification';

interface LayoutProps {
  page: Page;
  setPage: (p: Page) => void;
  statsVersion: number;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { id: 'meals', label: 'Meals', icon: <UtensilsCrossed size={20} /> },
  { id: 'exercise', label: 'Exercise', icon: <Dumbbell size={20} /> },
  { id: 'ketones', label: 'Ketones', icon: <Droplets size={20} /> },
  { id: 'weight', label: 'Weight', icon: <Scale size={20} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
  { id: 'badges', label: 'Badges', icon: <Award size={20} /> },
];

export default function Layout({ page, setPage, statsVersion, children }: LayoutProps) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, [statsVersion]);

  const levelInfo = stats ? getLevelInfo(stats.level) : null;
  const nextLevel = stats ? getNextLevel(stats.level) : null;
  const xpProgress = stats ? getXPProgress(stats.xp, stats.level) : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#1e1e2e] bg-[#0d0d15]">
        {/* Logo */}
        <div className="p-6 border-b border-[#1e1e2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center text-xl">
              🥑
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">KetoTrack</h1>
              <p className="text-xs text-gray-500">Smart Keto Companion</p>
            </div>
          </div>
        </div>

        {/* User Stats */}
        {stats && levelInfo && (
          <div className="p-4 border-b border-[#1e1e2e]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{levelInfo.level === 6 ? '👑' : '⚡'}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: levelInfo.color }}>{levelInfo.name}</p>
                  <p className="text-xs text-gray-500">Level {stats.level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{stats.xp.toLocaleString()}</p>
                <p className="text-xs text-gray-500">XP</p>
              </div>
            </div>
            {/* XP Progress Bar */}
            {xpProgress && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span></span>
                  <span>{nextLevel ? `${xpProgress.needed} to ${nextLevel.name}` : 'Max Level!'}</span>
                </div>
                <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}88)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
            {/* Streak */}
            {stats.streak_days > 0 && (
              <div className="mt-3 flex items-center gap-2 bg-[#1a1a2e] rounded-lg px-3 py-2">
                <span className="text-base">🔥</span>
                <span className="text-sm font-semibold text-orange-400">{stats.streak_days} day streak</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                page === item.id
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                  : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
              }`}
            >
              <span className={page === item.id ? 'text-purple-400' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1e1e2e]">
          <p className="text-xs text-gray-600 text-center">KetoTrack v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e] bg-[#0d0d15]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥑</span>
            <h1 className="text-lg font-bold gradient-text">KetoTrack</h1>
          </div>
          {stats && (
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">{stats.xp} XP</span>
              {stats.streak_days > 0 && (
                <span className="ml-2 text-sm">🔥 {stats.streak_days}</span>
              )}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-5xl mx-auto"
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-[#1e1e2e] bg-[#0d0d15]">
          {NAV_ITEMS.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                page === item.id ? 'text-purple-400' : 'text-gray-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
