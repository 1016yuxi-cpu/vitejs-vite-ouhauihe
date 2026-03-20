import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Clock, Edit2, Trash2, CheckCircle, Circle, Play, StopCircle, X, Check, ArrowRight, Timer, ChevronLeft, ChevronRight, Calendar as CalendarIcon, BarChart2, List, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- 🎨 配色系统 ---
const TASK_COLORS = [
  { hex: "#f57c6e", light: "rgba(245,124,110,0.5)", name: "珊瑚红" },
  { hex: "#f2b56f", light: "rgba(242,181,111,0.5)", name: "杏橙" },
  { hex: "#fae69e", light: "rgba(250,230,158,0.5)", name: "暖黄" },
  { hex: "#84c3b7", light: "rgba(132,195,183,0.5)", name: "薄荷绿" },
  { hex: "#88d8db", light: "rgba(136,216,219,0.5)", name: "天蓝" },
  { hex: "#71b7ed", light: "rgba(113,183,237,0.5)", name: "湖蓝" },
  { hex: "#b8aeeb", light: "rgba(184,174,235,0.5)", name: "薰衣草紫" },
  { hex: "#f2a7da", light: "rgba(242,167,218,0.5)", name: "樱粉" }
];

// --- 🛠 工具函数 ---
const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatMins = (diff) => {
  if (diff <= 0) return '0m';
  const h = Math.floor(diff / 60);
  const m = Math.floor(diff % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h 0m`;
  return `${m}m`;
};

const formatDuration = (startMins, endMins) => formatMins(endMins - startMins);

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`;
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// 重叠检测（交集即重叠，边界相接不算）
const isOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

// --- 💾 数据持久化 ---
const STORAGE_KEY_PLANS = 'pvr_plans';
const STORAGE_KEY_ACTUALS = 'pvr_actuals';

const loadData = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('读取本地数据失败:', e); }
  return fallback;
};

const saveData = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.warn('保存本地数据失败:', e); }
};

const getInitialPlans = () => {
  const TODAY = formatDate(new Date());
  return [
    { id: 'p1', date: TODAY, name: '方案策划', emoji: '📝', timeType: 'range', startTime: '09:00', endTime: '10:30', color: '#f57c6e', completed: true },
    { id: 'p2', date: TODAY, name: '团队周会', emoji: '📞', timeType: 'range', startTime: '10:30', endTime: '11:30', color: '#f2b56f', completed: false },
    { id: 'p3', date: TODAY, name: '回复邮件', emoji: '📧', timeType: 'point', startTime: '13:00', endTime: '13:00', color: '#fae69e', completed: false },
    { id: 'p4', date: TODAY, name: '阅读行业报告', emoji: '📖', timeType: 'none', startTime: null, endTime: null, color: '#84c3b7', completed: false },
  ];
};

const getInitialActuals = () => {
  const TODAY = formatDate(new Date());
  return [
    { id: 'a1', date: TODAY, name: '方案策划', emoji: '📝', actualStart: '09:10', actualEnd: '10:45', fromPlanId: 'p1', color: '#f57c6e', source: 'manual' },
    { id: 'a2', date: TODAY, name: '午后散步', emoji: '🏃‍♂️', actualStart: '14:00', actualEnd: '14:30', fromPlanId: null, color: '#88d8db', source: 'manual' },
  ];
};

// --- 🚀 主应用组件 ---
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
              y += (pt - currMin) * PX_PER_MIN + 46; // 8 (gap) + 30 (point task) + 8 (gap)
              currMin = pt;
            } else if (pt === mins) {
              y += (pt - currMin) * PX_PER_MIN;
              if (role === 'arrive') return y;
              y += 8;
              if (role === 'point') return y;
              y += 30;
              y += 8;
              if (role === 'leave') return y;
              return y - 23; // fallback exact middle
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

// ==========================================
// ⏱ 时间轴视图 (升级版：重叠检测 + 加宽 + 时间点间隙)
// ==========================================
function TimelineView({ plans, actuals, totalHeight, getOffsetY, activeTimer, onEditPlan, onEditActual, onToggleComplete, onStartTimer }) {
  const [tooltipData, setTooltipData] = useState(null);

  const timedPlans = plans.filter(p => p.timeType !== 'none');
  const untimedPlans = plans.filter(p => p.timeType === 'none');

  if (plans.length === 0 && actuals.length === 0) {
    return <div className="mt-20 text-center text-gray-400">这一天还没有任何安排哦～</div>;
  }

  // 辅助函数：根据任务类型获取其视觉排布角色
  const getStartRole = (planOrAct) => {
    if (planOrAct.timeType === 'point') return 'point';
    if (planOrAct.actualStart) {
      const linkedPlan = plans.find(p => p.id === planOrAct.fromPlanId);
      if (linkedPlan && linkedPlan.timeType === 'point' && planOrAct.actualStart === linkedPlan.startTime) return 'point';
    }
    return 'leave';
  };
  const getEndRole = (planOrAct) => {
    if (planOrAct.timeType === 'point') return 'point';
    return 'arrive';
  };

  // 重叠检测计算逻辑
  const calculateOverlaps = (items, isPlan) => {
    const result = {};
    const validItems = items.slice().sort((a,b) => {
      const startA = timeToMins(isPlan ? a.startTime : a.actualStart);
      const startB = timeToMins(isPlan ? b.startTime : b.actualStart);
      return startA - startB;
    });

    validItems.forEach((item, i) => {
      const start = timeToMins(isPlan ? item.startTime : item.actualStart);
      const end = isPlan ? (item.timeType === 'range' ? timeToMins(item.endTime) : start) : timeToMins(item.actualEnd);
      let col = 0;
      let hasOverlap = false;

      for (let j = 0; j < i; j++) {
        const prev = validItems[j];
        const prevStart = timeToMins(isPlan ? prev.startTime : prev.actualStart);
        const prevEnd = isPlan ? (prev.timeType === 'range' ? timeToMins(prev.endTime) : prevStart) : timeToMins(prev.actualEnd);
        if (isOverlap(start, end, prevStart, prevEnd)) {
          hasOverlap = true;
          result[prev.id].isOverlapping = true;
          if (result[prev.id].columnIndex === 0) col = 1;
        }
      }
      result[item.id] = { isOverlapping: hasOverlap, columnIndex: col };
    });
    return result;
  };

  const planOverlaps = calculateOverlaps(timedPlans, true);
  const actualOverlaps = calculateOverlaps(actuals, false);

  const actualsByPlanId = {};
  actuals.forEach(a => {
    if (a.fromPlanId) {
      if (!actualsByPlanId[a.fromPlanId]) actualsByPlanId[a.fromPlanId] = [];
      actualsByPlanId[a.fromPlanId].push(a);
    }
  });

  return (
    <div>
      {/* 气泡组件和全屏背景遮罩 */}
      {tooltipData && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setTooltipData(null)} />
          <div className="absolute z-[110] bg-[#1F2937] text-white p-3 rounded-xl shadow-xl border border-gray-700 pointer-events-none transition-opacity"
            style={{
              top: tooltipData.top,
              left: tooltipData.isLeft ? 'calc(50% - 40px)' : 'calc(50% + 40px)',
              transform: tooltipData.isLeft ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
              width: '180px'
            }}>
            <div className="font-bold text-sm mb-1">{tooltipData.name} {tooltipData.emoji}</div>
            <div className="text-xs text-gray-300">{tooltipData.timeRange}</div>
            <div className="text-xs text-indigo-300 font-mono mt-1">{tooltipData.duration}</div>
          </div>
        </>
      )}

      {/* ====== 未安排时间的任务 ====== */}
      {untimedPlans.length > 0 && (
        <div className="mb-6 pt-2">
          <div className="text-xs text-gray-400 mb-3 text-center">—— 未安排时间 ——</div>
          <div className="space-y-2.5">
            {untimedPlans.map(plan => (
              <div key={plan.id} className={`flex items-center justify-between p-3 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${plan.completed ? 'opacity-50' : ''}`} onClick={() => onEditPlan(plan)}>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onToggleComplete(plan.id); }} className={`p-1 ${plan.completed ? "text-green-500" : "text-gray-300"}`}>
                    {plan.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-1 mx-2">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: plan.color }}></div>
                  <span className="font-bold text-sm text-[#1F2937] truncate">{plan.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onStartTimer(plan); }} disabled={!!activeTimer} className={`p-1.5 rounded-lg ${activeTimer ? 'text-gray-200' : 'text-indigo-400 active:bg-indigo-50'}`}>
                  <Play size={16} className="fill-current" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== 时间轴主体 ====== */}
      {totalHeight > 0 && (
        <div className="relative w-full" style={{ height: totalHeight + 40 }}>

          {/* ---- 连接线 ---- */}
          {timedPlans.map(plan => {
            const relatedActuals = actuals.filter(a => a.fromPlanId === plan.id);
            return relatedActuals.map(act => {
              const pStart = timeToMins(plan.startTime);
              const pEnd = plan.timeType === 'range' ? timeToMins(plan.endTime) : pStart;
              const aStart = timeToMins(act.actualStart);
              const aEnd = timeToMins(act.actualEnd);
              if (aStart >= pEnd || aEnd <= pStart) {
                const y1 = aStart >= pEnd ? getOffsetY(pEnd, getEndRole(plan)) : getOffsetY(aEnd, getEndRole(act));
                const y2 = aStart >= pEnd ? getOffsetY(aStart, getStartRole(act)) : getOffsetY(pStart, getStartRole(plan));
                const topY = Math.min(y1, y2);
                const h = Math.abs(y2 - y1);
                if (h < 2) return null;
                return (
                  <div key={`conn-${plan.id}-${act.id}`} className="absolute opacity-40"
                    style={{
                      left: 'calc(50% - 1px)', width: '2px', top: topY, height: h,
                      borderLeft: `2px dashed ${plan.color}`
                    }} />
                );
              }
              return null;
            });
          })}

          {/* ---- 计划色块（浅色，左列） ---- */}
          {timedPlans.map(plan => {
            const startMins = timeToMins(plan.startTime);
            const endMins = plan.timeType === 'range' ? timeToMins(plan.endTime) : startMins;
            const top = getOffsetY(startMins, getStartRole(plan));
            const height = plan.timeType === 'point' ? 30 : Math.max(getOffsetY(endMins, getEndRole(plan)) - top, 40);
            const colorObj = TASK_COLORS.find(c => c.hex === plan.color);
            const overlaps = planOverlaps[plan.id];

            return (
              <div key={`plan-${plan.id}`} className={`absolute transition-opacity duration-300 ${plan.completed ? 'opacity-40' : 'opacity-100'}`}
                style={{ top, height, left: 0, right: 0 }}>

                {/* 浅色块 */}
                <div className="absolute rounded-xl border-2 border-white cursor-pointer shadow-sm hover:brightness-95 transition-all"
                  style={{
                    left: overlaps.isOverlapping ? (overlaps.columnIndex === 0 ? 'calc(50% - 36px)' : 'calc(50% - 20px)') : 'calc(50% - 36px)',
                    width: overlaps.isOverlapping ? '16px' : '32px',
                    top: 0, height: '100%', backgroundColor: colorObj?.light
                  }}
                  onClick={(e) => {
                    if (overlaps.isOverlapping) {
                      e.stopPropagation();
                      setTooltipData({ top: top + height / 2, isLeft: true, name: plan.name, emoji: plan.emoji, timeRange: plan.timeType === 'range' ? `${plan.startTime} - ${plan.endTime}` : plan.startTime, duration: plan.timeType === 'range' ? formatDuration(startMins, endMins) : '时间点' });
                    } else onEditPlan(plan);
                  }}
                />

                {/* 文字区和按钮（非重叠时显示） */}
                {!overlaps.isOverlapping && (
                  <div className="absolute h-full flex flex-col justify-center items-end pr-2.5 min-w-0 cursor-pointer group hover:bg-black/[0.03] rounded-l-xl transition-colors"
                    style={{ left: 0, width: 'calc(50% - 40px)' }}
                    onClick={() => onEditPlan(plan)}>
                    <div className="flex items-center gap-1.5 justify-end w-full">
                      <span className="text-[11px] font-medium text-[#9CA3AF] leading-none">{plan.startTime}</span>
                      {plan.timeType === 'range' && <span className="text-[11px] font-medium text-[#9CA3AF] leading-none">- {plan.endTime}</span>}
                    </div>
                    <div className="font-bold text-[#1F2937] text-sm truncate w-full text-right mt-0.5 group-hover:text-indigo-600 transition-colors">{plan.name}</div>
                    <div className="flex justify-end gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onStartTimer(plan)} disabled={!!activeTimer} className={`p-1 rounded-md transition-colors ${activeTimer ? 'bg-gray-100 text-gray-300' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`}>
                        <Play size={13} className="fill-current" />
                      </button>
                      <button onClick={() => onToggleComplete(plan.id)} className={`p-1 rounded-md transition-colors ${plan.completed ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {plan.completed ? <CheckCircle size={13} /> : <Check size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ---- 实际色块（深色，右列） ---- */}
          {actuals.map(act => {
            const startMins = timeToMins(act.actualStart);
            const endMins = timeToMins(act.actualEnd);
            const top = getOffsetY(startMins, getStartRole(act));
            const height = Math.max(getOffsetY(endMins, getEndRole(act)) - top, 40);
            const overlaps = actualOverlaps[act.id];

            const connectedPlan = act.fromPlanId ? plans.find(p => p.id === act.fromPlanId) : null;
            const hideStart = connectedPlan && connectedPlan.startTime === act.actualStart;
            const hideEnd = connectedPlan && connectedPlan.timeType === 'range' && connectedPlan.endTime === act.actualEnd;

            let diffText = "";
            if (connectedPlan && connectedPlan.timeType === 'range') {
              const plannedDur = timeToMins(connectedPlan.endTime) - timeToMins(connectedPlan.startTime);
              const actualDur = endMins - startMins;
              const diffMins = actualDur - plannedDur;
              if (diffMins !== 0) diffText = ` · ${diffMins > 0 ? '+' : ''}${diffMins}m`;
            }

            return (
              <div key={`act-${act.id}`} className="absolute" style={{ top, height, left: 0, right: 0 }}>

                {/* 深色块 */}
                <div className="absolute rounded-xl border-[1.5px] border-white shadow-sm cursor-pointer hover:brightness-105 transition-all z-10"
                  style={{
                    left: overlaps.isOverlapping ? (overlaps.columnIndex === 0 ? 'calc(50% + 4px)' : 'calc(50% + 20px)') : 'calc(50% + 4px)',
                    width: overlaps.isOverlapping ? '16px' : '32px',
                    top: 0, height: '100%', backgroundColor: act.color
                  }}
                  onClick={(e) => {
                    if (overlaps.isOverlapping) {
                      e.stopPropagation();
                      setTooltipData({ top: top + height / 2, isLeft: false, name: act.name, emoji: act.emoji, timeRange: `${act.actualStart} - ${act.actualEnd}`, duration: formatDuration(startMins, endMins) });
                    } else onEditActual(act);
                  }}
                />

                {/* 实际文字区（非重叠时显示） */}
                {!overlaps.isOverlapping && (
                  <div className="absolute h-full flex flex-col justify-center items-start pl-2.5 min-w-0 cursor-pointer group hover:bg-black/[0.03] rounded-r-xl transition-colors"
                    style={{ left: 'calc(50% + 40px)', width: 'calc(50% - 40px)' }}
                    onClick={() => onEditActual(act)}>
                    <div className="flex items-center gap-1.5 justify-start w-full">
                      <span className="text-[11px] font-medium text-[#9CA3AF] leading-none">{hideStart ? '' : act.actualStart}</span>
                      {!hideEnd && <span className="text-[11px] font-medium text-[#9CA3AF] leading-none">{hideStart ? '' : '-'} {act.actualEnd}</span>}
                    </div>
                    <div className="font-bold text-[#1F2937] text-sm truncate w-full text-left mt-0.5 group-hover:text-indigo-600 transition-colors">{act.name} {act.emoji}</div>
                    <div className="text-xs font-medium mt-1 text-gray-500">
                      {formatDuration(startMins, endMins)}
                      <span className={diffText.includes('+') ? 'text-red-400 ml-1' : 'text-green-500 ml-1'}>{diffText}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 无时间任务的空状态 */}
      {totalHeight === 0 && untimedPlans.length > 0 && actuals.length === 0 && (
        <div className="mt-8 text-center text-gray-400 text-sm">还没有带时间的任务哦</div>
      )}
    </div>
  );
}

// ==========================================
// 📊 统计视图
// ==========================================
function StatsView({ actuals, currentDate }) {
  const currentActuals = actuals.filter(a => a.date === currentDate);

  const pieData = useMemo(() => {
    const acc = {};
    let total = 0;
    currentActuals.forEach(a => {
      const dur = timeToMins(a.actualEnd) - timeToMins(a.actualStart);
      if (dur > 0) {
        if (!acc[a.color]) acc[a.color] = { name: a.name, value: 0, color: a.color };
        acc[a.color].value += dur;
        total += dur;
      }
    });
    return { data: Object.values(acc).sort((a, b) => b.value - a.value), total };
  }, [currentActuals]);

  const barData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(currentDate, -i);
      const dayActuals = actuals.filter(a => a.date === d);
      const dayObj = { date: getDisplayDate(d).split(' ')[0], fullDate: d };
      dayActuals.forEach(a => {
        const dur = timeToMins(a.actualEnd) - timeToMins(a.actualStart);
        if (dur > 0) {
          dayObj[a.color] = (dayObj[a.color] || 0) + dur;
          if (!dayObj[a.color + '_name']) dayObj[a.color + '_name'] = a.name;
        }
      });
      days.push(dayObj);
    }
    return days;
  }, [actuals, currentDate]);

  const yAxisFormatter = (val) => val === 0 ? '0' : `${Math.floor(val / 60)}h`;

  return (
    <div className="pb-10">
      <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 mt-4 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-500 mb-4">今日执行分布</h3>
        {pieData.total === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">今日暂无执行记录</div>
        ) : (
          <>
            <div className="relative h-56 w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData.data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMins(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400 font-medium">总计</span>
                <span className="text-2xl font-bold text-gray-900 mt-1">{formatMins(pieData.total)}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {pieData.data.map(d => (
                <div key={d.color} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  {d.name} <span className="text-gray-400 ml-1">{formatMins(d.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-500 mb-6">近 7 天趋势</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={yAxisFormatter} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '12px' }}
                formatter={(value, name, props) => {
                  const colorName = TASK_COLORS.find(c => c.hex === name)?.name || '记录';
                  const taskName = props.payload[name + '_name'] || colorName;
                  return [formatMins(value), taskName];
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }} />
              {TASK_COLORS.map(color => (
                <Bar key={color.hex} dataKey={color.hex} stackId="a" fill={color.hex} radius={[2, 2, 2, 2]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🎡 滚轮时间选择器
// ==========================================
function WheelTimePicker({ isOpen, onClose, initialValue, onConfirm }) {
  const [hours, setHours] = useState(initialValue?.split(':')[0] || '09');
  const [mins, setMins] = useState(initialValue?.split(':')[1] || '00');
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex justify-center items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <button onClick={onClose} className="text-gray-400 px-2 py-1">取消</button>
          <h3 className="font-bold text-lg">选择时间</h3>
          <button onClick={() => { onConfirm(`${hours}:${mins}`); onClose(); }} className="text-indigo-600 font-bold px-2 py-1">确认</button>
        </div>
        <div className="flex justify-center h-48 relative overflow-hidden bg-gray-50 rounded-2xl">
          <div className="absolute top-1/2 left-4 right-4 h-12 -translate-y-1/2 bg-white rounded-xl shadow-sm border border-gray-100 pointer-events-none z-0"></div>
          <ScrollColumn options={hourOptions} value={hours} onChange={setHours} suffix="时" />
          <ScrollColumn options={minOptions} value={mins} onChange={setMins} suffix="分" />
        </div>
      </div>
    </div>
  );
}

function ScrollColumn({ options, value, onChange, suffix }) {
  const scrollRef = useRef(null);
  const ITEM_HEIGHT = 48;
  useEffect(() => {
    if (scrollRef.current) {
      const index = options.indexOf(value);
      scrollRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, []);
  const handleScroll = (e) => {
    const index = Math.round(e.target.scrollTop / ITEM_HEIGHT);
    if (options[index] && options[index] !== value) onChange(options[index]);
  };
  return (
    <div ref={scrollRef} onScroll={handleScroll} className="w-1/3 h-full overflow-y-scroll snap-y snap-mandatory z-10 relative" style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
      <div style={{ height: `calc(50% - ${ITEM_HEIGHT / 2}px)` }}></div>
      {options.map((opt) => (
        <div key={opt} className={`h-12 flex items-center justify-center snap-center text-xl font-mono transition-all duration-200 ${value === opt ? 'text-indigo-600 font-bold scale-110' : 'text-gray-400'}`}>
          {opt} <span className="text-xs ml-1 font-sans font-normal opacity-50">{suffix}</span>
        </div>
      ))}
      <div style={{ height: `calc(50% - ${ITEM_HEIGHT / 2}px)` }}></div>
    </div>
  );
}

function TimeTrigger({ label, value, onClick }) {
  return (
    <div className="flex-1 cursor-pointer group" onClick={onClick}>
      <label className="block text-xs text-gray-400 mb-1 ml-1 group-hover:text-indigo-400 transition-colors">{label}</label>
      <div className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 font-medium text-lg flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-colors">{value}</div>
    </div>
  );
}

// ==========================================
// 📅 日历面板
// ==========================================
function CalendarModal({ currentDate, onClose, onSelect }) {
  const dates = [];
  for (let i = -14; i <= 14; i++) dates.push(addDays(currentDate, i));
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><CalendarIcon size={20} /> 快速跳转</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={16} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2" style={{ scrollbarWidth: 'none' }}>
          {dates.map(d => {
            const isSelected = d === currentDate;
            const isToday = d === formatDate(new Date());
            return (
              <button key={d} onClick={() => onSelect(d)} className={`w-full p-4 rounded-2xl flex justify-between items-center transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                <span className="font-bold">{getDisplayDate(d)}</span>
                {isToday && <span className={`text-xs px-2 py-1 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>今天</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🧩 表单弹窗
// ==========================================
function PlanModal({ isOpen, onClose, initialData, onSave, onDelete, usedColors, plans, currentDate }) {
  const [name, setName] = useState(initialData?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '📝');
  const [timeType, setTimeType] = useState(initialData?.timeType || 'range');
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');
  const [color, setColor] = useState(initialData?.color || TASK_COLORS.find(c => !usedColors.has(c.hex))?.hex || TASK_COLORS[0].hex);
  const [pickerTarget, setPickerTarget] = useState(null);
  
  const [conflictInfo, setConflictInfo] = useState(null);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const dataToSave = { name, emoji, timeType, startTime: timeType === 'none' ? null : startTime, endTime: timeType === 'range' ? endTime : null, color };
    
    // 重叠检测
    if (timeType !== 'none') {
      const newStart = timeToMins(startTime);
      const newEnd = timeType === 'range' ? timeToMins(endTime) : newStart;
      const conflicts = plans.filter(p => p.id !== initialData?.id && p.date === currentDate && p.timeType !== 'none').filter(p => {
        const pStart = timeToMins(p.startTime);
        const pEnd = p.timeType === 'range' ? timeToMins(p.endTime) : pStart;
        return isOverlap(newStart, newEnd, pStart, pEnd);
      });

      if (conflicts.length > 0) {
        setConflictInfo({
          taskName: conflicts[0].name,
          timeStr: conflicts[0].timeType === 'range' ? `${conflicts[0].startTime}-${conflicts[0].endTime}` : conflicts[0].startTime,
          pendingData: dataToSave
        });
        return;
      }
    }
    onSave(dataToSave);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4">
        <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl overflow-hidden relative">
          
          {conflictInfo ? (
            <div className="space-y-6 pt-4 text-center h-full flex flex-col justify-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold">时间冲突提示</h3>
              <p className="text-gray-600">与 <span className="font-bold text-gray-800">【{conflictInfo.taskName} {conflictInfo.timeStr}】</span> 时间冲突</p>
              <div className="flex gap-3 pt-6">
                <button onClick={() => setConflictInfo(null)} className="flex-1 bg-red-500 text-white rounded-2xl py-4 font-bold shadow-lg shadow-red-500/20 active:scale-[0.98]">返回修改</button>
                <button onClick={() => onSave(conflictInfo.pendingData)} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-2xl py-4 font-bold active:scale-[0.98]">仍然创建</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{initialData ? '编辑计划' : '新建计划'}</h2>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-3">
                  <div className="w-14 h-14 shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl border border-gray-100">
                    <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full h-full text-center bg-transparent border-none outline-none" maxLength={2} />
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 px-4 flex items-center">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="准备做些什么？" className="w-full bg-transparent border-none outline-none font-bold text-lg text-gray-800" autoFocus />
                  </div>
                </div>
                <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-medium">
                  {['range', 'point', 'none'].map(type => (
                    <button key={type} type="button" onClick={() => setTimeType(type)} className={`flex-1 py-2 rounded-lg transition-all ${timeType === type ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                      {type === 'range' ? '时间段' : type === 'point' ? '时间点' : '不指定时间'}
                    </button>
                  ))}
                </div>
                {timeType !== 'none' && (
                  <div className="flex items-center gap-4">
                    <TimeTrigger label="开始时间" value={startTime} onClick={() => setPickerTarget('start')} />
                    {timeType === 'range' && (
                      <><ArrowRight className="text-gray-300 mt-5 shrink-0" size={16} />
                      <TimeTrigger label="结束时间" value={endTime} onClick={() => setPickerTarget('end')} /></>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 ml-1">专属色</label>
                  <div className="flex flex-wrap gap-3">
                    {TASK_COLORS.map(c => {
                      const isDisabled = usedColors.has(c.hex) && c.hex !== initialData?.color;
                      return <button type="button" key={c.hex} disabled={isDisabled} onClick={() => setColor(c.hex)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${isDisabled ? 'opacity-20' : 'hover:scale-110'}`} style={{ backgroundColor: c.hex }}>{color === c.hex && <Check size={18} color="white" />}</button>;
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  {initialData && <button type="button" onClick={onDelete} className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl font-bold"><Trash2 size={20} /></button>}
                  <button type="button" onClick={handleSubmit} className="flex-1 bg-[#1F2937] text-white rounded-2xl py-4 font-bold text-lg shadow-lg active:scale-[0.98]">{initialData ? '保存修改' : '创建计划'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <WheelTimePicker isOpen={!!pickerTarget} onClose={() => setPickerTarget(null)} initialValue={pickerTarget === 'start' ? startTime : endTime} onConfirm={(val) => { pickerTarget === 'start' ? setStartTime(val) : setEndTime(val); }} />
    </>
  );
}

function ActualModal({ isOpen, onClose, initialData, plans, actuals, currentDate, onSave, onDelete, usedColors }) {
  const defaultPlan = !initialData ? plans.find(p => !p.completed && p.timeType !== 'none') : null;
  const [fromPlanId, setFromPlanId] = useState(initialData?.fromPlanId !== undefined ? initialData.fromPlanId : (defaultPlan?.id || 'none'));
  const [name, setName] = useState(initialData?.name || defaultPlan?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || defaultPlan?.emoji || '🏃‍♂️');
  const [actualStart, setActualStart] = useState(initialData?.actualStart || '09:00');
  const [actualEnd, setActualEnd] = useState(initialData?.actualEnd || '10:00');
  const [color, setColor] = useState(initialData?.color || defaultPlan?.color || TASK_COLORS.find(c => !usedColors.has(c.hex))?.hex || TASK_COLORS[0].hex);
  const [pickerTarget, setPickerTarget] = useState(null);

  const [conflictInfo, setConflictInfo] = useState(null);

  useEffect(() => {
    if (fromPlanId && fromPlanId !== 'none') {
      const p = plans.find(p => p.id === fromPlanId);
      if (p) {
        setName(p.name); setEmoji(p.emoji); setColor(p.color);
        if (!initialData) { setActualStart(p.startTime || '09:00'); setActualEnd(p.endTime || (p.startTime ? minsToTime(timeToMins(p.startTime) + 30) : '10:00')); }
      }
    }
  }, [fromPlanId, plans, initialData]);

  const handleSubmit = () => { 
    if (!name.trim()) return;
    const dataToSave = { name, emoji, actualStart, actualEnd, color, fromPlanId: fromPlanId === 'none' ? null : fromPlanId };
    
    // 重叠检测
    const newStart = timeToMins(actualStart);
    const newEnd = timeToMins(actualEnd);
    const conflicts = actuals.filter(a => a.id !== initialData?.id && a.date === currentDate).filter(a => {
      const aStart = timeToMins(a.actualStart);
      const aEnd = timeToMins(a.actualEnd);
      return isOverlap(newStart, newEnd, aStart, aEnd);
    });

    if (conflicts.length > 0) {
      setConflictInfo({
        taskName: conflicts[0].name,
        timeStr: `${conflicts[0].actualStart}-${conflicts[0].actualEnd}`,
        pendingData: dataToSave
      });
      return;
    }
    onSave(dataToSave); 
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4">
        <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl relative overflow-hidden">
          
          {conflictInfo ? (
            <div className="space-y-6 pt-4 text-center h-full flex flex-col justify-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold">时间冲突提示</h3>
              <p className="text-gray-600">与 <span className="font-bold text-gray-800">【{conflictInfo.taskName} {conflictInfo.timeStr}】</span> 时间冲突</p>
              <div className="flex gap-3 pt-6">
                <button onClick={() => setConflictInfo(null)} className="flex-1 bg-red-500 text-white rounded-2xl py-4 font-bold shadow-lg shadow-red-500/20 active:scale-[0.98]">返回修改</button>
                <button onClick={() => onSave(conflictInfo.pendingData)} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-2xl py-4 font-bold active:scale-[0.98]">仍然创建</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-green-700"><Clock size={22} /> {initialData ? '编辑记录' : '手动补充记录'}</h2>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 ml-1">关联当日计划 (自动继承信息)</label>
                  <select value={fromPlanId} onChange={e => setFromPlanId(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-medium">
                    <option value="none">-- 独立记录 (无计划) --</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="w-14 h-14 shrink-0 bg-green-50 rounded-2xl flex items-center justify-center text-2xl border border-green-100">
                    <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full h-full text-center bg-transparent border-none outline-none" maxLength={2} />
                  </div>
                  <div className="flex-1 bg-green-50 rounded-2xl border border-green-100 px-4 flex items-center">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="实际做了什么？" className="w-full bg-transparent border-none outline-none font-bold text-lg text-green-900" required />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <TimeTrigger label="实际开始" value={actualStart} onClick={() => setPickerTarget('start')} />
                  <ArrowRight className="text-gray-300 mt-5 shrink-0" size={16} />
                  <TimeTrigger label="实际结束" value={actualEnd} onClick={() => setPickerTarget('end')} />
                </div>
                {fromPlanId === 'none' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 ml-1">专属色</label>
                    <div className="flex flex-wrap gap-3">
                      {TASK_COLORS.map(c => {
                        const isDisabled = usedColors.has(c.hex) && c.hex !== initialData?.color;
                        return <button type="button" key={c.hex} disabled={isDisabled} onClick={() => setColor(c.hex)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${isDisabled ? 'opacity-20' : 'hover:scale-110'}`} style={{ backgroundColor: c.hex }}>{color === c.hex && <Check size={18} color="white" />}</button>;
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  {initialData && <button type="button" onClick={onDelete} className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl font-bold"><Trash2 size={20} /></button>}
                  <button type="button" onClick={handleSubmit} className="flex-1 bg-green-600 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-green-600/20 active:scale-[0.98]">{initialData ? '保存修改' : '记录执行'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <WheelTimePicker isOpen={!!pickerTarget} onClose={() => setPickerTarget(null)} initialValue={pickerTarget === 'start' ? actualStart : actualEnd} onConfirm={(val) => { pickerTarget === 'start' ? setActualStart(val) : setActualEnd(val); }} />
    </>
  );
}

function TimerStartModal({ isOpen, onClose, usedColors, onStart }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('⚡️');
  const [color, setColor] = useState(TASK_COLORS.find(c => !usedColors.has(c.hex))?.hex || TASK_COLORS[0].hex);
  const handleSubmit = () => { if (!name.trim()) return; onStart({ name, emoji, color }); };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-600"><Timer size={22} /> 开启临时专注</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
        </div>
        <div className="space-y-6">
          <div className="flex gap-3">
            <div className="w-14 h-14 shrink-0 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl border border-indigo-100">
              <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full h-full text-center bg-transparent border-none outline-none" maxLength={2} />
            </div>
            <div className="flex-1 bg-indigo-50 rounded-2xl border border-indigo-100 px-4 flex items-center">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="接下来要做什么？" className="w-full bg-transparent border-none outline-none font-bold text-lg text-indigo-900" autoFocus required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2 ml-1">选取专属色</label>
            <div className="flex flex-wrap gap-3">
              {TASK_COLORS.map(c => {
                const isDisabled = usedColors.has(c.hex);
                return <button type="button" key={c.hex} disabled={isDisabled} onClick={() => setColor(c.hex)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${isDisabled ? 'opacity-20' : 'hover:scale-110'}`} style={{ backgroundColor: c.hex }}>{color === c.hex && <Check size={18} color="white" />}</button>;
              })}
            </div>
          </div>
          <button type="button" onClick={handleSubmit} className="w-full bg-indigo-600 flex items-center justify-center gap-2 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-indigo-600/20 mt-2">
            <Play size={20} className="fill-current" /> 开始计时
          </button>
        </div>
      </div>
    </div>
  );
}