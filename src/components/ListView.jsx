import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle, Circle, Clock, Calendar, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { timeToMins, formatDate, getDisplayDate, addDays } from '../utils/helpers';

export default function ListView({ 
  plans, actuals, groups, currentDate, 
  onEditPlan, onEditGroup, onCreateGroup, onToggleComplete,
  onCreatePlanInGroup 
}) {
  const [viewMode, setViewMode] = useState('time'); // 'time' | 'group'
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const toggleCollapse = (groupId) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // 按时间聚合：最近 7 天有任务的日期
  const plansByDate = useMemo(() => {
    const dateMap = {};
    for (let i = 0; i < 7; i++) {
      const d = addDays(currentDate, -i);
      const dayPlans = plans.filter(p => p.date === d);
      if (dayPlans.length > 0) {
        dateMap[d] = dayPlans.sort((a, b) => {
          if (a.timeType === 'none' && b.timeType !== 'none') return 1;
          if (a.timeType !== 'none' && b.timeType === 'none') return -1;
          return timeToMins(a.startTime || '00:00') - timeToMins(b.startTime || '00:00');
        });
      }
    }
    for (let i = 1; i <= 7; i++) {
      const d = addDays(currentDate, i);
      const dayPlans = plans.filter(p => p.date === d);
      if (dayPlans.length > 0) {
        dateMap[d] = dayPlans.sort((a, b) => {
          if (a.timeType === 'none' && b.timeType !== 'none') return 1;
          if (a.timeType !== 'none' && b.timeType === 'none') return -1;
          return timeToMins(a.startTime || '00:00') - timeToMins(b.startTime || '00:00');
        });
      }
    }
    return dateMap;
  }, [plans, currentDate]);

  // 按分组聚合
  const plansByGroup = useMemo(() => {
    // 1. 过滤与去重：普通任务全保留，重复任务每个规则只保留“最近的一个未完成任务”
    const normalPlans = plans.filter(p => !p.repeatGroupId);
    
    const repeatPlansMap = {};
    plans.filter(p => p.repeatGroupId).forEach(p => {
      if (!repeatPlansMap[p.repeatGroupId]) repeatPlansMap[p.repeatGroupId] = [];
      repeatPlansMap[p.repeatGroupId].push(p);
    });

    const uniqueRepeatPlans = Object.values(repeatPlansMap).map(groupPlans => {
      // 按日期和时间排序（确保找到的是最早的）
      groupPlans.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return timeToMins(a.startTime || '00:00') - timeToMins(b.startTime || '00:00');
      });
      // 找第一个未完成的；如果全都奇迹般地完成了，就退而求其次显示最后一个
      return groupPlans.find(p => !p.completed) || groupPlans[groupPlans.length - 1];
    });

    const groupViewPlans = [...normalPlans, ...uniqueRepeatPlans];

    // 2. 按 groupId 归类
    const result = {};
    groups.forEach(g => {
      result[g.id] = groupViewPlans.filter(p => p.groupId === g.id);
    });
    // 未分组
    result['_ungrouped'] = groupViewPlans.filter(p => !p.groupId);
    return result;
  }, [plans, groups]);

  const getGroup = (groupId) => groups.find(g => g.id === groupId);

  const TaskRow = ({ plan }) => {
    const group = getGroup(plan.groupId);
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onEditPlan(plan)}>
        <button onClick={(e) => { e.stopPropagation(); onToggleComplete(plan.id); }}
          className={`p-0.5 ${plan.completed ? 'text-green-500' : 'text-gray-300'}`}>
          {plan.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
        </button>
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate ${plan.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {plan.emoji} {plan.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {plan.timeType === 'range' && <span className="text-xs text-gray-400">{plan.startTime} - {plan.endTime}</span>}
            {plan.timeType === 'point' && <span className="text-xs text-gray-400">{plan.startTime}</span>}
            {plan.timeType === 'none' && <span className="text-xs text-gray-300">未安排时间</span>}
            {group && viewMode === 'time' && (
              <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: group.color + '20', color: group.color }}>
                {group.emoji} {group.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-10 pt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-gray-100 p-0.5 rounded-lg">
          <button onClick={() => setViewMode('time')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'time' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
            <Calendar size={12} className="inline mr-1" />按时间
          </button>
          <button onClick={() => setViewMode('group')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'group' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
            按分组
          </button>
        </div>
        <button onClick={onCreateGroup} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {viewMode === 'time' && (
        <div className="space-y-6">
          {Object.keys(plansByDate).length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">最近没有任何计划</div>
          ) : (
            Object.entries(plansByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayPlans]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold ${date === currentDate ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {getDisplayDate(date)}
                  </span>
                  {date === formatDate(new Date()) && <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-md">今天</span>}
                </div>
                <div className="space-y-2">
                  {dayPlans.map(plan => <TaskRow key={plan.id} plan={plan} />)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 新的按分组视图 */}
      {viewMode === 'group' && (
        <div className="space-y-4">
          {groups.map(group => {
            const groupPlans = plansByGroup[group.id] || [];
            const isCollapsed = collapsedGroups.has(group.id);

            return (
              <div key={group.id}>
                {/* 分组标题栏 */}
                <div className="flex items-center gap-2 py-2">
                  {/* 左侧：点击展开/收起 */}
                  <div 
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => toggleCollapse(group.id)}
                  >
                    {isCollapsed 
                      ? <ChevronRight size={14} className="text-gray-400 shrink-0" /> 
                      : <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    }
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: group.color + '20' }}>
                      {group.emoji}
                    </div>
                    <span className="text-sm font-bold truncate" style={{ color: group.color }}>{group.name}</span>
                    <span className="text-xs text-gray-300 shrink-0">{groupPlans.length}</span>
                  </div>

                  {/* 右侧按钮组 */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => onCreatePlanInGroup(group.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button 
                      onClick={() => onEditGroup(group)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* 任务列表（可折叠） */}
                {!isCollapsed && (
                  groupPlans.length > 0 ? (
                    <div className="space-y-2 ml-6">
                      {groupPlans.map(plan => <TaskRow key={plan.id} plan={plan} />)}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 py-2 ml-6">暂无任务</div>
                  )
                )}
              </div>
            );
          })}

          {/* 未分组 */}
          {(() => {
            const ungrouped = plansByGroup['_ungrouped'] || [];
            if (ungrouped.length === 0 && groups.length > 0) return null; // 只有没分组任务时才显示未分组栏
            const isCollapsed = collapsedGroups.has('_ungrouped');
            return (
              <div>
                <div className="flex items-center gap-2 py-2">
                  <div 
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => toggleCollapse('_ungrouped')}
                  >
                    {isCollapsed 
                      ? <ChevronRight size={14} className="text-gray-400 shrink-0" /> 
                      : <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    }
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm bg-gray-100 shrink-0">
                      📋
                    </div>
                    <span className="text-sm font-bold text-gray-400 truncate">未分组</span>
                    <span className="text-xs text-gray-300 shrink-0">{ungrouped.length}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => onCreatePlanInGroup(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  ungrouped.length > 0 ? (
                    <div className="space-y-2 ml-6">
                      {ungrouped.map(plan => <TaskRow key={plan.id} plan={plan} />)}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 py-2 ml-6">暂无任务</div>
                  )
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="text-center text-xs text-gray-300 mt-8">重复任务自动显示未来 3 个</div>
    </div>
  );
}