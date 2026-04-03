import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Dumbbell, Clock, FileText } from 'lucide-react';
import { Exercise } from '../types';

const EXERCISE_TYPES = [
  { id: 'Weight Training', icon: '🏋️' },
  { id: 'Cardio', icon: '🏃' },
  { id: 'HIIT', icon: '⚡' },
  { id: 'Yoga', icon: '🧘' },
  { id: 'Walking', icon: '🚶' },
  { id: 'Other', icon: '🎯' },
];

interface ExerciseLogProps {
  onLogged: () => void;
  selectedDate?: string;
  onDateChange?: (d: string) => void;
}

export default function ExerciseLog({ onLogged, selectedDate, onDateChange }: ExerciseLogProps) {
  const [date, setDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);

  useEffect(() => { if (selectedDate) setDate(selectedDate); }, [selectedDate]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'Weight Training',
    duration_minutes: '',
    notes: '',
    time: new Date().toTimeString().slice(0, 5),
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExercises = () => {
    fetch(`/api/exercise?date=${date}`)
      .then(r => r.json())
      .then(setExercises)
      .catch(() => {});
  };

  useEffect(() => { fetchExercises(); }, [date]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const nd = d.toISOString().split('T')[0];
    setDate(nd);
    onDateChange?.(nd);
  };

  const handleSubmit = async () => {
    if (!form.type) { toast.error('Please select an exercise type'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time: form.time,
          type: form.type,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      toast.success(`💪 ${form.type} logged! +${data.xp_gained} XP`);
      setShowForm(false);
      setForm({ type: 'Weight Training', duration_minutes: '', notes: '', time: new Date().toTimeString().slice(0, 5) });
      fetchExercises();
      onLogged();
    } catch {
      toast.error('Failed to log exercise');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExercise = async (id: number) => {
    await fetch(`/api/exercise/${id}`, { method: 'DELETE' });
    fetchExercises();
    toast.success('Exercise removed');
  };

  const typeInfo = (type: string) => EXERCISE_TYPES.find(t => t.id === type) || EXERCISE_TYPES[5];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Exercise Log</h2>
          <p className="text-sm text-gray-500 mt-1">Track your workouts (+15 XP each)</p>
        </div>
        <div className="flex items-center gap-2 bg-[#12121a] border border-[#1e1e2e] rounded-xl px-3 py-2">
          <button onClick={() => changeDate(-1)} className="text-gray-400 hover:text-white p-1">
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); onDateChange?.(e.target.value); }}
            className="bg-transparent text-white text-sm font-medium focus:outline-none"
          />
          <button onClick={() => changeDate(1)} className="text-gray-400 hover:text-white p-1">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3 mb-4">
        <AnimatePresence>
          {exercises.map(ex => {
            const info = typeInfo(ex.type);
            return (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4 hover:border-[#2d2d44] transition-colors card-hover"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1a1a2e] flex items-center justify-center text-2xl flex-shrink-0">
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-white">{ex.type}</h4>
                      <button
                        onClick={() => deleteExercise(ex.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={11} /> {ex.time}
                      </span>
                      {ex.duration_minutes && (
                        <span className="text-xs bg-green-900/30 text-green-400 border border-green-800/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Dumbbell size={11} /> {ex.duration_minutes} min
                        </span>
                      )}
                    </div>
                    {ex.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
                        <FileText size={11} className="mt-0.5 flex-shrink-0" />
                        {ex.notes}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {exercises.length === 0 && !showForm && (
          <div className="text-center py-10 text-gray-600">
            <p className="text-4xl mb-3">💪</p>
            <p className="text-sm">No workouts logged for this day</p>
          </div>
        )}
      </div>

      {/* Add form (inline) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#12121a] border border-[#2d2d44] rounded-2xl p-5 mb-4 overflow-hidden"
          >
            <h4 className="font-semibold text-white mb-4">Log Workout</h4>

            {/* Exercise type grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {EXERCISE_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all ${
                    form.type === t.id
                      ? 'bg-green-600/20 text-green-300 border border-green-600/40'
                      : 'bg-[#0d0d15] text-gray-400 border border-[#1e1e2e] hover:border-[#2d2d44] hover:text-white'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  {t.id}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600/60"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Duration (minutes)</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600/60"
                />
              </div>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-600/60 resize-none mb-4"
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
                className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? 'Logging...' : '✓ Log Workout'}
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
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-green-600/40 text-green-400 hover:border-green-500 hover:text-green-300 hover:bg-green-600/5 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={18} />
          Log Workout
        </motion.button>
      )}
    </div>
  );
}
