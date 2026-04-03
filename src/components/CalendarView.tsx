import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, UtensilsCrossed, Dumbbell, Droplets } from 'lucide-react';
import { CalendarData, Meal, Exercise, Ketone } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface DayDetail {
  date: string;
  meals: Meal[];
  exercise: Exercise[];
  ketones: Ketone[];
}

interface CalendarViewProps {
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
}

export default function CalendarView({ selectedDate, onDateSelect }: CalendarViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calData, setCalData] = useState<CalendarData>({});
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(setCalData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = now.toISOString().split('T')[0];

  const getDayColor = (dateStr: string) => {
    const d = calData[dateStr];
    if (!d) return null;
    const score = (d.meals ? 1 : 0) + (d.exercise ? 1 : 0) + (d.ketones ? 1 : 0);
    if (score === 3) return '#10b981';
    if (score >= 1) return '#f59e0b';
    return null;
  };

  const handleDayClick = async (dateStr: string) => {
    // Emit to parent (navigates to dashboard with this date)
    if (onDateSelect) {
      onDateSelect(dateStr);
      return;
    }
    // Fallback: show inline detail modal
    const [meals, exercise, ketones] = await Promise.all([
      fetch(`/api/meals?date=${dateStr}`).then(r => r.json()).catch(() => []),
      fetch(`/api/exercise?date=${dateStr}`).then(r => r.json()).catch(() => []),
      fetch('/api/ketones?days=365').then(r => r.json()).then((k: Ketone[]) =>
        k.filter(e => e.date === dateStr)
      ).catch(() => []),
    ]);
    setSelectedDay({ date: dateStr, meals, exercise, ketones });
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">Track your consistency</p>
        </div>
        <div className="flex items-center gap-3 bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-2">
          <button onClick={prevMonth} className="text-gray-400 hover:text-white transition-colors p-1">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-white min-w-[140px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-white transition-colors p-1">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
          <span>All three</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span>Some activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#1e1e2e]" />
          <span>No logs</span>
        </div>
      </div>

      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#1e1e2e]">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-3">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="aspect-square border-r border-b border-[#1e1e2e]" />;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const color = getDayColor(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const d = calData[dateStr];

            return (
              <motion.button
                key={dateStr}
                whileHover={{ scale: 0.95 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDayClick(dateStr)}
                className={`aspect-square border-r border-b border-[#1e1e2e] flex flex-col items-center justify-center gap-1 relative transition-colors hover:bg-[#1a1a2e] ${
                  isSelected ? 'bg-purple-600/30 ring-1 ring-inset ring-purple-500' : isToday ? 'bg-purple-900/20' : ''
                }`}
              >
                <span className={`text-sm font-medium ${
                  isSelected ? 'text-purple-200 font-bold' : isToday ? 'text-purple-300' : 'text-gray-300'
                }`}>
                  {day}
                </span>
                {color && (
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                )}
                {!color && d && (
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                )}
                {isToday && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-[#12121a] border border-[#2d2d44] rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">{selectedDay.date}</h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {selectedDay.meals.length === 0 && selectedDay.exercise.length === 0 && selectedDay.ketones.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No activity logged on this day</p>
              ) : (
                <div className="space-y-4">
                  {selectedDay.meals.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed size={14} className="text-purple-400" />
                        <h4 className="text-sm font-semibold text-purple-300">Meals ({selectedDay.meals.length})</h4>
                      </div>
                      <div className="space-y-1.5">
                        {selectedDay.meals.map(m => (
                          <div key={m.id} className="bg-[#0d0d15] rounded-lg px-3 py-2 flex justify-between items-center">
                            <div>
                              <p className="text-sm text-white">{m.name}</p>
                              <p className="text-xs text-gray-500">{m.category} · {m.time}</p>
                            </div>
                            <div className="text-xs text-gray-400">{m.calories}cal</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDay.exercise.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell size={14} className="text-green-400" />
                        <h4 className="text-sm font-semibold text-green-300">Exercise ({selectedDay.exercise.length})</h4>
                      </div>
                      <div className="space-y-1.5">
                        {selectedDay.exercise.map(e => (
                          <div key={e.id} className="bg-[#0d0d15] rounded-lg px-3 py-2 flex justify-between items-center">
                            <div>
                              <p className="text-sm text-white">{e.type}</p>
                              <p className="text-xs text-gray-500">{e.time}</p>
                            </div>
                            {e.duration_minutes && (
                              <div className="text-xs text-gray-400">{e.duration_minutes}m</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDay.ketones.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets size={14} className="text-blue-400" />
                        <h4 className="text-sm font-semibold text-blue-300">Ketones ({selectedDay.ketones.length})</h4>
                      </div>
                      <div className="space-y-1.5">
                        {selectedDay.ketones.map(k => (
                          <div key={k.id} className="bg-[#0d0d15] rounded-lg px-3 py-2 flex justify-between items-center">
                            <p className="text-xs text-gray-500">{k.time}</p>
                            <p className="text-sm font-bold text-blue-300">{k.level.toFixed(1)} mmol/L</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
