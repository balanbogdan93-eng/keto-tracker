import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { BADGES, LEVELS, getLevelInfo, getXPProgress } from '../utils/gamification';
import { UserStats } from '../types';

export default function Badges() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const earnedBadges = stats ? JSON.parse(stats.badges || '[]') as string[] : [];
  const earnedCount = earnedBadges.length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Badges & Levels</h2>
        <p className="text-sm text-gray-500 mt-1">Your keto achievements</p>
      </div>

      {/* Badges earned counter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900/30 to-purple-800/10 border border-purple-700/30 rounded-2xl p-5 mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-300 font-medium">Badges Earned</p>
            <p className="text-4xl font-black text-white mt-1">
              {earnedCount}<span className="text-gray-500 text-2xl">/{BADGES.length}</span>
            </p>
          </div>
          <div className="text-5xl">🏆</div>
        </div>
        <div className="mt-3 h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / BADGES.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Badges grid */}
      <div className="mb-8">
        <h3 className="font-semibold text-white mb-4">All Badges</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {BADGES.map((badge, i) => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', damping: 20 }}
                className={`relative rounded-2xl p-4 border text-center transition-all ${
                  earned
                    ? 'bg-[#12121a] border-purple-600/30 glow-purple'
                    : 'bg-[#0d0d15] border-[#1e1e2e] opacity-60'
                }`}
              >
                {!earned && (
                  <div className="absolute top-2 right-2">
                    <Lock size={12} className="text-gray-600" />
                  </div>
                )}
                <div className={`text-4xl mb-2 ${!earned ? 'grayscale' : ''}`}>
                  {badge.icon}
                </div>
                <p className={`text-sm font-semibold mb-1 ${earned ? 'text-white' : 'text-gray-500'}`}>
                  {badge.name}
                </p>
                <p className="text-xs text-gray-500">{badge.desc}</p>
                {earned && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-2 inline-flex px-2 py-0.5 bg-purple-600/20 border border-purple-600/30 rounded-full text-xs text-purple-300 font-medium"
                  >
                    Earned!
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Level progression */}
      <div>
        <h3 className="font-semibold text-white mb-4">Level Progression</h3>
        <div className="space-y-3">
          {LEVELS.map((lvl, i) => {
            const isCurrentLevel = stats?.level === lvl.level;
            const isUnlocked = (stats?.level ?? 0) >= lvl.level;
            const xpProgress = stats && isCurrentLevel ? getXPProgress(stats.xp, stats.level) : null;

            return (
              <motion.div
                key={lvl.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-xl p-4 border transition-all ${
                  isCurrentLevel
                    ? 'bg-[#12121a] border-opacity-60'
                    : isUnlocked
                    ? 'bg-[#0d0d15] border-[#1e1e2e]'
                    : 'bg-[#0d0d15] border-[#1a1a1a] opacity-50'
                }`}
                style={isCurrentLevel ? { borderColor: `${lvl.color}50` } : {}}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{
                      background: isUnlocked ? `${lvl.color}20` : '#1a1a2e',
                      color: isUnlocked ? lvl.color : '#4b5563',
                      border: `1px solid ${isUnlocked ? lvl.color + '40' : '#2d2d44'}`
                    }}
                  >
                    {lvl.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                        {lvl.name}
                      </p>
                      {isCurrentLevel && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${lvl.color}20`, color: lvl.color }}>
                          Current
                        </span>
                      )}
                      {isUnlocked && !isCurrentLevel && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#1e1e2e] text-gray-400">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{lvl.minXP.toLocaleString()} XP required</p>
                    {isCurrentLevel && xpProgress && (
                      <div className="mt-2 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: lvl.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress.progress}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-2xl flex-shrink-0">
                    {lvl.level === 6 ? '👑' :
                     lvl.level === 5 ? '🏆' :
                     lvl.level === 4 ? '💜' :
                     lvl.level === 3 ? '⚡' :
                     lvl.level === 2 ? '🔥' : '🥑'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
