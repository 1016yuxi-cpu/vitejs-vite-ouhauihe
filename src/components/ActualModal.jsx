import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { TASK_COLORS } from '../utils/constants';
import { timeToMins, minsToTime, isOverlap } from '../utils/helpers';
import WheelTimePicker from './WheelTimePicker';
import TimeTrigger from './TimeTrigger';

export default function ActualModal({ isOpen, onClose, initialData, plans, actuals, currentDate, onSave, onDelete, usedColors }) {
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