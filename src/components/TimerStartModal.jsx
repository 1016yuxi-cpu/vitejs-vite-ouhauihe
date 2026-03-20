import React, { useState } from 'react';
import { X, Check, Timer, Play } from 'lucide-react';
import { TASK_COLORS } from '../utils/constants';

export default function TimerStartModal({ isOpen, onClose, usedColors, onStart }) {
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