import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Clock, Play, StopCircle, ChevronLeft, ChevronRight, BarChart2, List } from 'lucide-react';

// Utils
import { TASK_COLORS, STORAGE_KEY_PLANS, STORAGE_KEY_ACTUALS } from './utils/constants';
import { timeToMins, minsToTime, formatMins, formatDate, getDisplayDate, addDays } from './utils/helpers';
import { loadData, saveData, getInitialPlans, getInitialActuals } from './utils/storage';

// Components
import TimelineView from './components/TimelineView';
import StatsView from './components/StatsView';
import PlanModal from './components/PlanModal';
import ActualModal from './components/ActualModal';
import TimerStartModal from './components/TimerStartModal';
import CalendarModal from './components/CalendarModal';

export default function App() {
  const TODAY = formatDate(new Date());
  const [currentDate, setCurrentDate] = useState(TODAY);
  const [activeTab, setActiveTab] = useState('timeline');
  const [plans, setPlans] = useState(() => loadData(STORAGE_KEY_PLANS, getInitialPlans()));
  const [actuals, setActuals] = useState(() => loadData(STORAGE_KEY_ACTUALS, getInitialActuals()));

  useEffect(() => { saveData(STORAGE_KEY_PLANS, plans); }, [plans]);
  useEffect(() => { saveData(STORAGE_KEY_ACTUALS, actuals); }, [actuals]);

  const currentPlans = useMemo(() => plans.filter(p => p.date === currentDate), [plans, currentDate]);
  const currentActuals = useMemo(() => actuals.filter(a => a.date === currentDate), [actuals, currentDate]);

  const [activeTimer, setActiveTimer] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isActualModalOpen, setIsActualModalOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingActual, setEditingActual] = useState(null);

  useEffect(() => {
    let interval;
    if (activeTimer) interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // --- 🧠 时间轴布局引擎 ---
  const pointTimes = useMemo(() => {
    const pts = currentPlans.filter(p => p.timeType === 'point').map(p => timeToMins(p.startTime));
    return [...new Set(pts)].sort((a, b) => a - b);
  }, [currentPlans]);

  const { getOffsetY, totalHeight } = useMemo(() => {
    const PX_PER_MIN = 80 / 60;
    const GAP_HEIGHT = 48;
    const events = [];
    currentPlans.filter(p => p.timeType !== 'none').forEach(p => {
      const start = timeToMins(p.startTime);
      const end = p.timeType === 'range' ? timeToMins(p.endTime) : start;
      events.push({ start, end });
    });
    currentActuals.forEach(a => {
      events.push({ start: timeToMins(a.actualStart), end: timeToMins(a.actualEnd) });
    });
    events.sort((a, b) => a.start - b.start);

    const activeIntervals = [];
    events.forEach(ev => {
      if (activeIntervals.length === 0) activeIntervals.push([ev.start, ev.end]);
      else {
        const last = activeIntervals[activeIntervals.length - 1];
        if (ev.start <= last[1] + 10) last[1] = Math.max(last[1], ev.end);
        else activeIntervals.push([ev.start, ev.end]);
      }
    });

    const getOffsetY = (mins, role = 'exact') => {
      let y = 0;
      let lastEnd = null;
      for (const [start, end] of activeIntervals) {
        if (lastEnd !== null) {
          y += GAP_HEIGHT;
          if (mins > lastEnd && mins < start) return y - GAP_HEIGHT / 2;
        }
        if (mins < start) return y;

        let currMin = start;
        for (const pt of pointTimes) {
          if (pt >= start && pt <= end) {
            if (pt < mins) {
              y += (pt - currMin) * PX_PER_MIN + 46;
              currMin = pt;
            } else if (pt === mins) {
              y += (pt - currMin) * PX_PER_MIN;
              if (role === 'arrive') return y;
              y += 8;
              if (role === 'point') return y;
              y += 30;
              y += 8;
              if (role === 'leave') return y;
              return y - 23;
            }
          }
        }
        if (mins <= end) {
          y += (mins - currMin) * PX_PER_MIN;
          return y;
        }
        y += (end - currMin) * PX_PER_MIN;
        lastEnd = end;
      }
      if (lastEnd !== null && mins > lastEnd) {
        y += GAP_HEIGHT + (mins - lastEnd) * PX_PER_MIN;
      }
      return y;
    };
    
    const maxTime = activeIntervals.length > 0 ? activeIntervals[activeIntervals.length - 1][1] : 0;
    return { getOffsetY, totalHeight: activeIntervals.length > 0 ? getOffsetY(maxTime, 'leave') : 0 };
  }, [currentPlans, currentActuals, pointTimes]);

  // --- 操作回调 ---
  const handleToggleComplete = (id) => setPlans(plans.map(p => p.id === id ? { ...p, completed: !p.completed } : p));
  const deletePlan = (id) => { if (window.confirm('确定删除此计划吗？')) { setPlans(plans.filter(p => p.id !== id)); setIsPlanModalOpen(false); } };
  const deleteActual = (id) => { if (window.confirm('确定删除此执行记录吗？')) { setActuals(actuals.filter(a => a.id !== id)); setIsActualModalOpen(false); } };

  const startTimerFromPlan = (plan) => {
    if (activeTimer) return alert('请先停止当前任务');
    setActiveTimer({ planId: plan.id, name: plan.name, emoji: plan.emoji, color: plan.color, startTimestamp: Date.now() });
    setCurrentTime(Date.now());
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    const endDate = new Date();
    const startDate = new Date(activeTimer.startTimestamp);
    const newActual = {
      id: `a_${Date.now()}`, date: formatDate(endDate), name: activeTimer.name, emoji: activeTimer.emoji,
      actualStart: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
      actualEnd: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
      fromPlanId: activeTimer.planId, color: activeTimer.color, source: 'timer'
    };
    setActuals([...actuals, newActual]);
    setActiveTimer(null);
  };

  const usedColors = useMemo(() => new Set([...currentPlans.map(p => p.color), ...currentActuals.map(a => a.color)]), [currentPlans, currentActuals]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1F2937] font-sans pb-28 selection:bg-gray-200 flex justify-center">
      <div className="w-full max-w-md bg-[#FAFAFA] min-h-screen relative shadow-sm overflow-hidden flex flex-col">
        <header className="px-5 pt-10 pb-3 sticky top-0 bg-[#FAFAFA]/95 backdrop-blur z-50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-1.5 bg-white shadow-sm px-3 py-1.5 rounded-full border border-gray-100">
              <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft size={18} /></button>
              <button onClick={() => setIsCalendarOpen(true)} className="text-sm font-bold w-24 text-center hover:text-indigo-600 transition-colors">{getDisplayDate(currentDate)}</button>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><ChevronRight size={18} /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingPlan(null); setIsPlanModalOpen(true); }} className="p-2 rounded-full bg-white shadow-sm text-[#1F2937] active:scale-95 transition-transform"><Plus size={18} /></button>
              <button onClick={() => setIsTimerModalOpen(true)} disabled={!!activeTimer} className={`p-2 rounded-full bg-indigo-50 shadow-sm text-indigo-600 active:scale-95 transition-transform ${activeTimer ? 'opacity-50' : ''}`}><Play size={18} className="fill-current ml-0.5" /></button>
              <button onClick={() => { setEditingActual(null); setIsActualModalOpen(true); }} className="p-2 rounded-full bg-white shadow-sm text-[#1F2937] active:scale-95 transition-transform"><Clock size={18} /></button>
            </div>
          </div>
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button onClick={() => setActiveTab('timeline')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><List size={16} /> 时间轴</button>
            <button onClick={() => setActiveTab('stats')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><BarChart2 size={16} /> 统计</button>
          </div>
        </header>

        <main className="flex-1 px-4 mt-2 relative overflow-x-hidden">
          {activeTab === 'timeline' ? (
            <TimelineView plans={currentPlans} actuals={currentActuals} totalHeight={totalHeight} getOffsetY={getOffsetY} activeTimer={activeTimer}
              onEditPlan={(p) => { setEditingPlan(p); setIsPlanModalOpen(true); }}
              onEditActual={(a) => { setEditingActual(a); setIsActualModalOpen(true); }}
              onToggleComplete={handleToggleComplete} onStartTimer={startTimerFromPlan} />
          ) : (
            <StatsView actuals={actuals} currentDate={currentDate} />
          )}
        </main>
      </div>

      {/* 计时器浮动条 */}
      {activeTimer && (
        <div className="fixed bottom-6 w-[90%] max-w-sm bg-[#1F2937] text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl z-50">
          <div className="flex items-center gap-4">
            <div className="text-3xl bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center">{activeTimer.emoji}</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold opacity-90 mb-0.5">正在执行</span>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-lg">{activeTimer.name}</span>
                <span className="text-sm text-indigo-300 font-mono tracking-wide">{formatMins(Math.floor((currentTime - activeTimer.startTimestamp) / 60000))}</span>
              </div>
            </div>
          </div>
          <button onClick={stopTimer} className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-red-500/30">
            <StopCircle size={24} className="fill-current" />
          </button>
        </div>
      )}

      {/* 弹窗 */}
      {isPlanModalOpen && (
        <PlanModal isOpen onClose={() => setIsPlanModalOpen(false)} initialData={editingPlan} usedColors={usedColors}
          plans={plans} currentDate={currentDate}
          onSave={(data) => {
            if (editingPlan) setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...data } : p));
            else setPlans([...plans, { ...data, id: `p_${Date.now()}`, date: currentDate, completed: false }]);
            setIsPlanModalOpen(false);
          }} onDelete={() => deletePlan(editingPlan?.id)} />
      )}
      {isActualModalOpen && (
        <ActualModal isOpen onClose={() => setIsActualModalOpen(false)} initialData={editingActual} plans={currentPlans} usedColors={usedColors}
          actuals={actuals} currentDate={currentDate}
          onSave={(data) => {
            if (editingActual) setActuals(actuals.map(a => a.id === editingActual.id ? { ...a, ...data } : a));
            else setActuals([...actuals, { ...data, id: `a_${Date.now()}`, date: currentDate, source: 'manual' }]);
            setIsActualModalOpen(false);
          }} onDelete={() => deleteActual(editingActual?.id)} />
      )}
      {isTimerModalOpen && (
        <TimerStartModal isOpen onClose={() => setIsTimerModalOpen(false)} usedColors={usedColors}
          onStart={(data) => { setActiveTimer({ ...data, planId: null, startTimestamp: Date.now() }); setCurrentTime(Date.now()); setIsTimerModalOpen(false); }} />
      )}
      {isCalendarOpen && (
        <CalendarModal currentDate={currentDate} onClose={() => setIsCalendarOpen(false)} onSelect={(d) => { setCurrentDate(d); setIsCalendarOpen(false); }} />
      )}
    </div>
  );
}