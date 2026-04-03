import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, X, Trash2, Search, PenLine, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Meal } from '../types';

const CATEGORIES = [
  { id: 'Breakfast', icon: '🌅' },
  { id: 'Shake', icon: '🥤' },
  { id: 'Lunch', icon: '☀️' },
  { id: 'Snack', icon: '🍫' },
  { id: 'Dinner', icon: '🌙' },
];

interface MealLogProps {
  onLogged: () => void;
  selectedDate?: string;
  onDateChange?: (d: string) => void;
}

type InputMode = 'search' | 'manual';

interface FoodResult {
  name: string;
  brand: string;
  serving_size: string;
  image: string | null;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
  fiber: number;
}

interface MealForm {
  name: string;
  calories: string;
  fat: string;
  protein: string;
  carbs: string;
  fiber: string;
  notes: string;
  category: string;
  time: string;
}

const defaultForm = (category: string): MealForm => ({
  name: '', calories: '0', fat: '0', protein: '0', carbs: '0', fiber: '0',
  notes: '', category, time: new Date().toTimeString().slice(0, 5),
});

export default function MealLog({ onLogged, selectedDate, onDateChange }: MealLogProps) {
  const [date, setDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  useEffect(() => { if (selectedDate) setDate(selectedDate); }, [selectedDate]);
  const [activeCategory, setActiveCategory] = useState('Breakfast');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('search');
  const [form, setForm] = useState<MealForm>(defaultForm('Breakfast'));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [servingSize, setServingSize] = useState('100');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMeals = () => {
    fetch(`/api/meals?date=${date}`)
      .then(r => r.json())
      .then(setMeals)
      .catch(() => {});
  };

  useEffect(() => { fetchMeals(); }, [date]);

  const filteredMeals = meals.filter(m => m.category === activeCategory);

  const openModal = (cat: string) => {
    setActiveCategory(cat);
    setForm(defaultForm(cat));
    setSearchQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setServingSize('100');
    setInputMode('search');
    setShowModal(true);
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/ai/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSelectedFood(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(q), 500);
  };

  const selectFood = (food: FoodResult, grams: number = 100) => {
    const ratio = grams / 100;
    setSelectedFood(food);
    setServingSize(String(grams));
    setForm(f => ({
      ...f,
      name: food.name,
      calories: String(Math.round(food.calories * ratio)),
      fat: String(Math.round(food.fat * ratio * 10) / 10),
      protein: String(Math.round(food.protein * ratio * 10) / 10),
      carbs: String(Math.round(food.carbs * ratio * 10) / 10),
      fiber: String(Math.round(food.fiber * ratio * 10) / 10),
    }));
  };

  const updateServing = (grams: string) => {
    const g = parseFloat(grams) || 100;
    setServingSize(grams);
    if (selectedFood) selectFood(selectedFood, g);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Please enter a meal name'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time: form.time,
          category: form.category,
          name: form.name,
          calories: parseFloat(form.calories) || 0,
          fat: parseFloat(form.fat) || 0,
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fiber: parseFloat(form.fiber) || 0,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      toast.success(`🥑 ${form.name} logged! +${data.xp_gained} XP`);
      setShowModal(false);
      fetchMeals();
      onLogged();
    } catch {
      toast.error('Failed to log meal');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMeal = async (id: number) => {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    fetchMeals();
    toast.success('Meal removed');
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const nd = d.toISOString().split('T')[0];
    setDate(nd);
    onDateChange?.(nd);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Meal Log</h2>
          <p className="text-sm text-gray-500 mt-1">Track your keto nutrition</p>
        </div>
        <div className="flex items-center gap-2 bg-[#12121a] border border-[#1e1e2e] rounded-xl px-3 py-2">
          <button onClick={() => changeDate(-1)} className="text-gray-400 hover:text-white p-1">
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-transparent text-white text-sm font-medium focus:outline-none"
          />
          <button onClick={() => changeDate(1)} className="text-gray-400 hover:text-white p-1">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-purple-600/20 text-purple-300 border border-purple-600/40'
                : 'bg-[#12121a] text-gray-400 border border-[#1e1e2e] hover:border-[#2d2d44] hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.id}
            {meals.filter(m => m.category === cat.id).length > 0 && (
              <span className="ml-1 bg-purple-600/40 text-purple-300 text-xs px-1.5 py-0.5 rounded-full">
                {meals.filter(m => m.category === cat.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Meal list */}
      <div className="space-y-3 mb-4">
        <AnimatePresence>
          {filteredMeals.map(meal => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4 flex items-start gap-4 hover:border-[#2d2d44] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-white truncate">{meal.name}</h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">{meal.time}</span>
                    <button
                      onClick={() => deleteMeal(meal.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <MacroChip color="#f59e0b" label={`${meal.calories} cal`} />
                  <MacroChip color="#10b981" label={`fat ${meal.fat}g`} />
                  <MacroChip color="#3b82f6" label={`prot ${meal.protein}g`} />
                  <MacroChip color="#ef4444" label={`carbs ${meal.carbs}g`} />
                  {meal.fiber > 0 && <MacroChip color="#8b5cf6" label={`fiber ${meal.fiber}g`} />}
                </div>
                {meal.notes && <p className="text-xs text-gray-500 mt-2">{meal.notes}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredMeals.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm">No {activeCategory.toLowerCase()} logged yet</p>
          </div>
        )}
      </div>

      {/* Add button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => openModal(activeCategory)}
        className="w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-600/40 text-purple-400 hover:border-purple-500 hover:text-purple-300 hover:bg-purple-600/5 transition-all flex items-center justify-center gap-2 font-medium"
      >
        <Plus size={18} />
        Add {activeCategory}
      </motion.button>

      {/* Add Meal Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-[#12121a] border border-[#2d2d44] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Add Meal</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Category selector */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      form.category === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1a1a2e] text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat.icon} {cat.id}
                  </button>
                ))}
              </div>

              {/* Input mode toggle */}
              <div className="flex gap-2 mb-5 bg-[#0d0d15] rounded-xl p-1">
                {([['search', <Search size={14} />, '🔍 Search Food'], ['manual', <PenLine size={14} />, '✏️ Manual']] as [InputMode, React.ReactNode, string][]).map(([mode, icon, label]) => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      inputMode === mode ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* Search mode */}
              {inputMode === 'search' && (
                <div className="mb-5 space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchInput}
                      placeholder="Search food database... (e.g. almond butter)"
                      className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600/60"
                      autoFocus
                    />
                    {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />}
                  </div>

                  {/* Search results */}
                  {searchResults.length > 0 && !selectedFood && (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {searchResults.map((food, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => selectFood(food, 100)}
                          className="w-full text-left bg-[#0d0d15] border border-[#2d2d44] hover:border-purple-600/50 rounded-xl p-3 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {food.image && (
                              <img src={food.image} alt={food.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{food.name}</p>
                              {food.brand && <p className="text-gray-500 text-xs truncate">{food.brand}</p>}
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs text-amber-400">{food.calories} cal</span>
                                <span className="text-xs text-emerald-400">F {food.fat}g</span>
                                <span className="text-xs text-blue-400">P {food.protein}g</span>
                                <span className="text-xs text-red-400">C {food.carbs}g</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-600 flex-shrink-0">per 100g</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Selected food + serving size */}
                  {selectedFood && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white font-medium text-sm">{selectedFood.name}</p>
                          {selectedFood.brand && <p className="text-gray-500 text-xs">{selectedFood.brand}</p>}
                        </div>
                        <button onClick={() => { setSelectedFood(null); setSearchResults([]); setSearchQuery(''); }} className="text-gray-500 hover:text-white">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 whitespace-nowrap">Serving (g):</label>
                        <input
                          type="number"
                          value={servingSize}
                          onChange={e => updateServing(e.target.value)}
                          className="w-20 bg-[#0d0d15] border border-[#2d2d44] rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-600/60"
                        />
                        <div className="flex gap-1">
                          {['50', '100', '150', '200'].map(g => (
                            <button
                              key={g}
                              onClick={() => updateServing(g)}
                              className={`px-2 py-1 rounded-lg text-xs transition-all ${servingSize === g ? 'bg-purple-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'}`}
                            >
                              {g}g
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {searchQuery && !searching && searchResults.length === 0 && !selectedFood && (
                    <p className="text-center text-gray-600 text-sm py-4">No results found. Try different keywords or use Manual mode.</p>
                  )}
                </div>
              )}

              {/* Macro form */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Meal name *"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600/60"
                />
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Calories', 'calories', '#f59e0b'],
                    ['Fat (g)', 'fat', '#10b981'],
                    ['Protein (g)', 'protein', '#3b82f6'],
                    ['Carbs (g)', 'carbs', '#ef4444'],
                    ['Fiber (g)', 'fiber', '#8b5cf6'],
                    ['Time', 'time', '#6b7280'],
                  ] as [string, keyof MealForm, string][]).map(([label, key, color]) => (
                    <div key={key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color }}>{label}</label>
                      <input
                        type={key === 'time' ? 'time' : 'number'}
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        step="0.1"
                        className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600/60"
                      />
                    </div>
                  ))}
                </div>
                <textarea
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#0d0d15] border border-[#2d2d44] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600/60 resize-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-5 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : '✓ Add Meal'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}
