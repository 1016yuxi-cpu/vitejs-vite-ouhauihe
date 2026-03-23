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
  const { getOffsetY, totalHeight } = useMemo(() => {
    const PX_PER_MIN = 80 / 60;
    const GAP_HEIGHT = 48;

    // 1. 收集所有事件，赋予点任务虚拟的 1 分钟结束时间以计算布局
    const events = [];
    currentPlans.filter(p => p.timeType !== 'none').forEach(p => {
      const start = timeToMins(p.startTime);
      const isPoint = p.timeType === 'point';
      const end = isPoint ? start + 1 : timeToMins(p.endTime);
      events.push({ id: p.id, start, end, type: p.timeType, isPlan: true });
    });
    currentActuals.forEach(a => {
      const start = timeToMins(a.actualStart);
      const endRaw = timeToMins(a.actualEnd);
      const linkedPlan = a.fromPlanId ? currentPlans.find(p => p.id === a.fromPlanId) : null;
      const isPoint = (linkedPlan?.timeType === 'point' && start === endRaw) || (start === endRaw);
      const end = isPoint ? start + 1 : endRaw;
      events.push({ id: a.id, start, end, type: isPoint ? 'point' : 'range', isPlan: false });
    });

    events.sort((a, b) => a.start - b.start);

    // 2. 合并 10 分钟内相邻的事件形成活跃区间
    const activeIntervals = [];
    events.forEach(ev => {
      if (activeIntervals.length === 0) activeIntervals.push({ start: ev.start, end: ev.end, events: [ev] });
      else {
        const last = activeIntervals[activeIntervals.length - 1];
        if (ev.start <= last.end + 10) {
          last.end = Math.max(last.end, ev.end);
          last.events.push(ev);
        } else {
          activeIntervals.push({ start: ev.start, end: ev.end, events: [ev] });
        }
      }
    });

    // 3. 基于有向无环图 (DAG) 计算每个关键时间点的精确 Y 坐标
    const timeToY = new Map();
    let currentBaseY = 0;

    activeIntervals.forEach((interval, idx) => {
      if (idx > 0) currentBaseY += GAP_HEIGHT;

      const timesSet = new Set();
      interval.events.forEach(ev => { timesSet.add(ev.start); timesSet.add(ev.end); });
      const times = Array.from(timesSet).sort((a, b) => a - b);
      interval.times = times; // 缓存供后续插值使用

      const yMap = new Map();
      yMap.set(times[0], currentBaseY);

      // 逐步推演 Y 坐标，强制应用最小高度约束
      for (let i = 1; i < times.length; i++) {
        const t = times[i];
        const tPrev = times[i - 1];
        let y = yMap.get(tPrev) + (t - tPrev) * PX_PER_MIN;

        interval.events.forEach(ev => {
          if (ev.end === t) {
            const minHeight = ev.type === 'point' ? 48 : 64;
            const evStartY = yMap.get(ev.start);
            if (evStartY !== undefined) {
              y = Math.max(y, evStartY + minHeight); // 如果高度不够，强行推移 Y 坐标
            }
          }
        });
        yMap.set(t, y);
      }

      times.forEach(t => timeToY.set(t, yMap.get(t)));
      currentBaseY = yMap.get(times[times.length - 1]);
    });

    // 4. 返回查表与插值函数
    const getOffsetY = (mins, role = 'exact') => {
      let y = 0;
      let lastEnd = null;
      let lastEndY = 0;

      for (let i = 0; i < activeIntervals.length; i++) {
        const interval = activeIntervals[i];
        
        if (lastEnd !== null && mins > lastEnd && mins < interval.start) {
          return lastEndY + GAP_HEIGHT / 2;
        }
        if (mins < interval.start) return i === 0 ? 0 : y;

        if (mins >= interval.start && mins <= interval.end) {
          if (timeToY.has(mins)) {
            return timeToY.get(mins);
          } else {
            // 区间内插值计算
            const times = interval.times;
            let t0 = times[0], t1 = times[times.length - 1];
            for (let j = 0; j < times.length - 1; j++) {
              if (mins >= times[j] && mins <= times[j + 1]) {
                t0 = times[j]; t1 = times[j + 1]; break;
              }
            }
            const y0 = timeToY.get(t0);
            const y1 = timeToY.get(t1);
            return t1 === t0 ? y0 : y0 + (y1 - y0) * ((mins - t0) / (t1 - t0));
          }
        }
        lastEnd = interval.end;
        lastEndY = timeToY.get(interval.end);
      }
      
      if (lastEnd !== null && mins > lastEnd) {
        return lastEndY + GAP_HEIGHT + (mins - lastEnd) * PX_PER_MIN;
      }
      return y;
    };

    const maxTime = activeIntervals.length > 0 ? activeIntervals[activeIntervals.length - 1].end : 0;
    return { getOffsetY, totalHeight: activeIntervals.length > 0 ? getOffsetY(maxTime) + 40 : 0 };
  }, [currentPlans, currentActuals]);

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
    
    // 计算已计时的分钟数
    const elapsedMins = (endDate.getTime() - startDate.getTime()) / 60000;

    // 5分钟保护逻辑
    if (elapsedMins < 5) {
      const confirmStop = window.confirm('本次计时不足 5 分钟，如果现在停止记录将不会保留，确定要停止吗？');
      if (confirmStop) {
        // 用户确认停止：清空定时器，但不保存记录
        setActiveTimer(null);
      }
      // 如果用户取消，直接 return，计时器继续运行
      return; 
    }

    // 超过 5 分钟，正常保存记录
    const newActual = {
      id: `a_${Date.now()}`, date: formatDate(endDate), name: activeTimer.name, emoji: activeTimer.emoji,
      actualStart: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
      actualEnd: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
      fromPlanId: activeTimer.planId, color: activeTimer.color, source: 'timer'
    };
    setActuals([...actuals, newActual]);
    setActiveTimer(null);
  };

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
        <PlanModal isOpen onClose={() => setIsPlanModalOpen(false)} initialData={editingPlan}
          plans={plans} currentDate={currentDate}
          onSave={(data) => {
            if (editingPlan) setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...data } : p));
            else setPlans([...plans, { ...data, id: `p_${Date.now()}`, date: currentDate, completed: false }]);
            setIsPlanModalOpen(false);
          }} onDelete={() => deletePlan(editingPlan?.id)} />
      )}
      {isActualModalOpen && (
        <ActualModal isOpen onClose={() => setIsActualModalOpen(false)} initialData={editingActual} plans={currentPlans}
          actuals={actuals} currentDate={currentDate}
          onSave={(data) => {
            if (editingActual) setActuals(actuals.map(a => a.id === editingActual.id ? { ...a, ...data } : a));
            else setActuals([...actuals, { ...data, id: `a_${Date.now()}`, date: currentDate, source: 'manual' }]);
            setIsActualModalOpen(false);
          }} onDelete={() => deleteActual(editingActual?.id)} />
      )}
      {isTimerModalOpen && (
        <TimerStartModal isOpen onClose={() => setIsTimerModalOpen(false)}
          onStart={(data) => { setActiveTimer({ ...data, planId: null, startTimestamp: Date.now() }); setCurrentTime(Date.now()); setIsTimerModalOpen(false); }} />
      )}
      {isCalendarOpen && (
        <CalendarModal currentDate={currentDate} onClose={() => setIsCalendarOpen(false)} onSelect={(d) => { setCurrentDate(d); setIsCalendarOpen(false); }} />
      )}
    </div>
  );
}