import React, { useState } from 'react';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import MealLog from './components/MealLog';
import ExerciseLog from './components/ExerciseLog';
import KetoneLog from './components/KetoneLog';
import WeightLog from './components/WeightLog';
import Badges from './components/Badges';

export type Page = 'dashboard' | 'calendar' | 'meals' | 'exercise' | 'ketones' | 'weight' | 'badges';

const TODAY = new Date().toISOString().split('T')[0];

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [statsVersion, setStatsVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const refreshStats = () => setStatsVersion(v => v + 1);

  const handleDateSelect = (date: string, navigateTo?: Page) => {
    setSelectedDate(date);
    if (navigateTo) setPage(navigateTo);
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            border: '1px solid #2d2d44',
            color: 'white',
          },
        }}
      />
      <Layout page={page} setPage={setPage} statsVersion={statsVersion}>
        {page === 'dashboard' && (
          <Dashboard
            onNavigate={setPage}
            statsVersion={statsVersion}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        )}
        {page === 'calendar' && (
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={(date) => handleDateSelect(date, 'dashboard')}
          />
        )}
        {page === 'meals' && (
          <MealLog onLogged={refreshStats} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {page === 'exercise' && (
          <ExerciseLog onLogged={refreshStats} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {page === 'ketones' && (
          <KetoneLog onLogged={refreshStats} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {page === 'weight' && (
          <WeightLog onLogged={refreshStats} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {page === 'badges' && <Badges />}
      </Layout>
    </>
  );
}
