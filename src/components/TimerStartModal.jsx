import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Timer, Play } from 'lucide-react';
import { COLOR_PRESETS } from '../utils/constants';

export default function TimerStartModal({ isOpen, onClose, onStart }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('⚡️');
  const initialColor = COLOR_PRESETS[0].colors[0].hex;
  const [activePreset, setActivePreset] = useState(0);
  const [color, setColor] = useState(initialColor);
  const [customHex, setCustomHex] = useState(initialColor);
  useEffect(() => { setCustomHex(color); }, [color]);
  const recentColors = useMemo(() => {
    try {
      const p = JSON.parse(localStorage.getItem('pvr_plans') || '[]');
      const a = JSON.parse(localStorage.getItem('pvr_actuals') || '[]');
      return Array.from(new Set([...p.map(x=>x.color), ...a.map(x=>x.color)])).filter(Boolean).slice(0, 8);
    } catch(e) { return []; }
  }, []);
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
            <div className="flex items-center justify-between mb-2 ml-1">
              <label className="block text-xs text-gray-400">选取专属色</label>
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
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className="w-12 h-12 rounded-xl shadow-inner border border-gray-200 cursor-pointer"
                      style={{ backgroundColor: color }}
                      onClick={() => document.getElementById('timer-color-picker').click()}
                    />
                    <input 
                      id="timer-color-picker"
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
                      else setCustomHex(color);
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-2 w-28 text-center text-sm focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
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
          <button type="button" onClick={handleSubmit} className="w-full bg-indigo-600 flex items-center justify-center gap-2 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-indigo-600/20 mt-2">
            <Play size={20} className="fill-current" /> 开始计时
          </button>
        </div>
      </div>
    </div>
  );
}