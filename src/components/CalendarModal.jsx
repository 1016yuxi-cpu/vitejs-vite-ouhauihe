import React from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { addDays, formatDate, getDisplayDate } from '../utils/helpers';

export default function CalendarModal({ currentDate, onClose, onSelect }) {
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