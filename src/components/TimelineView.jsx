import React, { useState } from 'react';
import { CheckCircle, Circle, Play, Check } from 'lucide-react';
import { TASK_COLORS } from '../utils/constants';
import { timeToMins, formatMins, formatDuration, isOverlap } from '../utils/helpers';

export default function TimelineView({ plans, actuals, totalHeight, getOffsetY, activeTimer, onEditPlan, onEditActual, onToggleComplete, onStartTimer }) {
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