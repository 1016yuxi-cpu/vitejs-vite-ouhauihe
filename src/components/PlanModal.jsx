import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { COLOR_PRESETS, TASK_COLORS } from '../utils/constants';
import { timeToMins, isOverlap } from '../utils/helpers';
import WheelTimePicker from './WheelTimePicker';
import TimeTrigger from './TimeTrigger';

export default function PlanModal({ 
  isOpen, onClose, initialData, onSave, onDelete, 
  plans, currentDate, prefillStartTime, groups, onCreateGroup, onSaveRepeatRule, prefillGroupId 
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '📝');
  const [timeType, setTimeType] = useState(initialData?.timeType || 'range');
  const [startTime, setStartTime] = useState(initialData?.startTime || prefillStartTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || prefillStartTime || '10:00');
  
  const [groupId, setGroupId] = useState(initialData?.groupId || prefillGroupId || null);

  const prefillGroup = !initialData && prefillGroupId ? groups.find(g => g.id === prefillGroupId) : null;
  const initialColor = initialData?.color || prefillGroup?.color || COLOR_PRESETS[0].colors[0].hex;
  
  const foundPresetIndex = COLOR_PRESETS.findIndex(p => p.colors.some(c => c.hex === initialColor));
  const initialPresetIndex = foundPresetIndex !== -1 ? foundPresetIndex : COLOR_PRESETS.length;
  const [activePreset, setActivePreset] = useState(initialPresetIndex);
  const [color, setColor] = useState(initialColor);
  const [customHex, setCustomHex] = useState(initialColor);
  
  useEffect(() => { setCustomHex(color); }, [color]);
  const recentColors = Array.from(new Set((plans || []).map(p => p.color))).filter(Boolean).slice(0, 8);
  const [pickerTarget, setPickerTarget] = useState(null);
  
  const [conflictInfo, setConflictInfo] = useState(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatType, setRepeatType] = useState('weekdays');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatWeekdays, setRepeatWeekdays] = useState([1, 3, 5]); 
  const [sameTime, setSameTime] = useState(true);
  const [onlyThis, setOnlyThis] = useState(true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const dataToSave = { name, emoji, timeType, startTime: timeType === 'none' ? null : startTime, endTime: timeType === 'range' ? endTime : null, color, groupId };
    
    if (isRepeat && !initialData) {
      const ruleId = onSaveRepeatRule({
        name, emoji, color, groupId,
        timeType, startTime: dataToSave.startTime, endTime: dataToSave.endTime,
        repeatType,
        interval: repeatType === 'interval' ? repeatInterval : null,
        weekdays: repeatType === 'weekdays' ? repeatWeekdays : null,
        sameTime,
      });
      dataToSave.repeatGroupId = ruleId;
    }

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
    onSave(dataToSave, !onlyThis && initialData?.repeatGroupId);
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
                <button onClick={() => onSave(conflictInfo.pendingData, !onlyThis && initialData?.repeatGroupId)} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-2xl py-4 font-bold active:scale-[0.98]">仍然创建</button>
              </div>
            </div>
          ) : (
            <div className="max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{initialData ? '编辑计划' : '新建计划'}</h2>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
              </div>
              <div className="space-y-6 pb-4">
                <div className="flex gap-3">
                  <div className="w-14 h-14 shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl border border-gray-100">
                    <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full h-full text-center bg-transparent border-none outline-none" maxLength={2} />
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 px-4 flex items-center">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="准备做些什么？" className="w-full bg-transparent border-none outline-none font-bold text-lg text-gray-800" autoFocus />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 ml-1">所属分组</label>
                  <select value={groupId || 'none'} onChange={(e) => {
                      const val = e.target.value;
                      if (val === '_new') {
                        const newName = window.prompt('新分组名称：');
                        if (newName && newName.trim()) {
                          const newId = onCreateGroup({ name: newName.trim(), emoji: '📁', color });
                          setGroupId(newId);
                        }
                      } else {
                        setGroupId(val === 'none' ? null : val);
                        if (val !== 'none' && !initialData) {
                          const group = groups.find(g => g.id === val);
                          if (group) setColor(group.color);
                        }
                      }
                    }} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-medium text-gray-800 appearance-none">
                    <option value="none">不分组</option>
                    {groups && groups.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
                    <option value="_new">＋ 新建分组...</option>
                  </select>
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
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="block text-xs text-gray-400">专属色</label>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button key={preset.name} type="button" onClick={() => setActivePreset(idx)} className={`px-3 py-1 text-xs rounded-md transition-colors ${activePreset === idx ? 'bg-white shadow-sm text-gray-800 font-bold' : 'text-gray-500'}`}>{preset.name}</button>
                      ))}
                      <button type="button" onClick={() => setActivePreset(COLOR_PRESETS.length)} className={`px-3 py-1 text-xs rounded-md transition-colors ${activePreset === COLOR_PRESETS.length ? 'bg-white shadow-sm text-gray-800 font-bold' : 'text-gray-500'}`}>自定义</button>
                    </div>
                  </div>
                  {activePreset < COLOR_PRESETS.length ? (
                    <div className="flex flex-wrap gap-3">
                      {COLOR_PRESETS[activePreset].colors.map(c => (
                        <button type="button" key={c.hex} onClick={() => setColor(c.hex)} className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: c.hex }}>
                          {color === c.hex && <Check size={18} color="white" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl shadow-inner border border-gray-200 cursor-pointer" style={{ backgroundColor: color }} onClick={() => document.getElementById('plan-color-picker').click()} />
                          <input id="plan-color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                        </div>
                        <input type="text" value={customHex} onChange={(e) => setCustomHex(e.target.value)} onBlur={(e) => { const val = e.target.value; if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val); else setCustomHex(color); }} className="border border-gray-200 rounded-lg px-3 py-2 w-28 text-center text-sm focus:outline-none focus:border-blue-500 uppercase" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    {showAdvanced ? '▼ 收起高级设置' : '▶ 高级设置'}
                  </button>

                  {showAdvanced && !initialData && (
                    <div className="mt-3 space-y-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">重复任务</span>
                        <button type="button" onClick={() => setIsRepeat(!isRepeat)} className={`w-10 h-6 rounded-full transition-colors ${isRepeat ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mx-1 ${isRepeat ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {isRepeat && (
                        <>
                          <div className="flex bg-white p-0.5 rounded-lg border border-gray-100">
                            <button type="button" onClick={() => setRepeatType('weekdays')} className={`flex-1 py-1.5 text-xs rounded-md ${repeatType === 'weekdays' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500'}`}>选择星期</button>
                            <button type="button" onClick={() => setRepeatType('interval')} className={`flex-1 py-1.5 text-xs rounded-md ${repeatType === 'interval' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500'}`}>按间隔</button>
                          </div>

                          {repeatType === 'weekdays' && (
                            <div className="flex gap-2 justify-center">
                              {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                                <button key={idx} type="button" onClick={() => setRepeatWeekdays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                                  className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${repeatWeekdays.includes(idx) ? 'bg-indigo-500 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                                  {day}
                                </button>
                              ))}
                            </div>
                          )}

                          {repeatType === 'interval' && (
                            <div className="flex items-center gap-2 justify-center">
                              <span className="text-sm text-gray-500">每隔</span>
                              <input type="number" min={1} max={365} value={repeatInterval} onChange={e => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center bg-white border border-gray-200 rounded-lg py-1 text-sm font-bold" />
                              <span className="text-sm text-gray-500">天</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">在同一时间重复</span>
                            <button type="button" onClick={() => setSameTime(!sameTime)} className={`w-10 h-6 rounded-full transition-colors ${sameTime ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mx-1 ${sameTime ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {showAdvanced && initialData && (
                    <div className="mt-3 text-xs text-gray-400">（编辑模式下暂不可修改重复规则，请前往设置或删除重建）</div>
                  )}
                </div>

                {/* 👈 补丁修改：更新了文案 */}
                {initialData?.repeatGroupId && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <input type="checkbox" id="onlyThis" checked={onlyThis} onChange={e => setOnlyThis(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="onlyThis" className="text-xs text-gray-500 font-medium">仅修改/删除本条（不影响此习惯的未来任务）</label>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {/* 👈 补丁修改：更新了 onClick 事件 */}
                  {initialData && (
                    <button type="button" onClick={() => onDelete(!onlyThis)} className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl font-bold">
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button type="button" onClick={handleSubmit} className="flex-1 bg-[#1F2937] text-white rounded-2xl py-4 font-bold text-lg shadow-lg active:scale-[0.98]">
                    {initialData ? '保存修改' : '创建计划'}
                  </button>
                </div>
              
              </div>
            </div>
          )}
        </div>
      </div>
      <WheelTimePicker isOpen={!!pickerTarget} onClose={() => setPickerTarget(null)} initialValue={pickerTarget === 'start' ? startTime : endTime} onConfirm={(val) => { pickerTarget === 'start' ? setStartTime(val) : setEndTime(val); }} />
    </>
  );
}