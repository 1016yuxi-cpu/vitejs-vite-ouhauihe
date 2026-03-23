import React, { useState, useMemo } from 'react';
import { CheckCircle, Circle, Play, Check } from 'lucide-react';
import { TASK_COLORS } from '../utils/constants';
import { timeToMins, formatMins, formatDuration, isOverlap } from '../utils/helpers';

export default function TimelineView({ plans, actuals, totalHeight, getOffsetY, activeTimer, onEditPlan, onEditActual, onToggleComplete, onStartTimer, onCreatePlanAtTime }) {
  const [activePlanClusters, setActivePlanClusters] = useState({});
  const [activeActualClusters, setActiveActualClusters] = useState({});
  
  // 【C-3 新增】记录当前选中的色块 ID
  const [selectedId, setSelectedId] = useState(null);

  const planActualSummary = useMemo(() => {
    const summary = {};
    actuals.forEach(a => {
      if (!a.fromPlanId || a.fromPlanId === 'none') return;
      const dur = timeToMins(a.actualEnd) - timeToMins(a.actualStart);
      if (!summary[a.fromPlanId]) {
        summary[a.fromPlanId] = { totalDur: 0, lastActualId: a.id };
      }
      summary[a.fromPlanId].totalDur += dur;
      summary[a.fromPlanId].lastActualId = a.id; 
    });
    return summary;
  }, [actuals]);

  const timedPlans = plans.filter(p => p.timeType !== 'none');
  const untimedPlans = plans.filter(p => p.timeType === 'none');

  if (plans.length === 0 && actuals.length === 0) {
    return <div className="mt-20 text-center text-gray-400">这一天还没有任何安排哦～</div>;
  }

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

  const calculateOverlaps = (items, isPlan) => {
    const result = {};
    const getDuration = (item) => {
      if (isPlan) {
        const start = timeToMins(item.startTime);
        const end = item.timeType === 'range' ? timeToMins(item.endTime) : start;
        return end - start;
      } else {
        return timeToMins(item.actualEnd) - timeToMins(item.actualStart);
      }
    };
    const getStart = (item) => timeToMins(isPlan ? item.startTime : item.actualStart);
    const getEnd = (item) => {
      if (isPlan) return item.timeType === 'range' ? timeToMins(item.endTime) : timeToMins(item.startTime);
      return timeToMins(item.actualEnd);
    };

    const clusters = [];
    const visited = new Set();
    const sortedItems = [...items].sort((a, b) => getStart(a) - getStart(b));

    sortedItems.forEach(item => {
      if (visited.has(item.id)) return;
      const cluster = [item];
      visited.add(item.id);
      sortedItems.forEach(other => {
        if (visited.has(other.id)) return;
        const overlapsWithCluster = cluster.some(c => {
          const cStart = getStart(c);
          const cEnd = getEnd(c);
          const oStart = getStart(other);
          const oEnd = getEnd(other);
          return isOverlap(cStart, cEnd, oStart, oEnd) || cStart === oStart;
        });
        if (overlapsWithCluster) {
          cluster.push(other);
          visited.add(other.id);
        }
      });
      clusters.push(cluster);
    });

    clusters.forEach(cluster => {
      if (cluster.length === 1) {
        result[cluster[0].id] = { isOverlapping: false, columnIndex: 0, clusterId: cluster[0].id };
      } else {
        const sorted = [...cluster].sort((a, b) => {
          const durDiff = getDuration(b) - getDuration(a);
          if (durDiff !== 0) return durDiff;
          return a.id < b.id ? -1 : 1;
        });
        const clusterId = sorted[0].id;
        sorted.forEach((item, idx) => {
          result[item.id] = { isOverlapping: true, columnIndex: idx, clusterId };
        });
      }
    });
    return result;
  };

  const planOverlaps = calculateOverlaps(timedPlans, true);
  const actualOverlaps = calculateOverlaps(actuals, false);

  const getFillPercent = (plan) => {
    const summary = planActualSummary[plan.id];
    if (plan.timeType === 'point') return summary ? 100 : 0;
    if (plan.timeType === 'range') {
      const plannedDur = timeToMins(plan.endTime) - timeToMins(plan.startTime);
      if (plannedDur <= 0) return 0;
      const totalActualDur = summary ? summary.totalDur : 0;
      return Math.min(100, Math.round((totalActualDur / plannedDur) * 100));
    }
    return 0;
  };

  // 【C-3 新增】辅助函数：判断某个 item 是否需要高亮
  const isHighlighted = (itemId, isPlan) => {
    if (!selectedId) return true; // 没有选中任何东西，全部正常显示
    if (itemId === selectedId) return true; // 就是被选中的

    if (isPlan) {
      // 检查是否有 actual 被选中且关联了这个 plan
      const selectedActual = actuals.find(a => a.id === selectedId);
      if (selectedActual && selectedActual.fromPlanId === itemId) return true;
    } else {
      // 检查是否有 plan 被选中且这个 actual 关联了它
      const item = actuals.find(a => a.id === itemId);
      if (item && item.fromPlanId === selectedId) return true;
      // 或者被选中的是同一个 plan 的另一条 actual
      const selectedActual = actuals.find(a => a.id === selectedId);
      if (selectedActual && item && selectedActual.fromPlanId && item.fromPlanId === selectedActual.fromPlanId) return true;
    }
    return false;
  };

  return (
    <div>
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
        // 【C-3 修改】给时间轴主容器加 onClick，点击空白区域重置高亮
        <div className="relative w-full" style={{ height: totalHeight + 40 }} onClick={() => setSelectedId(null)}>

          {/* ---- 左列虚线竖轴（计划轴） ---- */}
          {(() => {
            const sorted = [...timedPlans].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
            const lines = [];
            for (let i = 0; i < sorted.length - 1; i++) {
              const curr = sorted[i];
              const next = sorted[i + 1];
              const currEndMins = curr.timeType === 'range' ? timeToMins(curr.endTime) : timeToMins(curr.startTime);
              const nextStartMins = timeToMins(next.startTime);
              if (nextStartMins <= currEndMins) continue;

              const y1 = getOffsetY(currEndMins, getEndRole(curr));
              const y2 = getOffsetY(nextStartMins, getStartRole(next));
              const topY = y1;
              const h = y2 - y1;
              if (h < 4) continue;

              lines.push(
                // 👈 新增：加入 cursor-pointer, hover 背景色，和 onClick 事件
                <div key={`plan-axis-${i}`}
                  className="absolute cursor-pointer hover:bg-gray-200 transition-colors pointer-events-auto"
                  style={{
                    left: 'calc(50% - 29px)', // 稍微往左移一点点以居中 4px 的宽度
                    width: '4px',             // 加宽点击区域
                    top: topY,
                    height: h,
                    borderLeft: '2px dashed #E5E7EB', // 依然保持你想要的虚线
                    borderRadius: '2px',
                    opacity: selectedId ? 0.3 : 1,
                    transition: 'opacity 0.3s ease, background-color 0.2s ease',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 取上方任务的结束时间作为预填时间
                    const prefillTime = curr.timeType === 'range' ? curr.endTime : curr.startTime;
                    onCreatePlanAtTime(prefillTime);
                  }}
                />
              );
            }
            return lines;
          })()}

          {/* ---- 计划色块（浅色，左列） ---- */}
          {timedPlans.map(plan => {
            const startMins = timeToMins(plan.startTime);
            const endMins = plan.timeType === 'range' ? timeToMins(plan.endTime) : startMins;
            const top = getOffsetY(startMins, getStartRole(plan));
            const height = plan.timeType === 'point' ? 48 : Math.max(getOffsetY(endMins, getEndRole(plan)) - top, 64);
            const overlaps = planOverlaps[plan.id];
            const isActivePlan = !overlaps.isOverlapping || 
              (activePlanClusters[overlaps.clusterId] ? activePlanClusters[overlaps.clusterId] === plan.id : overlaps.columnIndex === 0);
            const fillPercent = getFillPercent(plan);

            return (
              // 【C-3 修改】给外层容器加高亮/暗化样式 (opacity 和 filter)
              <div key={`plan-${plan.id}`} className="absolute transition-all duration-300 pointer-events-none"
               style={{ 
                 top, height, left: 0, right: 0,
                 opacity: isHighlighted(plan.id, true) ? 1 : 0.25,
                 filter: isHighlighted(plan.id, true) ? 'none' : 'grayscale(100%)',
               }}>

                <div className="absolute cursor-pointer shadow-sm hover:brightness-95 transition-all pointer-events-auto overflow-hidden bg-white"
                  style={{
                   left: overlaps.isOverlapping ? (overlaps.columnIndex === 0 ? 'calc(50% - 28px)' : 'calc(50% - 52px)') : 'calc(50% - 52px)',
                   width: overlaps.isOverlapping ? '28px' : '48px',
                   top: 0, 
                   height: '100%', 
                   border: `2.5px solid ${plan.color}`,
                   borderRadius: plan.timeType === 'point' ? '24px' : '16px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // 1. 如果是重叠色块，且当前不是活跃态 -> 只做切换，不触发高亮
                    if (overlaps.isOverlapping && !isActivePlan) {
                      setActivePlanClusters(prev => ({ ...prev, [overlaps.clusterId]: plan.id }));
                      // 顺便清空可能存在的高亮，保持界面干净
                      setSelectedId(null); 
                    } 
                    // 2. 如果是非重叠色块，或者已经是活跃态的重叠色块 -> 触发/取消高亮
                    else {
                      setSelectedId(prev => prev === plan.id ? null : plan.id);
                    }
                  }}
                >
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${fillPercent}%`, backgroundColor: plan.color, opacity: 0.35, transition: 'height 0.3s ease', borderRadius: 'inherit' }} />
                  {plan.completed && isActivePlan && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                      <Check size={overlaps.isOverlapping ? 14 : 16} color={plan.color} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {isActivePlan && (
                  <div className="absolute flex flex-col justify-center items-end pr-2.5 py-2 min-w-0 cursor-pointer group hover:bg-black/[0.03] rounded-l-2xl transition-colors pointer-events-auto"
                    style={{ left: 0, width: 'calc(50% - 60px)', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => onEditPlan(plan)}>
                    <div className="flex items-center gap-1.5 justify-end w-full">
                      <span className="text-[11px] font-medium text-[#9CA3AF] leading-none">{plan.startTime}</span>
                      {plan.timeType === 'range' && <span className="text-[11px] font-medium text-[#9CA3AF] leading-none">- {plan.endTime}</span>}
                    </div>
                    <div className="font-bold text-[#1F2937] text-sm truncate w-full text-right mt-0.5 group-hover:text-indigo-600 transition-colors">{plan.name}</div>
                    <div className="flex justify-end gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onStartTimer(plan)} disabled={!!activeTimer} className={`p-1 rounded-md transition-colors ${activeTimer ? 'bg-gray-100 text-gray-300' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`}><Play size={13} className="fill-current" /></button>
                      <button onClick={() => onToggleComplete(plan.id)} className={`p-1 rounded-md transition-colors ${plan.completed ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{plan.completed ? <CheckCircle size={13} /> : <Check size={13} />}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ---- 右列虚线竖轴（实际轴） ---- */}
          {(() => {
            const sorted = [...actuals].sort((a, b) => timeToMins(a.actualStart) - timeToMins(b.actualStart));
            const lines = [];
            for (let i = 0; i < sorted.length - 1; i++) {
              const curr = sorted[i];
              const next = sorted[i + 1];
              const currEndMins = timeToMins(curr.actualEnd);
              const nextStartMins = timeToMins(next.actualStart);
              if (nextStartMins <= currEndMins) continue;

              const y1 = getOffsetY(currEndMins, 'arrive');
              const y2 = getOffsetY(nextStartMins, 'leave');
              const topY = y1;
              const h = y2 - y1;
              if (h < 4) continue;

              lines.push(
                <div key={`actual-axis-${i}`}
                  className="absolute"
                  style={{
                    left: 'calc(50% + 28px)',
                    top: topY,
                    height: h,
                    borderLeft: '2px dashed #E5E7EB',
                    // 【C-3 修改】竖线也参与暗化
                    opacity: selectedId ? 0.3 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              );
            }
            return lines;
          })()}

          {/* ---- 实际色块（深色，右列） ---- */}
          {actuals.map(act => {
            const startMins = timeToMins(act.actualStart);
            const endMins = timeToMins(act.actualEnd);
            const top = getOffsetY(startMins, getStartRole(act));
            const connectedPlan = act.fromPlanId ? plans.find(p => p.id === act.fromPlanId) : null;
            const isPointActual = connectedPlan?.timeType === 'point' && act.actualStart === act.actualEnd;
            const height = isPointActual ? 48 : Math.max(getOffsetY(endMins, getEndRole(act)) - top, 64);
            const overlaps = actualOverlaps[act.id];
            const isActiveActual = !overlaps.isOverlapping || 
              (activeActualClusters[overlaps.clusterId] ? activeActualClusters[overlaps.clusterId] === act.id : overlaps.columnIndex === 0);

            const hideStart = connectedPlan && connectedPlan.startTime === act.actualStart;
            const hideEnd = connectedPlan && connectedPlan.timeType === 'range' && connectedPlan.endTime === act.actualEnd;

            let diffText = "";
            if (connectedPlan && connectedPlan.timeType === 'range') {
              const plannedDur = timeToMins(connectedPlan.endTime) - timeToMins(connectedPlan.startTime);
              const summary = planActualSummary[connectedPlan.id];
              if (summary && act.id === summary.lastActualId) {
                const diffMins = summary.totalDur - plannedDur;
                if (diffMins !== 0) diffText = ` · ${diffMins > 0 ? '+' : ''}${diffMins}m`;
              }
            }

            return (
              // 【C-3 修改】给外层容器加高亮/暗化样式 (opacity 和 filter)
              <div key={`act-${act.id}`} className="absolute transition-all duration-300 pointer-events-none" 
               style={{ 
                 top, height, left: 0, right: 0,
                 opacity: isHighlighted(act.id, false) ? 1 : 0.25,
                 filter: isHighlighted(act.id, false) ? 'none' : 'grayscale(100%)',
               }}>

                <div className="absolute border-[1.5px] border-white shadow-sm cursor-pointer hover:brightness-105 transition-all z-10 pointer-events-auto"
                  style={{
                    left: overlaps.isOverlapping ? (overlaps.columnIndex === 0 ? 'calc(50% + 4px)' : 'calc(50% + 28px)') : 'calc(50% + 4px)',
                    width: overlaps.isOverlapping ? '28px' : '48px',
                    top: 0, height: '100%', backgroundColor: act.color,
                    borderRadius: isPointActual ? '24px' : '16px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // 1. 如果是重叠色块，且当前不是活跃态 -> 只做切换，不触发高亮
                    if (overlaps.isOverlapping && !isActiveActual) {
                      setActiveActualClusters(prev => ({ ...prev, [overlaps.clusterId]: act.id }));
                      setSelectedId(null);
                    } 
                    // 2. 如果是非重叠色块，或者已经是活跃态的重叠色块 -> 触发/取消高亮
                    else {
                      setSelectedId(prev => prev === act.id ? null : act.id);
                    }
                  }}
                />

                {isActiveActual && (
                  <div className="absolute flex flex-col justify-center items-start pl-2.5 py-2 min-w-0 cursor-pointer group hover:bg-black/[0.03] rounded-r-2xl transition-colors pointer-events-auto"
                    style={{ left: 'calc(50% + 60px)', width: 'calc(50% - 60px)', top: '50%', transform: 'translateY(-50%)' }}
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

      {totalHeight === 0 && untimedPlans.length > 0 && actuals.length === 0 && (
        <div className="mt-8 text-center text-gray-400 text-sm">还没有带时间的任务哦</div>
      )}
    </div>
  );
}