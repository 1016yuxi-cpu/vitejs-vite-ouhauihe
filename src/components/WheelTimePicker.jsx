import React, { useState, useRef, useEffect } from 'react';

function ScrollColumn({ options, value, onChange, suffix }) {
  const scrollRef = useRef(null);
  const ITEM_HEIGHT = 48;
  useEffect(() => {
    if (scrollRef.current) {
      const index = options.indexOf(value);
      scrollRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, []);
  const handleScroll = (e) => {
    const index = Math.round(e.target.scrollTop / ITEM_HEIGHT);
    if (options[index] && options[index] !== value) onChange(options[index]);
  };
  return (
    <div ref={scrollRef} onScroll={handleScroll} className="w-1/3 h-full overflow-y-scroll snap-y snap-mandatory z-10 relative" style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
      <div style={{ height: `calc(50% - ${ITEM_HEIGHT / 2}px)` }}></div>
      {options.map((opt) => (
        <div key={opt} className={`h-12 flex items-center justify-center snap-center text-xl font-mono transition-all duration-200 ${value === opt ? 'text-indigo-600 font-bold scale-110' : 'text-gray-400'}`}>
          {opt} <span className="text-xs ml-1 font-sans font-normal opacity-50">{suffix}</span>
        </div>
      ))}
      <div style={{ height: `calc(50% - ${ITEM_HEIGHT / 2}px)` }}></div>
    </div>
  );
}

export default function WheelTimePicker({ isOpen, onClose, initialValue, onConfirm }) {
  const [hours, setHours] = useState(initialValue?.split(':')[0] || '09');
  const [mins, setMins] = useState(initialValue?.split(':')[1] || '00');
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex justify-center items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <button onClick={onClose} className="text-gray-400 px-2 py-1">取消</button>
          <h3 className="font-bold text-lg">选择时间</h3>
          <button onClick={() => { onConfirm(`${hours}:${mins}`); onClose(); }} className="text-indigo-600 font-bold px-2 py-1">确认</button>
        </div>
        <div className="flex justify-center h-48 relative overflow-hidden bg-gray-50 rounded-2xl">
          <div className="absolute top-1/2 left-4 right-4 h-12 -translate-y-1/2 bg-white rounded-xl shadow-sm border border-gray-100 pointer-events-none z-0"></div>
          <ScrollColumn options={hourOptions} value={hours} onChange={setHours} suffix="时" />
          <ScrollColumn options={minOptions} value={mins} onChange={setMins} suffix="分" />
        </div>
      </div>
    </div>
  );
}