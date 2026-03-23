import React, { useState } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { COLOR_PRESETS } from '../utils/constants';

export default function GroupModal({ isOpen, onClose, initialData, onSave, onDelete }) {
  const [name, setName] = useState(initialData?.name || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '📁');
  const initialColor = initialData?.color || COLOR_PRESETS[0].colors[0].hex;
  const foundPresetIndex = COLOR_PRESETS.findIndex(p => p.colors.some(c => c.hex === initialColor));
  const [activePreset, setActivePreset] = useState(foundPresetIndex !== -1 ? foundPresetIndex : 0);
  const [color, setColor] = useState(initialColor);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name, emoji, color });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{initialData ? '编辑分组' : '新建分组'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
        </div>
        <div className="space-y-6">
          {/* Emoji + 名称 */}
          <div className="flex gap-3">
            <div className="w-14 h-14 shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl border border-gray-100">
              <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-full h-full text-center bg-transparent border-none outline-none" maxLength={2} />
            </div>
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 px-4 flex items-center">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="分组名称" className="w-full bg-transparent border-none outline-none font-bold text-lg text-gray-800" autoFocus />
            </div>
          </div>

          {/* 默认颜色 */}
          <div>
            <div className="flex items-center justify-between mb-2 ml-1">
              <label className="block text-xs text-gray-400">默认颜色</label>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {COLOR_PRESETS.map((preset, idx) => (
                  <button key={preset.name} type="button" onClick={() => setActivePreset(idx)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${activePreset === idx ? 'bg-white shadow-sm text-gray-800 font-bold' : 'text-gray-500'}`}>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS[activePreset].colors.map(c => (
                <button type="button" key={c.hex} onClick={() => setColor(c.hex)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c.hex }}>
                  {color === c.hex && <Check size={18} color="white" />}
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            {initialData && (
              <button type="button" onClick={onDelete} className="px-5 py-4 bg-red-50 text-red-500 rounded-2xl font-bold">
                <Trash2 size={20} />
              </button>
            )}
            <button type="button" onClick={handleSubmit}
              className="flex-1 bg-[#1F2937] text-white rounded-2xl py-4 font-bold text-lg shadow-lg active:scale-[0.98]">
              {initialData ? '保存修改' : '创建分组'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}