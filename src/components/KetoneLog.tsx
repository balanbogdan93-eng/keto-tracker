import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, Droplets } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Ketone } from '../types';
import { getKetoneStatus } from '../utils/gamification';

interface KetoneLogProps {
  onLogged: () => void;
  selectedDate?: string;
  onDateChange?: (d: string) => void;
}

function KetoneTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const status = getKetoneStatus(value);
    return (
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl px-3 py-2 text-sm shadow-xl">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="font-bold text-white">{value.toFixed(2)} mmol/L</p>
        <p style={{ color: status.color }} className="text-xs">{status.label}</p>
      </div>
    );
  }
  return null;
}

export default function KetoneLog({ onLogged, selectedDate, onDateChange }: KetoneLogProps) {
  const [ketones, setKetones] = useState<Ketone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: selectedDate || new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    level: '',
    glucose: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchKetones = () => {
    fetch('/api/ketones?days=30')
      .then(r => r.json())
      .then(setKetones)
      .catch(() => {});
  };

  useEffect(() => { fetchKetones(); }, []);
  useEffect(() => {
    if (selectedDate) {
      setForm(f => ({ ...f, date: selectedDate }));
      onDateChange?.(selectedDate);
    }
  }, [selectedDate]);

  const chartData = ketones.map(k => ({
    date: k.date.slice(5), // MM-DD
    level: k.level,
    fullDate: k.date,
  }));

  const handleSubmit = async () => {
    const level = parseFloat(form.level);
    if (isNaN(level) || level < 0) { toast.error('Please enter a valid ketone level'); return; }
    setSubmitting(true);
    try {
      const glucoseVal = form.glucose ? parseFloat(form.glucose) : null;
      const res = await fetch('/api/ketones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          level,
          glucose: glucoseVal,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      const status = getKetoneStatus(level);
      toast.success(`🩸 ${level} mmol/L logged! +${data.xp_gained} XP`);
      setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), level: '', glucose: '', notes: '' });
      fetchKetones();
      onLogged();
    } catch {
      toast.error('Failed to log ketone reading');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteKetone = async (id: number) => {
    await fetch(`/api/ketones/${id}`, { method: 'DELETE' });
    fetchKetones();
    toast.success('Reading removed');
  };

  const latestReading = ketones.length > 0 ? ketones[ketones.length - 1] : null;
  const latestStatus = latestReading ? getKetoneStatus(latestReading.level) : null;

  const calcGKI = (glucoseMgdl: number | null | undefined, ketoneMmol: number) => {
    if (!glucoseMgdl || !ketoneMmol) return null;
    const glucoseMmol = glucoseMgdl / 18.0182;
    return glucoseMmol / ketoneMmol;
  };
  const gkiLabel = (gki: number) => {
    if (gki < 1) return { label: 'Therapeutic Zone', color: '#7c3aed' };
    if (gki < 3) return { label: 'High Ketosis', color: '#10b981' };
    if (gki < 6) return { label: 'Moderate Ketosis', color: '#f59e0b' };
    if (gki < 9) return { label: 'Low Ketosis', color: '#f97316' };
    return { label: 'Not Ketogenic', color: '#ef4444' };
  };

  const getLineColor = (value: number) => {
    if (value < 0.5) return '#ef4444';
    if (value < 1.5) return '#f59e0b';
    if (value <= 3.0) return '#10b981';
    return '#3b82f6';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Ketone Tracker</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor your ketosis levels</p>
        </div>
        {latestReading && latestStatus && (
          <div className="px-4 py-2 rounded-xl text-sm font-semibold border"
            style={{ background: latestStatus.bg, color: latestStatus.color, borderColor: `${latestStatus.color}33` }}>
            {latestReading.level.toFixed(1)} mmol/L
          </div>
        )}
      </div>

      {/* Current status card */}
      {latestReading && latestStatus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Latest Reading</p>
              <p className="text-5xl font-black text-white">{latestReading.level.toFixed(1)}</p>
              <p className="text-sm text-gray-400 mt-1">mmol/L ketones</p>
              {latestReading.glucose && (
                <p className="text-sm text-gray-400 mt-0.5">{latestReading.glucose} mg/dL glucose</p>
              )}
            </div>
            <div className="text-right">
              <div className="inline-flex px-4 py-2 rounded-xl text-sm font-semibold mb-2"
                style={{ background: latestStatus.bg, color: latestStatus.color }}>
                {latestStatus.label}
              </div>
              <p className="text-xs text-gray-500">{latestReading.date} at {latestReading.time}</p>
              {(() => {
                const gki = calcGKI(latestReading.glucose, latestReading.level);
                if (gki === null) return null;
                const info = gkiLabel(gki);
                return (
                  <div className="mt-2 bg-[#0d0d15] rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-500">GKI Index</p>
                    <p className="text-2xl font-black" style={{ color: info.color }}>{gki.toFixed(1)}</p>
                    <p className="text-xs font-medium" style={{ color: info.color }}>{info.label}</p>
                  </div>
                );
              })()}
            </div>
          </div>
          {/* Zones guide */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: '< 0.5', name: 'Not in ketosis', color: '#ef4444' },
              { label: '0.5–1.5', name: 'Light', color: '#f59e0b' },
              { label: '1.5–3.0', name: 'Optimal', color: '#10b981' },
              { label: '> 3.0', name: 'High', color: '#3b82f6' },
            ].map(zone => (
              <div key={zone.label} className="text-center">
                <div className="h-1.5 rounded-full mb-1" style={{ background: zone.color }} />
                <p className="text-xs text-gray-500">{zone.label}</p>
                <p className="text-xs font-medium" style={{ color: zone.color }}>{zone.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chart */}
      {ketones.length > 1 && (
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
              <Tooltip content={<KetoneTooltip />} />
              <ReferenceLine y={0.5} stroke="#ef444488" strokeDasharray="4 4" label={{ value: '0.5', fill: '#ef4444', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={1.5} stroke="#10b98188" strokeDasharray="4 4" label={{ value: '1.5', fill: '#10b981', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={3.0} stroke="#3b82f688" strokeDasharray="4 4" label={{ value: '3.0', fill: '#3b82f6', fontSize: 10, position: 'right' }} />
              <Line
                type="monotone"
                dataKey="level"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const color = getLineColor(payload.level);
                  return <circle key={cx} cx={cx} cy={cy} r={4} fill={color} stroke={color} strokeWidth={2} />;
                }}
                activeDot={{ r: 6, fill: '#7c3aed' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#12121a] border border-[#2d2d44] rounded-2xl p-5 mb-4 overflow-hidden"
          >
            <h4 className="font-semibold text-white mb-4">Log Ketone Reading</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-600/60"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-600/60"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-blue-400 mb-1 block">Ketones (mmol/L)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="e.g. 1.8"
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-blue-600/60"
                />
                {form.level && !isNaN(parseFloat(form.level)) && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: getKetoneStatus(parseFloat(form.level)).color }}>
                    {getKetoneStatus(parseFloat(form.level)).label}
                    {parseFloat(form.level) >= 1.5 && parseFloat(form.level) <= 3.0 && ' +20 bonus XP!'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-red-400 mb-1 block">Blood Glucose (mg/dL)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="600"
                  placeholder="e.g. 85"
                  value={form.glucose}
                  onChange={e => setForm(f => ({ ...f, glucose: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-red-600/60"
                />
                {form.glucose && form.level && !isNaN(parseFloat(form.glucose)) && !isNaN(parseFloat(form.level)) && parseFloat(form.level) > 0 && (() => {
                  const gki = calcGKI(parseFloat(form.glucose), parseFloat(form.level));
                  if (!gki) return null;
                  const info = gkiLabel(gki);
                  return <p className="text-xs mt-1.5 font-medium" style={{ color: info.color }}>GKI: {gki.toFixed(1)} — {info.label}</p>;
                })()}
              </div>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-600/60 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-[#2d2d44] text-gray-400 rounded-xl text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? 'Logging...' : '✓ Log Reading'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-blue-600/40 text-blue-400 hover:border-blue-500 hover:text-blue-300 hover:bg-blue-600/5 transition-all flex items-center justify-center gap-2 font-medium mb-6"
        >
          <Plus size={18} />
          Log Ketone Reading
        </motion.button>
      )}

      {/* Recent readings list */}
      {ketones.length > 0 && (
        <div>
          <h3 className="font-semibold text-white mb-3">Recent Readings</h3>
          <div className="space-y-2">
            <AnimatePresence>
              {[...ketones].reverse().slice(0, 10).map(k => {
                const status = getKetoneStatus(k.level);
                return (
                  <motion.div
                    key={k.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-3 flex items-center justify-between hover:border-[#2d2d44] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Droplets size={16} style={{ color: status.color }} />
                      <div>
                        <p className="text-sm font-medium text-white">{k.date}</p>
                        <p className="text-xs text-gray-500">{k.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: status.bg, color: status.color }}>
                          {k.level.toFixed(1)} mmol/L
                        </span>
                        {k.glucose && (
                          <p className="text-xs text-gray-500 mt-1">{k.glucose} mg/dL</p>
                        )}
                        {(() => {
                          const gki = calcGKI(k.glucose, k.level);
                          if (!gki) return null;
                          const info = gkiLabel(gki);
                          return <p className="text-xs font-medium" style={{ color: info.color }}>GKI {gki.toFixed(1)}</p>;
                        })()}
                      </div>
                      <button
                        onClick={() => deleteKetone(k.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      >
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

      {ketones.length === 0 && !showForm && (
        <div className="text-center py-10 text-gray-600">
          <p className="text-4xl mb-3">🩸</p>
          <p className="text-sm">No ketone readings logged yet</p>
          <p className="text-xs mt-1">Log your first reading to track ketosis</p>
        </div>
      )}
    </div>
  );
}
