import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { COLOR_PRESETS, TASK_COLORS } from '../utils/constants';
import { timeToMins, isOverlap } from '../utils/helpers';
import WheelTimePicker from './WheelTimePicker';
import TimeTrigger from './TimeTrigger';

export default function PlanModal({ isOpen, onClose, initialData, onSave, onDelete, plans, currentDate }) {
  const [name, setName] = useState(initialData?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '📝');
  const [timeType, setTimeType] = useState(initialData?.timeType || 'range');
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');
  const initialColor = initialData?.color || COLOR_PRESETS[0].colors[0].hex;
  const foundPresetIndex = COLOR_PRESETS.findIndex(p => p.colors.some(c => c.hex === initialColor));
  const initialPresetIndex = foundPresetIndex !== -1 ? foundPresetIndex : COLOR_PRESETS.length;
  const [activePreset, setActivePreset] = useState(initialPresetIndex);
  const [color, setColor] = useState(initialColor);
  const [customHex, setCustomHex] = useState(initialColor);
  useEffect(() => { setCustomHex(color); }, [color]);
  const recentColors = Array.from(new Set((plans || []).map(p => p.color))).filter(Boolean).slice(0, 8);
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
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="block text-xs text-gray-400">专属色</label>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setActivePreset(idx)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${activePreset === idx ? 'bg-white shadow-sm text-gray-800 font-bold' : 'text-gray-500'}`}
                        >
                          {preset.name}
                        </button>
                      ))}
                      {/* 新增自定义 Tab */}
                      <button
                        type="button"
                        onClick={() => setActivePreset(COLOR_PRESETS.length)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${activePreset === COLOR_PRESETS.length ? 'bg-white shadow-sm text-gray-800 font-bold' : 'text-gray-500'}`}
                      >
                        自定义
                      </button>
                    </div>
                  </div>
                  
                  {activePreset < COLOR_PRESETS.length ? (
                    <div className="flex flex-wrap gap-3">
                      {COLOR_PRESETS[activePreset].colors.map(c => (
                        <button 
                          type="button" 
                          key={c.hex} 
                          onClick={() => setColor(c.hex)} 
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" 
                          style={{ backgroundColor: c.hex }}
                        >
                          {color === c.hex && <Check size={18} color="white" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* 新增自定义色板 UI */
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div 
                            className="w-12 h-12 rounded-xl shadow-inner border border-gray-200 cursor-pointer"
                            style={{ backgroundColor: color }}
                            onClick={() => document.getElementById('plan-color-picker').click()}
                          />
                          <input 
                            id="plan-color-picker"
                            type="color" 
                            value={color} 
                            onChange={(e) => setColor(e.target.value)}
                            className="absolute opacity-0 w-0 h-0"
                          />
                        </div>
                        <input 
                          type="text" 
                          value={customHex}
                          onChange={(e) => setCustomHex(e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val);
                            else setCustomHex(color); // 格式错误则还原
                          }}
                          className="border border-gray-200 rounded-lg px-3 py-2 w-28 text-center text-sm focus:outline-none focus:border-blue-500 uppercase"
                        />
                      </div>
                      
                      {/* 最近使用颜色 */}
                      {recentColors.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-400 mb-2">最近使用</div>
                          <div className="flex flex-wrap gap-2">
                            {recentColors.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                                style={{ backgroundColor: c }}
                              >
                                {color === c && <Check size={14} color="white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  {initialData && (
                    <button type="button" onClick={onDelete} className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl font-bold">
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button type="button" onClick={handleSubmit} className="flex-1 bg-[#1F2937] text-white rounded-2xl py-4 font-bold text-lg shadow-lg active:scale-[0.98]">
                    {initialData ? '保存修改' : '创建计划'}
                  </button>
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