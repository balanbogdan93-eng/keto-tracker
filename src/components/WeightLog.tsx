import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Scale, Trash2, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WeightEntry } from '../types';

const KG_TO_LB = 2.20462;
const TIME_OPTIONS = [
  { id: 'morning', label: 'Morning', emoji: '🌅' },
  { id: 'noon',    label: 'Noon',    emoji: '☀️' },
  { id: 'night',   label: 'Night',   emoji: '🌙' },
] as const;

interface WeightLogProps {
  onLogged: () => void;
  selectedDate?: string;
  onDateChange?: (d: string) => void;
}

function WeightTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const kg = payload[0].value;
    return (
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl px-3 py-2 text-sm shadow-xl">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="font-bold text-white">{kg.toFixed(1)} kg</p>
        <p className="text-gray-400 text-xs">{(kg * KG_TO_LB).toFixed(1)} lbs</p>
      </div>
    );
  }
  return null;
}

export default function WeightLog({ onLogged, selectedDate, onDateChange }: WeightLogProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(selectedDate || today);
  const [allEntries, setAllEntries] = useState<WeightEntry[]>([]);
  const [dayEntries, setDayEntries] = useState<WeightEntry[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'noon' | 'night'>('morning');
  const [kg, setKg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (selectedDate) setDate(selectedDate); }, [selectedDate]);

  const fetchAll = () => {
    fetch('/api/weight?days=90').then(r => r.json()).then(setAllEntries).catch(() => {});
  };
  const fetchDay = (d: string) => {
    fetch(`/api/weight/date/${d}`).then(r => r.json()).then(setDayEntries).catch(() => {});
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchDay(date); }, [date]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const nd = d.toISOString().split('T')[0];
    setDate(nd);
    onDateChange?.(nd);
  };

  const handleSubmit = async () => {
    const weight = parseFloat(kg);
    if (isNaN(weight) || weight < 20 || weight > 300) {
      toast.error('Enter a valid weight (20–300 kg)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time_of_day: timeOfDay, kg: weight }),
      });
      const data = await res.json();
      toast.success(`⚖️ ${weight} kg logged! +${data.xp_gained} XP`);
      setKg('');
      fetchAll();
      fetchDay(date);
      onLogged();
    } catch {
      toast.error('Failed to log weight');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async (id: number) => {
    await fetch(`/api/weight/${id}`, { method: 'DELETE' });
    fetchAll();
    fetchDay(date);
    toast.success('Entry removed');
  };

  // Chart data — one point per day (use morning if available, else last)
  const chartData = (() => {
    const byDate: Record<string, number> = {};
    allEntries.forEach(e => {
      if (!byDate[e.date] || e.time_of_day === 'morning') byDate[e.date] = e.kg;
    });
    return Object.entries(byDate).map(([d, kg]) => ({ date: d.slice(5), kg, fullDate: d }));
  })();

  const latest = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;
  const first = allEntries.length > 1 ? allEntries[0] : null;
  const trend = latest && first ? latest.kg - first.kg : null;
  const lbsValue = kg && !isNaN(parseFloat(kg)) ? (parseFloat(kg) * KG_TO_LB).toFixed(1) : null;

  // Pre-fill from existing day entry for selected time slot
  useEffect(() => {
    const existing = dayEntries.find(e => e.time_of_day === timeOfDay);
    if (existing) setKg(String(existing.kg));
    else setKg('');
  }, [timeOfDay, dayEntries]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Weight Tracker</h2>
          <p className="text-sm text-gray-500 mt-1">Log & track your weight journey</p>
        </div>
        {latest && (
          <div className="text-right">
            <p className="text-2xl font-black text-white">{latest.kg.toFixed(1)} <span className="text-sm font-normal text-gray-400">kg</span></p>
            <p className="text-xs text-gray-500">{(latest.kg * KG_TO_LB).toFixed(1)} lbs</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {allEntries.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Current</p>
            <p className="text-xl font-black text-white">{latest?.kg.toFixed(1)}</p>
            <p className="text-xs text-gray-500">kg</p>
          </div>
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">In lbs</p>
            <p className="text-xl font-black text-white">{latest ? (latest.kg * KG_TO_LB).toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-500">lbs</p>
          </div>
          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Change</p>
            {trend !== null ? (
              <div className="flex items-center gap-1">
                {trend < 0 ? <TrendingDown size={16} className="text-emerald-400" /> :
                 trend > 0 ? <TrendingUp size={16} className="text-red-400" /> :
                 <Minus size={16} className="text-gray-400" />}
                <p className="text-xl font-black" style={{ color: trend < 0 ? '#10b981' : trend > 0 ? '#ef4444' : '#6b7280' }}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                </p>
              </div>
            ) : <p className="text-xl font-black text-gray-600">—</p>}
            <p className="text-xs text-gray-500">kg total</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Weight Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<WeightTooltip />} />
              <Line
                type="monotone" dataKey="kg" stroke="#7c3aed" strokeWidth={2.5}
                dot={{ fill: '#7c3aed', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#a855f7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log form */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-sm">Log Weight</h3>
          {/* Date picker */}
          <div className="flex items-center gap-1.5 bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-2 py-1.5">
            <button onClick={() => changeDate(-1)} className="text-gray-400 hover:text-white p-0.5"><ChevronLeft size={14} /></button>
            <input
              type="date" value={date}
              onChange={e => { setDate(e.target.value); onDateChange?.(e.target.value); }}
              className="bg-transparent text-white text-xs font-medium focus:outline-none"
            />
            <button onClick={() => changeDate(1)} className="text-gray-400 hover:text-white p-0.5"><ChevronRight size={14} /></button>
          </div>
        </div>

        {/* Time of day selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TIME_OPTIONS.map(opt => {
            const existing = dayEntries.find(e => e.time_of_day === opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => setTimeOfDay(opt.id)}
                className={`py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 relative ${
                  timeOfDay === opt.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#0d0d15] text-gray-400 border border-[#2d2d44] hover:border-purple-600/40 hover:text-white'
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span>{opt.label}</span>
                {existing && (
                  <span className="text-xs opacity-75">{existing.kg} kg</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Weight input */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Weight (kg)</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="e.g. 75.5"
              value={kg}
              onChange={e => setKg(e.target.value)}
              className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-4 text-white text-3xl font-black focus:outline-none focus:border-purple-600/60 pr-20"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
              <p className="text-sm font-bold text-gray-400">kg</p>
              {lbsValue && <p className="text-xs text-gray-600">{lbsValue} lbs</p>}
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSubmit}
          disabled={submitting || !kg}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Scale size={16} />
          {submitting ? 'Saving...' : `Save ${TIME_OPTIONS.find(t => t.id === timeOfDay)?.label} Weight`}
        </motion.button>
      </div>

      {/* Today's entries */}
      {dayEntries.length > 0 && (
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-3">
            {date === today ? "Today's" : date} Entries
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {dayEntries.map(e => {
                const opt = TIME_OPTIONS.find(t => t.id === e.time_of_day);
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between bg-[#0d0d15] rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{opt?.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{opt?.label}</p>
                        <p className="text-xs text-gray-500">{(e.kg * KG_TO_LB).toFixed(1)} lbs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-black text-white">{e.kg.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">kg</p>
                      </div>
                      <button onClick={() => deleteEntry(e.id)} className="text-gray-600 hover:text-red-400 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {allEntries.length === 0 && (
        <div className="text-center py-10 text-gray-600">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="text-sm">No weight logged yet</p>
          <p className="text-xs mt-1">Log your first entry above</p>
        </div>
      )}
    </div>
  );
}
